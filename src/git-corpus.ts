import { spawnSync } from 'node:child_process';
import { loadCorpusFromEntries, type Corpus } from './corpus.js';

/** Only accept an actual full immutable commit ID, never a moving branch name. */
export function gitCommit(commit: string): string {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Pass the full 40-character frozen base commit ID');
  const result=spawnSync('git',['cat-file','-e',`${commit}^{commit}`],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`Base commit is not available locally: ${commit}`);
  return commit;
}
function checkedPath(name:string):void {
  if(!/^[a-zA-Z0-9._/-]+$/.test(name) || name.startsWith('/') || name.split('/').includes('..')) throw new Error('Invalid Git path');
}
export function gitFile(commit:string, name:string):string {
  gitCommit(commit);checkedPath(name);
  const result=spawnSync('git',['show',`${commit}:${name}`],{encoding:'utf8',maxBuffer:64*1024*1024});
  if(result.status!==0)throw new Error(`Snapshot lacks ${name}: ${result.stderr.trim()}`);
  return result.stdout;
}

/** Read requested files from one immutable commit in a single Git batch. */
export function gitFiles(commit:string,names:readonly string[]):Map<string,string> {
  gitCommit(commit);for(const name of names)checkedPath(name);
  const unique=[...new Set(names)], requests=unique.map(name=>`${commit}:${name}`);
  if(!unique.length)return new Map();
  const batch=spawnSync('git',['cat-file','--batch'],{input:Buffer.from(requests.join('\n')+'\n'),encoding:'buffer',maxBuffer:128*1024*1024});
  if(batch.status!==0)throw new Error('Could not read frozen commit files');
  const data=batch.stdout, entries=new Map<string,string>();let cursor=0;
  for(const name of unique){
    const lineEnd=data.indexOf(10,cursor);if(lineEnd<0)throw new Error('Truncated Git batch header');
    const header=data.subarray(cursor,lineEnd).toString('ascii'), match=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(header);
    if(!match)throw new Error(`Snapshot lacks or has invalid blob ${name}: ${header}`);
    const size=Number(match[2]),start=lineEnd+1,end=start+size;
    if(!Number.isSafeInteger(size)||data[end]!==10)throw new Error('Truncated Git batch body');
    entries.set(name,data.subarray(start,end).toString('utf8'));cursor=end+1;
  }
  if(cursor!==data.length)throw new Error('Trailing Git batch data');return entries;
}

/** Read every base data blob through Git into memory; never create a second checkout. */
export function loadCorpusAtCommit(commit:string):Corpus {
  gitCommit(commit);
  const listing=spawnSync('git',['ls-tree','-r','-z','--full-tree',commit,'--','data/'],{encoding:'buffer',maxBuffer:32*1024*1024});
  if(listing.status!==0)throw new Error('Could not list frozen base data');
  const lines=listing.stdout.toString('utf8').split('\0').filter(Boolean);
  const blobs:Array<{id:string;name:string}>=[];
  for(const line of lines){
    const m=/^100644 blob ([a-f0-9]{40})\tdata\/(.+)$/.exec(line);
    if(!m)throw new Error(`Unsupported frozen data tree entry: ${line}`);
    const name=m[2]!;checkedPath(name);blobs.push({id:m[1]!,name});
  }
  const batch=spawnSync('git',['cat-file','--batch'],{input:Buffer.from(blobs.map(x=>x.id).join('\n')+'\n'),encoding:'buffer',maxBuffer:128*1024*1024});
  if(batch.status!==0)throw new Error('Could not read frozen base blobs');
  const data=batch.stdout, entries=new Map<string,string>(); let cursor=0;
  for(const blob of blobs){
    const lineEnd=data.indexOf(10,cursor); if(lineEnd<0)throw new Error('Truncated Git batch header');
    const header=data.subarray(cursor,lineEnd).toString('ascii');
    const match=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(header);
    if(!match || match[1]!==blob.id)throw new Error(`Unexpected Git batch response: ${header}`);
    const size=Number(match[2]), start=lineEnd+1, end=start+size;
    if(!Number.isSafeInteger(size)||data[end]!==10)throw new Error('Truncated Git batch body');
    entries.set(blob.name,data.subarray(start,end).toString('utf8')); cursor=end+1;
  }
  if(cursor!==data.length)throw new Error('Trailing Git batch data');
  return loadCorpusFromEntries(entries);
}
