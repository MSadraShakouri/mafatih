import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {loadCorpus,text} from '../src/corpus.js';
import {normalizeSearch} from '../src/normalize.js';
import {IncrementalSearch,type SearchIndex,type SearchShard} from '../src/search.js';
import {corpusBeforeRowSplits,currentPieces,historicalRow} from './helpers/row-split-history.js';

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
  const original=corpusBeforeRowSplits(c);
  assert.ok([...original.items.values()].flatMap(item=>item.rows).filter(row=>row.kind==='audio-reciter').length>=28);
  assert.ok(original.items.get('dua-kumayl')!.rows.filter(r=>r.kind==='audio-reciter').length>=8);
  assert.equal(excluded,[...c.items.values()].flatMap(item=>item.rows).filter(row=>row.kind==='audio-reciter').length);
  const engine=new IncrementalSearch(allRecords);
  let result=engine.begin({id:1,query:'الهی ربی',languages:['ar','fa'],item:'dua-kumayl',tocLimit:100,textLimit:1000});
  while(!result.complete)result=engine.advance(2000);
  assert.ok(result.text.some(hit=>hit.record.item==='dua-kumayl'&&hit.matchedWords.length>0));
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

test('row adjacency metadata follows immediate source rows only, without crossing languages, gaps or audio rows',()=>{
  const c=loadCorpus();
  const index=JSON.parse(fs.readFileSync('generated/web-data/search-index.json','utf8')) as SearchIndex;
  assert.equal(index.version,4);
  const shards=index.shards.map(path=>JSON.parse(fs.readFileSync(`generated/web-data/${path}`,'utf8')) as SearchShard);
  assert.ok(shards.every(shard=>shard.version===4));
  const records=[...index.records,...shards.flatMap(shard=>shard.records)];
  const byKey=new Map(records.map(r=>[r.key,r]));
  for(const toc of index.records)assert.equal(toc.next,undefined);
  let links=0;
  for(const [id,item] of c.items)for(let i=0;i<item.rows.length;i+=1){
    const row=item.rows[i]!;if(row.kind==='audio-reciter')continue;
    for(const lang of ['ar','fa'] as const){
      const value=text(c,row[lang]);if(!value)continue;
      const current=byKey.get(`row:${id}:${row.id}:${lang}`)!;assert.ok(current);
      const following=item.rows[i+1];
      const nextText=following&&following.kind!=='audio-reciter'?text(c,following[lang]):'';
      const expected=following&&nextText&&normalizeSearch(nextText)?`row:${id}:${following.id}:${lang}`:undefined;
      assert.equal(current.next,expected,`${id}/${row.id}/${lang}`);
      if(current.next){links++;const next=byKey.get(current.next);assert.ok(next);assert.equal(next.item,id);assert.equal(next.language,lang);}
    }
  }
  assert.ok(links>0, 'exercise actual current adjacency links');
});

test('local diagnostic probe reports the actual current combined ranking and continuation',()=>{
  const query='عظم البلاء و برح الخفاء';
  const output=execFileSync(process.execPath,['--import','tsx','scripts/probe-search.ts',query],{encoding:'utf8'});
  assert.match(output,/Top combined results:/);
  const first=output.split('Top combined results:')[1]!.trimStart().split('\n')[0]!;
  const index=JSON.parse(fs.readFileSync('generated/web-data/search-index.json','utf8')) as SearchIndex;
  const records=[...index.records,...index.shards.flatMap(file=>(JSON.parse(fs.readFileSync(`generated/web-data/${file}`,'utf8')) as SearchShard).records)];
  const engine=new IncrementalSearch(records);
  let result=engine.begin({id:0,query,languages:['ar','fa'],tocLimit:records.length,textLimit:records.length,resultLimit:6});
  while(!result.complete)result=engine.advance(records.length);
  const hit=result.results[0];assert.ok(hit);
  const location=hit.record.section==='toc'?(hit.record.item??`heading:${hit.record.tocPath}`):`${hit.record.item}/${hit.record.row}`;
  assert.ok(first.includes(location),`probe must print ${location}`);
  for(const part of hit.continuation??[])assert.ok(first.includes(part.row),`probe must print continuation ${part.row}`);
});

test('generated reader, search, navigation and English data use the corrected canonical occurrences', () => {
  const c = loadCorpus();
  const changes = (c.editorial.punctuation_normalizations ?? []).flatMap(batch => batch.changes);
  assert.ok(changes.length > 0);
  type BuiltNode = { title: string; children: BuiltNode[] };
  type BuiltItem = { title: Record<string, string>; rows: Array<{ id: string; ar: string; fa: string }> };
  type BuiltEnglish = { paragraphs: Array<{ id: string; text: string }> };
  const catalog = JSON.parse(fs.readFileSync('generated/web-data/catalog.json', 'utf8')) as {
    items: Array<{ id: string; title: Record<string, string>; tags: string[] }>;
    toc: BuiltNode[];
  };
  const index = JSON.parse(fs.readFileSync('generated/web-data/search-index.json', 'utf8')) as SearchIndex;
  const records = [...index.records, ...index.shards.flatMap(file => (JSON.parse(fs.readFileSync(`generated/web-data/${file}`, 'utf8')) as SearchShard).records)];
  const byKey = new Map(records.map(record => [record.key, record]));
  const itemFiles = new Map<string, BuiltItem>();
  const englishFiles = new Map<string, BuiltEnglish>();
  let rows = 0, english = 0, titles = 0, navigation = 0;
  for (const edit of changes) {
    const location = edit.location; let expected = text(c, edit.replacement);
    if (location.kind === 'item-row') {
      const source = historicalRow(c, location.item, location.row);
      // Later occurrence-level corrections can legitimately follow a
      // punctuation edit. Resolve the chain up to the pre-split occurrence;
      // current fields may now be smaller or stored in another language.
      let previous: string | null = edit.replacement;
      const visited = new Set<string | null>();
      while (previous !== source[location.language]) {
        assert.ok(!visited.has(previous), 'cyclic row-correction chain'); visited.add(previous);
        const next = (c.editorial.row_corrections ?? []).find(entry => entry.item === location.item &&
          entry.row === location.row && entry.language === location.language && entry.previous === previous);
        assert.ok(next, `missing later correction for ${location.item}/${location.row}/${location.language}`);
        previous = next.replacement;
      }
      expected = text(c, previous);
      let item = itemFiles.get(location.item);
      if (!item) {
        item = JSON.parse(fs.readFileSync(`generated/web-data/items/${location.item}.json`, 'utf8')) as BuiltItem;
        itemFiles.set(location.item, item);
      }
      const pieces = currentPieces(c, location.item, location.row, location.language);
      assert.equal(pieces.map(piece => piece.text).join(''), expected);
      for (const piece of pieces) {
        const built: BuiltItem['rows'][number] | undefined = item.rows.find(row => row.id === piece.row.id);
        const indexed = byKey.get(`row:${location.item}:${piece.row.id}:${piece.language}`);
        if (piece.row.kind === 'audio-reciter') {
          assert.equal(built, undefined); assert.equal(indexed, undefined); continue;
        }
        assert.equal(built?.[piece.language], piece.text);
        assert.equal(indexed?.text, piece.text);
        assert.equal(indexed?.normalized, normalizeSearch(piece.text));
        rows += 1;
      }
    } else if (location.kind === 'english-paragraph') {
      let doc = englishFiles.get(location.document);
      if (!doc) {
        doc = JSON.parse(fs.readFileSync(`generated/web-data/english/${location.document}.json`, 'utf8')) as BuiltEnglish;
        englishFiles.set(location.document, doc);
      }
      assert.equal(doc.paragraphs.find(paragraph => paragraph.id === location.paragraph)?.text, expected);
      english += 1;
    } else if (location.kind === 'item-title') {
      assert.equal(catalog.items.find(item => item.id === location.item)?.title[location.language], expected);
      titles += 1;
    } else if (location.kind === 'navigation') {
      let children = catalog.toc; let node: BuiltNode | undefined;
      for (const index of location.path) { node = children[index]; assert.ok(node); children = node.children; }
      assert.equal(node?.title, expected);
      assert.equal(byKey.get(`toc:${location.path.join('.')}`)?.text, expected);
      navigation += 1;
    }
  }
  assert.ok(rows > 0 && english > 0 && titles > 0 && navigation > 0);
});
