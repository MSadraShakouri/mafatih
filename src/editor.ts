import fs from 'node:fs';
import path from 'node:path';
import type { Corpus } from './corpus.js';
import { textId } from './text-ids.js';

export function intern(c:Corpus,value:string):string {
  const id=textId(value);const old=c.texts.get(id);
  if(old!==undefined&&old!==value)throw new Error(`Text hash collision: ${id}`);
  c.texts.set(id,value);c.textShards.set(id,id.slice(1,3));return id;
}
export function referencedTexts(c:Corpus):Set<string>{
  const refs=new Set<string>();function walk(x:unknown):void{
    if(typeof x==='string'&&/^t[0-9a-f]{24}$/.test(x))refs.add(x);
    else if(Array.isArray(x))for(const v of x)walk(v);
    else if(x&&typeof x==='object')for(const v of Object.values(x))walk(v);
  }
  walk(c.claims);walk(c.nav);walk(c.relations);walk(c.sources);walk(c.editorial);for(const x of c.items.values())walk(x);for(const x of c.english.values())walk(x);for(const x of c.alignments.values())walk(x);
  return refs;
}
export function pretty(x:unknown):string{return JSON.stringify(x,null,2)+'\n';}
/** Stage all writes, then rename. Roll back best-effort if a write fails. */
export function commit(c:Corpus,changes:Map<string,string|null>,oldIds:(string|null|undefined)[],newIds:(string|null|undefined)[]):void{
  const refs=referencedTexts(c);const shards=new Set<string>();
  for(const id of newIds)if(id)shards.add(id.slice(1,3));
  for(const id of oldIds)if(id){shards.add(id.slice(1,3));if(!refs.has(id)){c.texts.delete(id);c.textShards.delete(id);}}
  for(const shard of shards){
    const values:Record<string,string>={};for(const [id,value] of c.texts)if(id.slice(1,3)===shard)values[id]=value;
    const sorted=Object.fromEntries(Object.entries(values).sort(([a],[b])=>a.localeCompare(b,'en')));
    changes.set(path.join(c.root,'texts',shard+'.json'),Object.keys(sorted).length?pretty(sorted):null);
  }
  const before=new Map<string,Buffer|null>();const temps:string[]=[];
  try{
    for(const [file,data] of changes){before.set(file,fs.existsSync(file)?fs.readFileSync(file):null);fs.mkdirSync(path.dirname(file),{recursive:true});
      if(data!==null){const tmp=file+`.tmp-${process.pid}`;fs.writeFileSync(tmp,data,'utf8');temps.push(tmp);}}
    for(const [file,data] of changes){if(data===null){if(fs.existsSync(file))fs.unlinkSync(file);}else fs.renameSync(file+`.tmp-${process.pid}`,file);}
  }catch(e){
    for(const [file,original] of before){try{if(original===null){if(fs.existsSync(file))fs.unlinkSync(file);}else fs.writeFileSync(file,original);}catch{ /* report original error */ }}
    throw e;
  }finally{for(const temp of temps)if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
