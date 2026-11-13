import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { commit, pretty, preserveKeyOrder } from '../src/editor.js';
import { createAgentTemplate, splitAgentPlan } from '../src/split-agent.js';
import { compileCanonicalSplit, createCanonicalLayoutTemplate } from '../src/split-canonical.js';
import { corpusBeforeRowSplits } from '../tests/helpers/row-split-history.js';

// This intentionally mechanical regression fixture is NOT a proposed split or
// a semantic review. It never writes the repository's canonical data. Run it
// separately from npm test: it executes the whole test suite in an isolated,
// automatically removed data root using MAFATIH_DATA_ROOT.
const original = corpusBeforeRowSplits(loadCorpus());
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-migrated-corpus-'));
const selected = new Map(Object.entries({
  'ziyarat-ashura':['r00003/ar','r00032/ar'],
  'item-mqdmh':['r00006/fa','r00007/fa'],
  'dua-mujir':['r00007/fa','r00008/fa'],
  'ziyarat-warith':['r00131-instruction/fa','r00131/ar','r00148/ar'],
  'dua-frj-zman-ajl':['r00003/ar','r00004/ar'],
  'dua-azm-al-bala':['r00002/ar','r00003/ar'],
  'dua-kumayl':['r00002/fa','r00012/ar','r00098/ar'],
  'sura-yasin':['r00003/ar','r00051/ar'],
  'dua-iftitah':['r00001/fa','r00012/ar'],
  'dua-samat':['r00001/fa','r00117/fa'],
  'dua-jawshan-kabir':['r00086/ar','r00118/fa','r00126/fa'],
  'item-abvhmzh-smaly':['r00220/fa','r00221/fa'],
  'dua-jawshan-sagheer':['r00002/ar'],
  'dua-ahd':['r00003/ar'],
  'monajat-mnajat-aymh-alyhm':['r00020/ar'],
}));
try {
  fs.cpSync(original.root, root, {recursive:true});
  const current = loadCorpus(root);
  current.items = new Map(original.items); current.rowSplits = new Map();
  const splitDir=path.join(root,'row-splits'); fs.mkdirSync(splitDir,{recursive:true});
  for (const name of fs.readdirSync(splitDir)) if (name.endsWith('.json')) fs.unlinkSync(path.join(splitDir,name));
  let cuts=0, moved=false, reclassifiedAudio=false;
  for (const [id,item] of original.items) {
    const plan=createAgentTemplate(original,id,'agent-1');
    const kinds=new Map(item.rows.map(row=>[row.id,row.kind && row.kind!=='unknown' ? row.kind : 'recitation']));
    for(const source of plan.sources) {
      source.checked=true;
      source.kinds=source.kinds.map(()=>kinds.get(source.row)!);
    }
    for(const name of selected.get(id)??[]) {
      const [row,language]=name.split('/') as [string,'ar'|'fa'];
      const source=plan.sources.find(value=>value.row===row&&value.language===language);
      if(!source)continue;
      const old=item.rows.find(value=>value.id===row)!;
      const value=text(original,old[language]),points=Array.from(value),candidates:number[]=[];
      let at=0;
      for(const {segment} of new Intl.Segmenter('und',{granularity:'grapheme'}).segment(value)) {
        at+=Array.from(segment).length; if(at<points.length)candidates.push(at);
      }
      candidates.sort((a,b)=>Math.abs(a-points.length/2)-Math.abs(b-points.length/2));
      let found=false;
      for(const cut of candidates) {
        if(!points.slice(0,cut).join('').trim()||!points.slice(cut).join('').trim())continue;
        source.cuts=[cut];source.kinds=[kinds.get(row)!,kinds.get(row)!];
        try {splitAgentPlan(original,plan);found=true;break;} catch { /* find a valid grapheme/marker boundary */ }
      }
      if(found)cuts++; else {source.cuts=[];source.kinds=[kinds.get(row)!];}
      if(id==='dua-iftitah'&&row==='r00012'&&language==='ar'&&found) {
        source.kinds=['instruction','recitation'];
      }
      if(id==='dua-kumayl'&&row==='r00002'&&language==='fa'&&old.kind==='audio-reciter') {
        source.kinds=source.kinds.map(()=>'other');reclassifiedAudio=true;
      }
    }
    const preview=splitAgentPlan(original,plan),layout=createCanonicalLayoutTemplate(original,preview);
    for(const row of layout.rows)row.checked=true;
    if(id==='dua-iftitah') {
      const entry=layout.rows.find(row=>row.row==='r00012');
      const piece=entry?.output.find(out=>out.ar?.source==='ar'&&out.ar.part===0&&out.kind==='instruction');
      if(piece&&piece.fa===null){piece.fa=piece.ar;piece.ar=null;moved=true;}
    }
    const result=compileCanonicalSplit(original,plan,layout);
    const itemFile=path.join(root,'items',id+'.json'),recordFile=path.join(splitDir,id+'.json');
    for(const [tid,value] of result.texts){current.texts.set(tid,value);current.textShards.set(tid,tid.slice(1,3));}
    current.items.set(id,result.item);current.rowSplits.set(id,result.record);
    commit(current,new Map([[itemFile,pretty(preserveKeyOrder(JSON.parse(fs.readFileSync(itemFile,'utf8')),result.item))],
      [recordFile,pretty(result.record)]]),[],[...result.texts.keys()]);
  }
  assert.ok(cuts>=20,`expected many synthetic cuts, got ${cuts}`);
  assert.ok(moved,'expected a synthetic Arabic-to-Persian field move');
  assert.ok(reclassifiedAudio,'expected a synthetic reclassification of an audio row');
  assert.deepEqual(validateCorpus(loadCorpus(root)).errors,[]);
  console.log(`Disposable fixture: ${original.items.size} mechanically classified items, ${cuts} synthetic cuts, one language-field move and one audio reclassification.`);
  const database=path.join(root,'synthetic.sqlite');
  const exported=spawnSync('python3',['tools/export_sqlite.py'],{stdio:'inherit',env:{...process.env,MAFATIH_DATA_ROOT:root,MAFATIH_SQLITE_OUT:database}});
  if(exported.status!==0)throw new Error(`Synthetic SQLite export failed: ${exported.status}`);
  const checked=spawnSync('python3',['-c',
    'import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); errors=c.execute("PRAGMA foreign_key_check").fetchall(); print("Synthetic SQLite foreign-key violations:",len(errors)); sys.exit(bool(errors))',database],{stdio:'inherit'});
  if(checked.status!==0)throw new Error(`Synthetic SQLite foreign-key check failed: ${checked.status}`);
  console.log('No fixture decisions are semantic review; running npm test against the temporary data root.');
  const run=spawnSync('npm',['test'],{stdio:'inherit',env:{...process.env,MAFATIH_DATA_ROOT:root}});
  if(run.status!==0)throw new Error(`Migrated-corpus npm test failed: status ${run.status}, signal ${run.signal ?? 'none'}`);
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
