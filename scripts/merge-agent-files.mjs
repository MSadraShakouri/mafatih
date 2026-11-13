#!/usr/bin/env node
// Git's %O/%A/%B are temporary ancestor/ours/theirs files. Only independent,
// immutable pooled values or append-only neighbor messages may be unioned.
// Anything else is a real conflict and is left for the agent to resolve.
import fs from 'node:fs';
import crypto from 'node:crypto';

const [mode,baseFile,oursFile,theirsFile,repositoryPath,...extra]=process.argv.slice(2);
const fail=message=>{throw new Error(message);};
const read=file=>fs.readFileSync(file,'utf8');
const stable=value=>JSON.stringify(value && typeof value==='object' && !Array.isArray(value)
  ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(stable(value[k]))]))
  : Array.isArray(value)?value.map(x=>JSON.parse(stable(x))):value);
function pool(file, prefix){
  const value=JSON.parse(read(file));
  if(!value || typeof value!=='object' || Array.isArray(value))fail('Text shard is not an object');
  for(const [id,text] of Object.entries(value)){
    if(typeof text!=='string' || !/^t[0-9a-f]{24}$/.test(id) || id.slice(1,3)!==prefix ||
       `t${crypto.createHash('sha256').update(text,'utf8').digest('hex').slice(0,24)}`!==id) fail(`Invalid text ID or shard: ${id}`);
  }
  return value;
}
function mergeTexts(pathname){
  const match=/^data\/texts\/([0-9a-f]{2})\.json$/.exec(pathname);
  if(!match)fail('Unexpected text-shard path');
  const base=pool(baseFile,match[1]), ours=pool(oursFile,match[1]), theirs=pool(theirsFile,match[1]);
  for(const [id,text] of Object.entries(base)){
    if(ours[id]!==text || theirs[id]!==text)fail(`Existing text value was changed or deleted: ${id}`);
  }
  const added=new Map();
  for(const values of [ours,theirs])for(const [id,text] of Object.entries(values)){
    if(Object.hasOwn(base,id))continue;
    if(added.has(id) && added.get(id)!==text)fail(`Conflicting text addition: ${id}`);
    added.set(id,text);
  }
  const merged={...base};for(const [id,text] of [...added.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0))merged[id]=text;
  return JSON.stringify(merged,null,2)+'\n';
}
const messageKeys=new Set(['format_version','id','sender','recipient','kind','text','reply_to','commit','item','fingerprint']);
function messages(file,pair){
  const result=new Map();
  for(const [index,line] of read(file).split('\n').entries()){
    if(!line.trim())continue;
    const m=JSON.parse(line);
    if(!m || typeof m!=='object' || Array.isArray(m) || Object.keys(m).some(k=>!messageKeys.has(k)) ||
       m.format_version!==1 || typeof m.id!=='string' || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(m.id) ||
       !pair.includes(m.sender) || !pair.includes(m.recipient) || m.sender===m.recipient ||
       !['ready','review','question','answer','resolved','acknowledgement','progress'].includes(m.kind) ||
       typeof m.text!=='string' || !m.text.trim() || m.text.length>2000 ||
       (m.reply_to!==undefined && (typeof m.reply_to!=='string' || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(m.reply_to))) ||
       (m.commit!==undefined && (typeof m.commit!=='string' || !/^[a-f0-9]{40}$/.test(m.commit))) ||
       (m.item!==undefined && (typeof m.item!=='string' || !/^[a-z0-9][a-z0-9-]*$/.test(m.item))) ||
       (m.fingerprint!==undefined && (typeof m.fingerprint!=='string' || !/^[a-f0-9]{64}$/.test(m.fingerprint)))) {
      fail(`Invalid neighbor message on line ${index+1}`);
    }
    if(result.has(m.id) && stable(result.get(m.id))!==stable(m))fail(`Message ID collision: ${m.id}`);
    result.set(m.id,m);
  }
  return result;
}
function mergeMessages(pathname){
  const match=/^coordination\/(agent-[1-6])-(agent-[1-6])\.jsonl$/.exec(pathname);
  if(!match || match[1]>=match[2])fail('Unexpected neighbor-message path');
  const [base,ours,theirs]=[baseFile,oursFile,theirsFile].map(f=>messages(f,[match[1],match[2]]));
  for(const [id,message] of base){
    if(!ours.has(id)||!theirs.has(id)||stable(ours.get(id))!==stable(message)||stable(theirs.get(id))!==stable(message))fail(`Existing message was removed or changed: ${id}`);
  }
  const merged=new Map(base);
  for(const side of [ours,theirs])for(const [id,message] of side){
    if(merged.has(id) && stable(merged.get(id))!==stable(message))fail(`Message ID collision: ${id}`);
    merged.set(id,message);
  }
  return [...merged.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,m])=>JSON.stringify(m)).join('\n')+(merged.size?'\n':'');
}
try {
  if(!mode || !baseFile || !oursFile || !theirsFile || !repositoryPath || extra.length)fail('Usage: merge-agent-files.mjs texts|messages BASE OURS THEIRS REPOSITORY_PATH');
  const output=mode==='texts'?mergeTexts(repositoryPath):mode==='messages'?mergeMessages(repositoryPath):fail('Unknown merge type');
  const temp=`${oursFile}.merge-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try { fs.writeFileSync(temp,output,{encoding:'utf8',flag:'wx'});fs.renameSync(temp,oursFile); }
  finally { if(fs.existsSync(temp))fs.unlinkSync(temp); }
} catch(error) { console.error(`Safe merge refused: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1; }
