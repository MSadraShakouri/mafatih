import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { textId } from '../src/text-ids.js';

const driver=path.resolve('scripts/merge-agent-files.mjs');
function run(cwd:string, command:string, ...args:string[]):string {
  const p=spawnSync(command,args,{cwd,encoding:'utf8'});
  if(p.status!==0)throw new Error(`${command} ${args.join(' ')}: ${p.stderr} ${p.stdout}`);
  return p.stdout.trim();
}
function git(dir:string,...args:string[]):string{return run(dir,'git',...args);}
function put(dir:string,name:string,value:string):void{const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
const pair=(a:number,b:number)=>`coordination/agent-${Math.min(a,b)}-agent-${Math.max(a,b)}.jsonl`;

test('six parallel neighbor merges and two final merge orders preserve all pooled additions and messages', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-synthetic-ring-'));
  try {
    git(dir,'init','-q');git(dir,'config','user.name','Synthetic Test');git(dir,'config','user.email','test@example.test');
    git(dir,'config','merge.mafatih-texts.driver',`${process.execPath} ${driver} texts %O %A %B %P`);
    git(dir,'config','merge.mafatih-messages.driver',`${process.execPath} ${driver} messages %O %A %B %P`);
    put(dir,'.gitattributes','data/texts/*.json merge=mafatih-texts\ncoordination/*.jsonl merge=mafatih-messages\n');
    const original='Synthetic shared baseline', prefix=textId(original).slice(1,3), values:string[]=[];
    for(let n=0;values.length<6;n++){const value=`Synthetic addition ${n}`;if(textId(value).slice(1,3)===prefix)values.push(value);}
    const shard=`data/texts/${prefix}.json`;
    put(dir,shard,JSON.stringify({[textId(original)]:original},null,2)+'\n');
    for(let i=1;i<=6;i++)put(dir,pair(i,i===6?1:i+1),'');
    git(dir,'add','.');git(dir,'commit','-qm','synthetic baseline');const base=git(dir,'rev-parse','HEAD');
    const snapshots:string[]=[];
    for(let i=1;i<=6;i++){
      git(dir,'switch','-q','-c',`agent-${i}`,base);
      const current=JSON.parse(fs.readFileSync(path.join(dir,shard),'utf8')) as Record<string,string>;
      current[textId(values[i-1]!)]=values[i-1]!;put(dir,shard,JSON.stringify(current,null,2)+'\n');
      put(dir,`data/items/item-${i}.json`,JSON.stringify({owner:i})+'\n');
      for(const neighbor of [i===1?6:i-1,i===6?1:i+1]) {
        const message={format_version:1,id:`id-${i}-${neighbor}`,sender:`agent-${i}`,recipient:`agent-${neighbor}`,kind:'question',text:`synthetic ${i} to ${neighbor}`};
        fs.appendFileSync(path.join(dir,pair(i,neighbor)),JSON.stringify(message)+'\n');
      }
      git(dir,'add','.');git(dir,'commit','-qm',`author ${i}`);snapshots.push(git(dir,'rev-parse','HEAD'));
    }
    const pairwise:string[]=[];
    for(let i=1;i<=6;i++){
      git(dir,'switch','-q',`agent-${i}`);git(dir,'merge','-q','--no-ff','-m',`merge predecessor`,snapshots[(i+4)%6]!);
      pairwise.push(git(dir,'rev-parse','HEAD'));
      const pool=JSON.parse(fs.readFileSync(path.join(dir,shard),'utf8')) as Record<string,string>;
      assert.equal(Object.keys(pool).length,3,`agent ${i} receives exactly its predecessor's addition`);
    }
    for(const [n,order] of [[1,[0,1,2,3,4,5]],[2,[5,1,3,0,4,2]]] as const){
      git(dir,'switch','-q','-c',`integration-${n}`,base);
      for(const index of order)git(dir,'merge','-q','--no-ff','-m',`combine ${index}`,pairwise[index]!);
      const pool=JSON.parse(fs.readFileSync(path.join(dir,shard),'utf8')) as Record<string,string>;
      assert.equal(Object.keys(pool).length,7);for(const value of [original,...values])assert.equal(pool[textId(value)],value);
      for(let i=1;i<=6;i++){
        assert.equal(fs.existsSync(path.join(dir,`data/items/item-${i}.json`)),true);
        const file=path.join(dir,pair(i,i===6?1:i+1));
        const messages=fs.readFileSync(file,'utf8').trim().split('\n').map(x=>JSON.parse(x) as {id:string});
        assert.equal(messages.length,2);assert.equal(new Set(messages.map(m=>m.id)).size,2);
      }
    }
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('merge driver rejects changed pool values and colliding message IDs without overwriting ours', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mafatih-merge-collision-'));
  try {
    const value='baseline', id=textId(value), shard=`data/texts/${id.slice(1,3)}.json`;
    put(dir,'base',JSON.stringify({[id]:value}));put(dir,'ours',JSON.stringify({[id]:value}));put(dir,'theirs',JSON.stringify({[id]:'changed'}));
    const before=fs.readFileSync(path.join(dir,'ours'),'utf8');
    const bad=spawnSync(process.execPath,[driver,'texts','base','ours','theirs',shard],{cwd:dir,encoding:'utf8'});
    assert.notEqual(bad.status,0);assert.equal(fs.readFileSync(path.join(dir,'ours'),'utf8'),before);
    const message={format_version:1,id:'same-id',sender:'agent-1',recipient:'agent-2',kind:'question',text:'first'};
    put(dir,'base','');put(dir,'ours',JSON.stringify(message)+'\n');put(dir,'theirs',JSON.stringify({...message,text:'different'})+'\n');
    const ours=fs.readFileSync(path.join(dir,'ours'),'utf8');
    const conflict=spawnSync(process.execPath,[driver,'messages','base','ours','theirs','coordination/agent-1-agent-2.jsonl'],{cwd:dir,encoding:'utf8'});
    assert.notEqual(conflict.status,0);assert.equal(fs.readFileSync(path.join(dir,'ours'),'utf8'),ours);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
