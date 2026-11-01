import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearch,compactSearch } from '../src/normalize.js';
import { search } from '../src/search.js';
import { codePoints,slicePoints,sha256,textId } from '../src/text-ids.js';
import { foldArabic,findUniqueEnglish,uniqueOccurrence } from '../src/align-match.js';

test('Arabic and Persian equivalent forms share search normalization',()=>{
  assert.equal(normalizeSearch('كِتاب'),normalizeSearch('کتاب'));
  assert.equal(normalizeSearch('يَا رَبِّ'),normalizeSearch('یا رب'));
  assert.equal(normalizeSearch('۱۲۳'),normalizeSearch('١٢٣'));
  assert.equal(normalizeSearch('قُرْآن'),normalizeSearch('قران'));
});
test('Persian joined and spaced forms are searchable without changing display text',()=>{
  const original='می‌روم';assert.equal(normalizeSearch(original),'می روم');assert.equal(compactSearch(original),'میروم');
  const entries=[{item:'x',fields:{title:normalizeSearch(original),ar:'',fa:'',en:'',tags:''}}];
  assert.deepEqual(search(entries,'میروم'),[{item:'x',match:'compact'}]);
  assert.deepEqual(search(entries,'می روم'),[{item:'x',match:'normalized'}]);
  assert.equal(original,'می‌روم');
});
test('Latin accents, punctuation, apostrophes and case fold consistently',()=>{
  assert.equal(normalizeSearch('Ḥusayn, The Faithful'),normalizeSearch('husayn the faithful'));
  assert.equal(normalizeSearch('edition,  Mafatih'),normalizeSearch('edition mafatih'));
  assert.deepEqual(search([{item:'x',fields:{title:'',ar:'',fa:'',en:normalizeSearch('edition,  Mafatih'),tags:''}}],'edition mafatih'),[{item:'x',match:'normalized'}]);
  assert.deepEqual(search([],''),[]);
});
test('span offsets are Unicode code points, not JavaScript UTF-16 indexes',()=>{
  const s='a😀ب';assert.equal(codePoints(s).length,3);assert.equal(slicePoints(s,1,2),'😀');
  assert.equal(textId('x'),'t'+sha256('x').slice(0,24));
});
test('alignment matcher rejects ambiguous matches and preserves original offsets',()=>{
  const target=foldArabic([{id:'r1',text:'اَللّٰهُمَّ إِنِّي'}]);
  const source=foldArabic([{id:'s',text:'اللهم اني'}]);assert.equal(target.value,source.value);
  assert.equal(uniqueOccurrence('abcabc','abc'),null);assert.equal(uniqueOccurrence('xabc','abc'),1);
  assert.deepEqual(findUniqueEnglish([{id:'p1',text:'😀 O Allah, help us.'}],'O Allah'),{paragraph:'p1',start:2,end:9});
  assert.equal(findUniqueEnglish([{id:'p1',text:'same same'}],'same'),null);
});
