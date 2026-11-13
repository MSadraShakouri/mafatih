import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitCommit, gitFile } from './git-corpus.js';

const PROTOCOL = 'six-agent-parallel-ring-v2';
type Registration = {format_version:1;protocol:typeof PROTOCOL;agent:string;branch:string;base:string};

export function checkedAgent(value:string|undefined):string {
  if(!value||!/^agent-[1-6]$/.test(value))throw new Error('Use agent-1 through agent-6');
  return value;
}
export function neighbors(a:string,b:string):boolean {
  checkedAgent(a);checkedAgent(b);
  const distance=Math.abs(Number(a.slice(-1))-Number(b.slice(-1)));
  return distance===1||distance===5;
}
export function currentAgentBranch(agent:string):string {
  checkedAgent(agent);
  const result=spawnSync('git',['branch','--show-current'],{encoding:'utf8'});
  if(result.status!==0)throw new Error('Could not determine the checked-out branch');
  const branch=result.stdout.trim();
  const arena=/^arena\/[A-Za-z0-9][A-Za-z0-9._-]*-mafatih$/.test(branch);
  const conventional=branch===`split-${agent}`;
  if(!branch||(!arena&&!conventional)||spawnSync('git',['check-ref-format','--branch',branch]).status!==0) {
    throw new Error(`Use your own platform-assigned arena/<id>-mafatih branch or your own split-${agent} branch; refusing on ${branch||'detached HEAD'}`);
  }
  return branch;
}
function pathFor(root:string,agent:string):string {return path.join(root,'agent-work',checkedAgent(agent),'registration.json');}
function parseRegistration(value:unknown):Registration {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid branch registration');
  const r=value as Record<string,unknown>;
  if(Object.keys(r).sort().join(',')!=='agent,base,branch,format_version,protocol'||r.format_version!==1||r.protocol!==PROTOCOL||
     typeof r.agent!=='string'||!/^agent-[1-6]$/.test(r.agent)||typeof r.branch!=='string'||typeof r.base!=='string'||!/^[a-f0-9]{40}$/.test(r.base)) {
    throw new Error('Invalid branch registration');
  }
  return r as Registration;
}
function safeOwnDirectory(root:string,agent:string,create=true):string {
  let directory=root;
  for(const component of ['agent-work',checkedAgent(agent)]){
    directory=path.join(directory,component);
    try {
      const stat=fs.lstatSync(directory);
      if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error(`Unsafe agent directory: ${directory}`);
    } catch(error) {
      if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
      if(!create)throw new Error(`Register ${agent} on your own branch with the frozen base before configuring or writing`);
      fs.mkdirSync(directory,{mode:0o700});
    }
  }
  return directory;
}
function readFileSafe(file:string):string {
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()||!stat.isFile())throw new Error(`Unsafe registration file: ${file}`);
  return fs.readFileSync(file,'utf8');
}
function ensureBaseAncestor(base:string,ref:string):void {
  gitCommit(base);
  const check=spawnSync('git',['merge-base','--is-ancestor',base,ref]);
  if(check.status!==0)throw new Error(`Cannot establish that frozen base ${base} is an ancestor of ${ref}; preserve work and check for shallow or unrelated histories`);
}
function verifyLaunch(base:string):void {
  const shallow=spawnSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'});
  if(shallow.status!==0||shallow.stdout.trim()!=='false')throw new Error('Full Git history is required to identify the launch base; unshallow or preserve work and report');
  const name='docs/split-assignments/launch.json',body=gitFile(base,name);
  const launch=JSON.parse(body) as {protocol?:unknown;preparation_revision?:unknown};
  if(launch.protocol!==PROTOCOL||launch.preparation_revision!==2)throw new Error('Frozen base is not the updated Arena-compatible launch marker');
  const parents=spawnSync('git',['rev-list','--parents','-n','1',base],{encoding:'utf8'});
  if(parents.status!==0)throw new Error('Could not inspect the frozen launch commit');
  const parent=parents.stdout.trim().split(' ')[1];
  if(parent){
    gitCommit(parent); // do not mistake a missing parent object for an absent marker
    const before=spawnSync('git',['show',`${parent}:${name}`],{encoding:'utf8',maxBuffer:1024*1024});
    if(before.status===0&&before.stdout===body)throw new Error('Frozen base must be the commit that added or modified the launch marker, not a later unrelated commit');
  }
}
function verifyLegacyBase(root:string,agent:string,base:string):void {
  const previous=path.join(root,'agent-work',agent,'base.txt');
  if(fs.existsSync(previous)&&readFileSafe(previous).trim()!==base)throw new Error('Existing frozen base differs from this preparation; preserve the old base and work and report it');
}

/**
 * Bind an agent number and immutable base to the current platform branch.
 * This is a safety check, not proof of ownership: the platform controls push
 * authorization, and the user must identify the session's own branch.
 */
export function registerAgent(root:string,agentValue:string|undefined,baseValue:string|undefined) {
  const agent=checkedAgent(agentValue),base=gitCommit(baseValue??''),branch=currentAgentBranch(agent);
  ensureBaseAncestor(base,'HEAD');verifyLaunch(base);
  const directory=safeOwnDirectory(root,agent),file=pathFor(root,agent);
  verifyLegacyBase(root,agent,base);
  const wanted:Registration={format_version:1,protocol:PROTOCOL,agent,branch,base};
  for(let i=1;i<=6;i++){
    if(`agent-${i}`===agent)continue;
    const other=pathFor(root,`agent-${i}`);
    if(!fs.existsSync(other))continue;
    const registration=parseRegistration(JSON.parse(readFileSafe(other)) as unknown);
    if(registration.branch===branch&&registration.agent!==agent)throw new Error(`This branch is already registered to ${registration.agent}; preserve it and report`);
  }
  if(fs.existsSync(file)){
    const existing=parseRegistration(JSON.parse(readFileSafe(file)) as unknown);
    if(JSON.stringify(existing)!==JSON.stringify(wanted))throw new Error('Existing agent registration differs; preserve it and report rather than changing the branch or base');
    return {status:'already-registered',...wanted};
  }
  const legacy=path.join(directory,'base.txt');
  for(const name of ['plans','layouts','reviews']){
    const existing=path.join(directory,name);
    if(fs.existsSync(existing)&&fs.readdirSync(existing).length&&!fs.existsSync(legacy)) {
      throw new Error(`Existing ${name} lack a verifiable frozen base; preserve them and report before registration`);
    }
  }
  fs.writeFileSync(file,JSON.stringify(wanted,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
  return {status:'registered',...wanted};
}

/** Require a previously established binding before agent-specific writes. */
export function requireAgentBranch(root:string,agentValue:string|undefined,expectedBase?:string):Registration {
  const agent=checkedAgent(agentValue),branch=currentAgentBranch(agent),file=pathFor(root,agent);
  safeOwnDirectory(root,agent,false);
  if(!fs.existsSync(file))throw new Error(`Register ${agent} on your own branch with the frozen base before configuring or writing`);
  const registration=parseRegistration(JSON.parse(readFileSafe(file)) as unknown);
  if(registration.agent!==agent||registration.branch!==branch)throw new Error(`Registration does not belong to ${agent} on the current branch; preserve and report`);
  if(expectedBase!==undefined&&registration.base!==expectedBase)throw new Error('Requested base differs from the registered frozen base; preserve and report');
  verifyLegacyBase(root,agent,registration.base);verifyLaunch(registration.base);
  ensureBaseAncestor(registration.base,'HEAD');
  return registration;
}

/**
 * Find a neighbor by their committed self-registration on the exact remote ref,
 * not by a guessed branch name. We fetch objects, never push or update a peer
 * branch. A second live claimant is an error, not a choice made by the tool.
 */
export function discoverAgentPeer(root:string,agentValue:string|undefined,peerValue:string|undefined) {
  const self=requireAgentBranch(root,agentValue),peer=checkedAgent(peerValue);
  if(!neighbors(self.agent,peer))throw new Error('Discover only your two ring neighbors');
  const listed=spawnSync('git',['ls-remote','--heads','origin','refs/heads/arena/*','refs/heads/split-agent-*'],
    {encoding:'utf8',maxBuffer:32*1024*1024});
  if(listed.status!==0)throw new Error(`Cannot list origin branches (git exit ${listed.status??'unknown'}); preserve work and report branch read access`);
  const candidates:Array<{branch:string;ref:string;tip:string}>=[];
  for(const line of listed.stdout.split('\n').filter(Boolean)){
    const match=/^([a-f0-9]{40})\trefs\/heads\/(.+)$/.exec(line);
    if(!match)throw new Error('Unexpected remote branch listing');
    const tip=match[1]!,branch=match[2]!;
    if(branch===self.branch)continue;
    if(!/^arena\/[A-Za-z0-9][A-Za-z0-9._-]*-mafatih$/.test(branch)&&branch!==`split-${peer}`)continue;
    candidates.push({branch,ref:`refs/heads/${branch}`,tip});
  }
  // Fetch advertised branch objects in one operation. Do not alter any local
  // branch, tracking ref, index, worktree or FETCH_HEAD.
  if(candidates.length){
    const fetch=spawnSync('git',['fetch','--no-tags','--no-write-fetch-head','origin',...candidates.map(c=>c.ref)],
      {encoding:'utf8',maxBuffer:32*1024*1024});
    if(fetch.status!==0)throw new Error(`Cannot fetch candidate peer branches (git exit ${fetch.status??'unknown'}); preserve work and report branch read access`);
  }
  const matches:Array<{branch:string;tip:string}>=[];
  for(const candidate of candidates){
    if(spawnSync('git',['cat-file','-e',`${candidate.tip}^{commit}`]).status!==0)throw new Error(`Remote branch ${candidate.branch} moved during discovery; retry without discarding work`);
    const show=spawnSync('git',['show',`${candidate.tip}:agent-work/${peer}/registration.json`],{encoding:'utf8',maxBuffer:1024*1024});
    if(show.status!==0)continue;
    let raw:unknown;
    try{raw=JSON.parse(show.stdout) as unknown;}catch{throw new Error(`Invalid registration on ${candidate.branch}; preserve and report`);}
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error(`Invalid registration on ${candidate.branch}; preserve and report`);
    const claim=raw as Record<string,unknown>;
    // An inherited registration is expected after merging a peer and does not
    // claim that the current ref belongs to that peer.
    if(claim.branch!==candidate.branch)continue;
    const registration=parseRegistration(raw);
    if(registration.agent!==peer)throw new Error(`Inconsistent agent registration on ${candidate.branch}`);
    if(registration.base!==self.base)continue; // a different frozen round
    ensureBaseAncestor(self.base,candidate.tip);
    matches.push({branch:candidate.branch,tip:candidate.tip});
  }
  if(matches.length>1)throw new Error(`Ambiguous peer ${peer}: multiple branches claim this round (${matches.map(x=>x.branch).join(', ')}); preserve work and ask the coordinator`);
  if(!matches.length)return {status:'awaiting-peer',agent:self.agent,peer,base:self.base,note:'Continue your own assignment; retry when the neighbor has pushed its registration.'};
  return {status:'peer-found',agent:self.agent,peer,base:self.base,...matches[0],
    note:'The peer self-registration is not proof of platform ownership. Read messages at this exact fetched tip and verify snapshot reachability; never push the peer branch.'};
}
