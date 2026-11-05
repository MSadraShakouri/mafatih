import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {loadCorpus,text} from '../src/corpus.js';
import {normalizeSearch} from '../src/normalize.js';
import {IncrementalSearch,type SearchIndex,type SearchShard} from '../src/search.js';

// Build now, rather than relying on potentially stale generated artifacts.
before(()=>{execFileSync(process.execPath,['--import','tsx','scripts/build-data.ts'],{stdio:'pipe'});});

test('web build excludes classified audio menus from content and search but retains canonical rows',()=>{
  const c=loadCorpus();
  const index=JSON.parse(fs.readFileSync('generated/web-data/search-index.json','utf8')) as SearchIndex;
  const allRecords=[...index.records,...index.shards.flatMap(path=>(JSON.parse(fs.readFileSync(`generated/web-data/${path}`,'utf8')) as SearchShard).records)];
  const searchRows=allRecords.filter(r=>r.section==='text');
  const priority=(r:typeof searchRows[number])=>(r.featured?0:2)+(r.language==='ar'?0:1);
  assert.ok(searchRows[0]?.featured&&searchRows[0]?.language==='ar');
  for(let i=1;i<searchRows.length;i+=1)assert.ok(priority(searchRows[i-1]!)<=priority(searchRows[i]!),`shard priority at ${i}`);
  const catalog=JSON.parse(fs.readFileSync('generated/web-data/catalog.json','utf8')) as {items:Array<{id:string;row_count:number;excluded_audio_rows:number}>};
  let excluded=0;
  for(const [id,item] of c.items){
    const audio=item.rows.filter(r=>r.kind==='audio-reciter');if(!audio.length)continue;
    excluded+=audio.length;
    const ordinary=item.rows.filter(r=>r.kind!=='audio-reciter');
    const built=JSON.parse(fs.readFileSync(`generated/web-data/items/${id}.json`,'utf8')) as {excluded_audio_rows:number;rows:Array<{id:string;ar:string;fa:string;kind?:string}>};
    const catalogItem=catalog.items.find(x=>x.id===id)!;
    assert.equal(built.excluded_audio_rows,audio.length);assert.equal(catalogItem.excluded_audio_rows,audio.length);
    assert.equal(catalogItem.row_count,ordinary.length);
    assert.deepEqual(built.rows.map(r=>r.id),ordinary.map(r=>r.id));
    assert.ok(audio.every(r=>!built.rows.some(b=>b.id===r.id)));
    const records=allRecords.filter(x=>x.section==='text'&&x.item===id);
    assert.ok(audio.every(row=>!records.some(record=>record.row===row.id)));
    for(const row of ordinary){
      for(const language of ['ar','fa'] as const){
        const value=text(c,row[language]);
        const record=records.find(x=>x.row===row.id&&x.language===language);
        if(!value){assert.equal(record,undefined);continue;}
        assert.ok(record);assert.equal(record.text,value);assert.equal(record.normalized,normalizeSearch(value));
      }
    }
  }
  assert.ok(excluded>=28); // later explicit classifications may add more labels
  assert.ok(c.items.get('dua-kumayl')!.rows.filter(r=>r.kind==='audio-reciter').length>=8);
  const engine=new IncrementalSearch(allRecords);
  let result=engine.begin({id:1,query:'الهی ربی',languages:['ar','fa'],item:'dua-kumayl',tocLimit:100,textLimit:1000});
  while(!result.complete)result=engine.advance(2000);
  assert.ok(result.text.some(hit=>hit.record.item==='dua-kumayl'&&hit.matchedWords.length===2));
});

test('web build publishes retired paragraph redirects without restoring retracted links',()=>{
  const c=loadCorpus();
  const output=JSON.parse(fs.readFileSync('generated/web-data/paragraph-redirects.json','utf8')) as {redirects:Array<{document:string;paragraph:string;target_document:string;target_paragraph:string;original_text_id:string}>};
  assert.equal(output.redirects.length,c.editorial.paragraph_removals?.length);
  for(const e of c.editorial.paragraph_removals??[]){
    const redirect=output.redirects.find(r=>r.document===e.document&&r.paragraph===e.paragraph);
    assert.deepEqual(redirect,{document:e.document,paragraph:e.paragraph,target_document:e.preserved_document,target_paragraph:e.preserved_paragraph,original_text_id:e.text});
    const doc=JSON.parse(fs.readFileSync(`generated/web-data/english/${e.document}.json`,'utf8')) as {paragraph_redirects:typeof output.redirects};
    assert.ok(doc.paragraph_redirects.some(r=>r.paragraph===e.paragraph&&r.target_document===e.preserved_document));
  }
  const item=JSON.parse(fs.readFileSync('generated/web-data/items/ziyarat-zkrmsajd-mazmh-mdynh.json','utf8')) as {english:Array<{document:string}>};
  assert.ok(!item.english.some(l=>l.document==='tr142-rajab-daily-dua-4'));
});
