import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const project = process.cwd();
const cli = path.join(project, 'scripts/six-agent.ts');
const tsx = path.join(project, 'node_modules/tsx/dist/loader.mjs');
function execute(cwd: string, command: string, args: string[], env: Record<string, string> = {}) {
  return spawnSync(command, args, {cwd, encoding:'utf8', maxBuffer:64*1024*1024, env:{...process.env,...env}});
}
function run(cwd: string, command: string, args: string[], env: Record<string, string> = {}): string {
  const result=execute(cwd,command,args,env);
  assert.equal(result.status,0,`${command} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
function git(cwd:string,...args:string[]):string{return run(cwd,'git',args);}
function agent(cwd:string,...args:string[]):string{return run(cwd,process.execPath,['--import',tsx,cli,...args]);}
function put(cwd:string,file:string,value:unknown):void{
  const target=path.join(cwd,file);fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
}

test('shallow session history cannot silently pin a later unrelated commit as the launch base', {timeout:60_000}, t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-shallow-session-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const remote=path.join(root,'remote.git'),source=path.join(root,'source'),session=path.join(root,'session');
  git(root,'init','--bare','-q',remote);fs.mkdirSync(source);git(source,'init','-q');
  git(source,'config','user.name','Synthetic Test');git(source,'config','user.email','test@example.test');
  put(source,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v1'});
  git(source,'add','.');git(source,'commit','-qm','old launch');
  put(source,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v2',preparation_revision:2});
  git(source,'add','.');git(source,'commit','-qm','updated launch');const base=git(source,'rev-parse','HEAD');
  put(source,'later.txt','unrelated change\n');git(source,'add','.');git(source,'commit','-qm','later change');
  const tip=git(source,'rev-parse','HEAD');git(source,'branch','-M','main');git(source,'remote','add','origin',remote);git(source,'push','-q','origin','main');
  git(root,'--git-dir',remote,'symbolic-ref','HEAD','refs/heads/main');
  git(root,'clone','-q','--depth=1',pathToFileURL(remote).href,session);
  assert.equal(git(session,'rev-parse','--is-shallow-repository'),'true');
  git(session,'switch','-q','-c','arena/shallow-session-mafatih');
  assert.equal(git(session,'log','-1','--first-parent','--diff-filter=AM','--format=%H','HEAD','--','docs/split-assignments/launch.json'),tip,
    'without history the unchanged marker appears to have been added at the shallow tip');
  const refused=execute(session,process.execPath,['--import',tsx,cli,'register','--agent','agent-4','--base',tip]);
  assert.notEqual(refused.status,0);assert.match(refused.stderr,/shallow|full Git history/i);
  git(session,'fetch','-q','--no-tags','--refmap=','origin','refs/heads/main');
  git(session,'fetch','-q','--no-tags','--unshallow','--refmap=','origin','refs/heads/main');
  assert.equal(git(session,'rev-parse','--is-shallow-repository'),'false');
  assert.equal(git(session,'log','-1','--first-parent','--diff-filter=AM','--format=%H','FETCH_HEAD','--','docs/split-assignments/launch.json'),base);
  const wrongBase=execute(session,process.execPath,['--import',tsx,cli,'register','--agent','agent-4','--base',tip]);
  assert.notEqual(wrongBase.status,0);assert.match(wrongBase.stderr,/launch marker|unrelated commit/i);
  agent(session,'register','--agent','agent-4','--base',base);
});

test('clean unrelated session history can merge the exact preparation delta without losing either parent', {timeout:60_000}, t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-unrelated-history-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  git(dir,'init','-q');git(dir,'config','user.name','Synthetic Test');git(dir,'config','user.email','test@example.test');
  put(dir,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v1'});
  put(dir,'existing.txt','preserve this existing work\n');git(dir,'add','.');git(dir,'commit','-qm','old preparation');
  const old=git(dir,'rev-parse','HEAD'),oldTree=git(dir,'rev-parse',`${old}^{tree}`);
  put(dir,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v2',preparation_revision:2});
  put(dir,'new-tool.txt','updated preparation\n');git(dir,'add','.');git(dir,'commit','-qm','updated preparation');
  const base=git(dir,'rev-parse','HEAD'),baseTree=git(dir,'rev-parse',`${base}^{tree}`);
  const unrelated=git(dir,'commit-tree',oldTree,'-m','unrelated Arena session root');
  git(dir,'switch','-q','-c','arena/unrelated-session-mafatih',unrelated);
  assert.equal(execute(dir,'git',['merge-base','HEAD',base]).status,1);
  const shortcut=`set -euo pipefail
BASE=${base}
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD^{tree})" = "$(git rev-parse "$BASE^"^{tree})"
git merge --allow-unrelated-histories --no-ff --no-commit -s ours "$BASE"
git diff --no-ext-diff --binary "$BASE^" "$BASE" | git apply --index
test "$(git write-tree)" = "$(git rev-parse "$BASE"^{tree})"
git commit -qm 'merge preparation with both histories'
`;
  fs.appendFileSync(path.join(dir,'existing.txt'),'uncommitted work\n');
  const dirty=execute(dir,'bash',['-c',shortcut]);assert.notEqual(dirty.status,0);
  assert.equal(fs.readFileSync(path.join(dir,'existing.txt'),'utf8'),'preserve this existing work\nuncommitted work\n');
  assert.notEqual(execute(dir,'git',['rev-parse','-q','--verify','MERGE_HEAD']).status,0,'must not start a merge over dirty work');
  fs.writeFileSync(path.join(dir,'existing.txt'),'preserve this existing work\n');
  run(dir,'bash',['-c',shortcut]);
  assert.equal(git(dir,'rev-parse','HEAD^1'),unrelated);assert.equal(git(dir,'rev-parse','HEAD^2'),base);
  assert.equal(git(dir,'rev-parse','HEAD^{tree}'),baseTree);
  assert.equal(fs.readFileSync(path.join(dir,'existing.txt'),'utf8'),'preserve this existing work\n');
  agent(dir,'register','--agent','agent-4','--base',base);
});

test('Arena-owned branches register and discover their actual neighbors without pushing another ref', {timeout:120_000}, t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-arena-branch-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  // These are tiny synthetic Git repositories, not copies or worktrees of the project.
  const remote=path.join(dir,'remote.git'),work=path.join(dir,'work');fs.mkdirSync(work);
  git(dir,'init','--bare','-q',remote);git(work,'init','-q');
  git(work,'config','user.name','Synthetic Test');git(work,'config','user.email','test@example.test');
  git(work,'remote','add','origin',remote);
  put(work,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v1'});
  put(work,'coordination/agent-3-agent-4.jsonl','');put(work,'coordination/agent-4-agent-5.jsonl','');
  git(work,'add','.');git(work,'commit','-qm','old preparation');
  const old=git(work,'rev-parse','HEAD');
  put(work,'docs/split-assignments/launch.json',{protocol:'six-agent-parallel-ring-v2',preparation_revision:2});
  git(work,'add','docs/split-assignments/launch.json');git(work,'commit','-qm','updated preparation');
  const base=git(work,'rev-parse','HEAD');
  put(work,'unrelated.txt','unrelated later main change\n');git(work,'add','unrelated.txt');git(work,'commit','-qm','later main');
  git(work,'branch','-M','main');
  // Server hook models the platform restriction: the caller may update only
  // its own assigned ref. It deliberately denies a peer-branch push.
  const hook=path.join(remote,'hooks/pre-receive');
  fs.writeFileSync(hook,'#!/bin/sh\nwhile read old new ref; do\n  test "$ref" = "$TEST_ALLOWED_REF" || { echo "not own platform branch" >&2; exit 1; }\ndone\n');
  fs.chmodSync(hook,0o755);
  run(work,'git',['push','-q','origin','HEAD:refs/heads/main'],{TEST_ALLOWED_REF:'refs/heads/main'});
  git(work,'fetch','-q','--no-tags','--refmap=','origin','refs/heads/main');
  assert.equal(git(work,'log','-1','--first-parent','--diff-filter=AM','--format=%H','FETCH_HEAD','--','docs/split-assignments/launch.json'),base);
  assert.notEqual(base,old);
  const branch4='arena/4d139995-mafatih',branch3='arena/another-session-mafatih';
  git(work,'switch','-q','-c',branch4,base);
  const registration=JSON.parse(agent(work,'register','--agent','agent-4','--base',base)) as {status:string;branch:string;base:string};
  assert.equal(registration.status,'registered');assert.equal(registration.branch,branch4);assert.equal(registration.base,base);
  agent(work,'register','--agent','agent-4','--base',base); // idempotent, not overwritten
  agent(work,'configure','--agent','agent-4');
  const wrong=execute(work,process.execPath,['--import',tsx,cli,'configure','--agent','agent-3']);
  assert.notEqual(wrong.status,0,'cannot configure as a different agent on this branch');
  agent(work,'message','--from','agent-4','--to','agent-3','--kind','progress','--text','Registration ready.');
  git(work,'add','agent-work/agent-4/registration.json','coordination/agent-3-agent-4.jsonl');git(work,'commit','-qm','register agent 4');
  run(work,'git',['push','-q','origin',`HEAD:refs/heads/${branch4}`],{TEST_ALLOWED_REF:`refs/heads/${branch4}`});
  const denied=execute(work,'git',['push','-q','origin',`HEAD:refs/heads/${branch3}`],{TEST_ALLOWED_REF:`refs/heads/${branch4}`});
  assert.notEqual(denied.status,0,'the simulated platform must reject a peer push');
  let found=JSON.parse(agent(work,'discover','--agent','agent-4','--peer','agent-3')) as {status:string};
  assert.equal(found.status,'awaiting-peer');
  git(work,'switch','-q','-c',branch3,base);
  agent(work,'register','--agent','agent-3','--base',base);agent(work,'configure','--agent','agent-3');
  git(work,'add','agent-work/agent-3/registration.json');git(work,'commit','-qm','register agent 3');
  const tip3=git(work,'rev-parse','HEAD');
  run(work,'git',['push','-q','origin',`HEAD:refs/heads/${branch3}`],{TEST_ALLOWED_REF:`refs/heads/${branch3}`});
  // A branch from an older launch is not a candidate for this round.
  git(work,'switch','-q','-c','arena/stale-session-mafatih',base);
  put(work,'agent-work/agent-3/registration.json',{format_version:1,protocol:'six-agent-parallel-ring-v2',agent:'agent-3',branch:'arena/stale-session-mafatih',base:old});
  git(work,'add','agent-work/agent-3/registration.json');git(work,'commit','-qm','stale registration');
  run(work,'git',['push','-q','origin','HEAD:refs/heads/arena/stale-session-mafatih'],{TEST_ALLOWED_REF:'refs/heads/arena/stale-session-mafatih'});
  git(work,'switch','-q',branch4);
  const peer=JSON.parse(agent(work,'discover','--agent','agent-4','--peer','agent-3')) as {status:string;branch:string;tip:string;base:string};
  assert.equal(peer.status,'peer-found');assert.equal(peer.branch,branch3);assert.equal(peer.tip,tip3);assert.equal(peer.base,base);
  assert.equal(git(work,'show',`${peer.tip}:agent-work/agent-3/registration.json`).includes(branch3),true);
  found=JSON.parse(agent(work,'discover','--agent','agent-4','--peer','agent-5')) as {status:string};
  assert.equal(found.status,'awaiting-peer');
  const outsider=execute(work,process.execPath,['--import',tsx,cli,'discover','--agent','agent-4','--peer','agent-1']);
  assert.notEqual(outsider.status,0,'discovery is limited to ring neighbors');
  git(work,'switch','-q','-c','arena/duplicate-session-mafatih',base);
  agent(work,'register','--agent','agent-3','--base',base);
  git(work,'add','agent-work/agent-3/registration.json');git(work,'commit','-qm','duplicate claim');
  run(work,'git',['push','-q','origin','HEAD:refs/heads/arena/duplicate-session-mafatih'],{TEST_ALLOWED_REF:'refs/heads/arena/duplicate-session-mafatih'});
  git(work,'switch','-q',branch4);
  const ambiguous=execute(work,process.execPath,['--import',tsx,cli,'discover','--agent','agent-4','--peer','agent-3']);
  assert.notEqual(ambiguous.status,0);assert.match(ambiguous.stderr,/ambiguous|multiple/i);
  git(work,'switch','-q','-c','arena/legacy-session-mafatih',base);
  put(work,'agent-work/agent-5/base.txt',old+'\n');
  const mismatch=execute(work,process.execPath,['--import',tsx,cli,'register','--agent','agent-5','--base',base]);
  assert.notEqual(mismatch.status,0);assert.match(mismatch.stderr,/base|baseline/i);
  assert.equal(fs.readFileSync(path.join(work,'agent-work/agent-5/base.txt'),'utf8'),old+'\n');
  assert.equal(fs.existsSync(path.join(work,'agent-work/agent-5/registration.json')),false);
});
