import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { loadCorpus, text } from '../src/corpus.js';
import { compileRowVersionFindings, itemVersionBinding, RowVersionFindingsSchema, rowVersion } from '../src/row-version-safety.js';
import { resolveVersionedRowAnchor } from '../web/row-split-anchor.js';

// The actual register must be safe on both its intended combined corpus and a
// different main/replay corpus. A stale item withholds its old destinations.
test('every recorded guarded ID warns, and bound proposals preserve every old code point without auto-opening',()=>{
  const corpus=loadCorpus();
  const findings=RowVersionFindingsSchema.parse(JSON.parse(fs.readFileSync('docs/split-assignments/row-version-findings.json','utf8')));
  const compiled=compileRowVersionFindings(corpus,findings);
  let entries=0,bound=0,stale=0,points=0;
  for(const [itemId,group] of Object.entries(findings.items)){
    const item=corpus.items.get(itemId);if(!item)continue;
    const matches=itemVersionBinding(item,corpus.rowSplits.get(itemId))===group.target_sha256;
    const versions=compiled.get(itemId)!;
    const rows=item.rows.filter(row=>row.kind!=='audio-reciter').map(row=>({id:row.id,ar:text(corpus,row.ar),fa:text(corpus,row.fa),version:rowVersion(itemId,row)}));
    for(const candidate of group.rows){
      entries++;if(matches)bound++;else stale++;
      const sourceLanguage=candidate.ar.length?'ar':'fa';
      const labels=[candidate.snapshots[0]!,rowVersion(itemId,candidate.original)];
      const entry=versions.find(value=>value.id===candidate.id)!;
      const collision=entry.current?.snapshots.some(label=>entry.historical.some(value=>value.snapshots.includes(label))) ?? false;
      const ambiguous=resolveVersionedRowAnchor([],versions,{row:candidate.id,language:sourceLanguage,offset:0},rows);
      assert.equal(ambiguous.status,collision?'invalid-data':'ambiguous',`${itemId}/${candidate.id}`);
      // Every recorded snapshot, not only a representative, must be recognized
      // while still requiring consent or failing closed on stale/colliding data.
      for(const version of candidate.snapshots){
        const result=resolveVersionedRowAnchor([],versions,{row:candidate.id,language:sourceLanguage,offset:0,version},rows);
        assert.equal(result.status,collision?'invalid-data':matches?'provisional':'unavailable',`${itemId}/${candidate.id}/${version}`);
      }
      for(const language of ['ar','fa'] as const){
        const ref=candidate.original[language];if(ref===null)continue;
        const source=corpus.texts.get(ref);
        if(!matches||collision){
          for(const version of labels)
            assert.equal(resolveVersionedRowAnchor([],versions,{row:candidate.id,language,offset:0,version},rows).status,collision?'invalid-data':'unavailable');
          continue;
        }
        assert.notEqual(source,undefined);
        for(const [offset,char] of Array.from(source!).entries()){
          for(const version of labels){
            const resolved=resolveVersionedRowAnchor([],versions,{row:candidate.id,language,offset,version},rows);
            assert.equal(resolved.status,'provisional',`${itemId}/${candidate.id}/${language}/${offset}`);
            if(resolved.status!=='provisional')throw new Error('expected provisional');
            const target=rows.find(row=>row.id===resolved.anchor.row)!;
            assert.equal(Array.from(target[resolved.anchor.language])[resolved.anchor.offset],char,
              `${itemId}/${candidate.id}/${language}/${offset}`);
          }
          points++;
        }
      }
    }
  }
  assert.ok(entries>=467,'retain all known reused and unroutable retired IDs');
  assert.equal(entries,bound+stale);
  if(bound)assert.ok(points>0);
});
