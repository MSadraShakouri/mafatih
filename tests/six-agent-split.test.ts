import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus, type Corpus } from '../src/corpus.js';
import { intern } from '../src/editor.js';
import { ItemSchema } from '../src/schema.js';
import { createAgentTemplate, splitAgentPlan } from '../src/split-agent.js';
import { compileCanonicalSplit, createCanonicalLayoutTemplate, restoreCanonicalItem, verifyCanonicalResult } from '../src/split-canonical.js';
import { validateRowSplitRecords } from '../src/row-splits.js';
import { resolveLegacyRowAnchor } from '../web/row-split-anchor.js';
import { createCanonicalReviewTemplate, verifyCanonicalReview } from '../src/six-agent-review.js';

function fixture() {
  const c = loadCorpus(), item = 'test-six-agent-split';
  const ar = 'Intro. AR one. AR two.', fa = 'FA one. FA two.';
  const arRef = intern(c, ar), faRef = intern(c, fa);
  c.items.set(item, ItemSchema.parse({ legacy_id: null,
    title: { fa: c.items.get('dua-ahd')!.title.fa, ar: null, en: null },
    category: 'other', tags: [], legacy_alignment: 'manual-v1', rows: [
      { id: 'old-one', ar: arRef, fa: faRef },
      { id: 'old-shared', ar: arRef, fa: null, kind: 'recitation' },
    ],
  }));
  const plan = createAgentTemplate(c, item, 'agent-1');
  for (const source of plan.sources) { source.checked = true; source.kinds = ['recitation']; }
  const arPlan = plan.sources.find(x => x.row === 'old-one' && x.language === 'ar')!;
  arPlan.cuts = [7, 15]; arPlan.kinds = ['instruction', 'recitation', 'recitation'];
  const faPlan = plan.sources.find(x => x.row === 'old-one' && x.language === 'fa')!;
  faPlan.cuts = [8]; faPlan.kinds = ['recitation', 'recitation'];
  const preview = splitAgentPlan(c, plan), layout = createCanonicalLayoutTemplate(c, preview);
  for (const row of layout.rows) row.checked = true;
  layout.rows[0]!.output = [
    { ar: null, fa: { source: 'ar', part: 0 }, kind: 'instruction' },
    { ar: { source: 'ar', part: 1 }, fa: { source: 'fa', part: 0 }, kind: 'recitation' },
    { ar: { source: 'ar', part: 2 }, fa: { source: 'fa', part: 1 }, kind: 'recitation' },
  ];
  return { c, item, ar, fa, arRef, plan, preview, layout };
}

function resultCorpus(c: Corpus, compiled: ReturnType<typeof compileCanonicalSplit>): Corpus {
  const result: Corpus = { ...c, items: new Map(c.items), texts: new Map(c.texts), textShards: new Map(c.textShards), rowSplits: new Map(c.rowSplits) };
  result.items.set(compiled.itemId, compiled.item);
  result.rowSplits.set(compiled.itemId, compiled.record);
  for (const [id, value] of compiled.texts) { result.texts.set(id, value); result.textShards.set(id, id.slice(1, 3)); }
  return result;
}

test('physical rows preserve exact mixed and unequal language pieces, original records and shared text', () => {
  const f = fixture(), before = JSON.stringify(f.c.items.get(f.item));
  const compiled = compileCanonicalSplit(f.c, f.plan, f.layout);
  assert.equal(JSON.stringify(f.c.items.get(f.item)), before, 'compilation must not mutate baseline');
  const after = resultCorpus(f.c, compiled), item = after.items.get(f.item)!;
  assert.equal(item.rows.length, 4);
  assert.equal(item.rows.some(row => row.id === 'old-one'), false, 'split source ID is retired, never reused');
  assert.equal(item.rows[3]!.id, 'old-shared');
  assert.equal(item.rows[3]!.ar, f.arRef, 'another occurrence sharing the original text is untouched');
  assert.equal(after.texts.get(item.rows[0]!.fa!), 'Intro. ');
  assert.equal(after.texts.get(item.rows[1]!.ar!), 'AR one. ');
  assert.equal(after.texts.get(item.rows[1]!.fa!), 'FA one. ');
  assert.equal(after.texts.get(item.rows[2]!.ar!), 'AR two.');
  assert.equal(after.texts.get(item.rows[2]!.fa!), 'FA two.');
  assert.equal(item.rows[0]!.kind, 'instruction');
  assert.deepEqual(validateRowSplitRecords(after), []);
  assert.deepEqual(restoreCanonicalItem(after, f.item), f.c.items.get(f.item));
  assert.doesNotThrow(() => verifyCanonicalResult(f.c, after, f.plan, f.layout));
  const mapping = after.rowSplits.get(f.item)!;
  assert.deepEqual(resolveLegacyRowAnchor(mapping.rows, { row: 'old-one', language: 'ar', offset: 2 }),
    { row: item.rows[0]!.id, language: 'fa', offset: 2 });
  assert.deepEqual(resolveLegacyRowAnchor(mapping.rows, { row: 'old-one', language: 'ar', offset: 7 }),
    { row: item.rows[1]!.id, language: 'ar', offset: 0 });
  assert.deepEqual(resolveLegacyRowAnchor(mapping.rows, { row: 'old-one', language: 'fa', offset: 8 }),
    { row: item.rows[2]!.id, language: 'fa', offset: 0 });
  const newAnchor = { row: item.rows[1]!.id, language: 'ar' as const, offset: 3 };
  assert.deepEqual(resolveLegacyRowAnchor(mapping.rows, newAnchor), newAnchor);
});

test('no-cut/no-change source retains its row ID; classified changes remain reversible', () => {
  const f = fixture();
  for (const source of f.plan.sources) { source.cuts = []; source.kinds = ['recitation']; }
  const preview = splitAgentPlan(f.c, f.plan), layout = createCanonicalLayoutTemplate(f.c, preview);
  for (const row of layout.rows) row.checked = true;
  const compiled = compileCanonicalSplit(f.c, f.plan, layout), after = resultCorpus(f.c, compiled);
  assert.deepEqual(after.items.get(f.item)!.rows.map(r => r.id), ['old-one', 'old-shared']);
  assert.equal(after.items.get(f.item)!.rows[0]!.kind, 'recitation');
  assert.deepEqual(restoreCanonicalItem(after, f.item), f.c.items.get(f.item));
  assert.deepEqual(validateRowSplitRecords(after), []);
  assert.deepEqual(resolveLegacyRowAnchor(compiled.record.rows, { row: 'old-one', language: 'ar', offset: 4 }),
    { row: 'old-one', language: 'ar', offset: 4 });
});

test('rejects unchecked, missing, duplicated, reordered or wrong-kind pieces and stale layouts', () => {
  const f = fixture();
  const unchecked = structuredClone(f.layout); unchecked.rows[0]!.checked = false;
  assert.throws(() => compileCanonicalSplit(f.c, f.plan, unchecked), /check/i);
  const missing = structuredClone(f.layout); missing.rows[0]!.output.pop();
  assert.throws(() => compileCanonicalSplit(f.c, f.plan, missing), /missing|coverage/i);
  const duplicate = structuredClone(f.layout); duplicate.rows[0]!.output.push(structuredClone(duplicate.rows[0]!.output[1]!));
  assert.throws(() => compileCanonicalSplit(f.c, f.plan, duplicate), /duplicate|coverage|order/i);
  const reordered = structuredClone(f.layout);
  [reordered.rows[0]!.output[1], reordered.rows[0]!.output[2]] = [reordered.rows[0]!.output[2]!, reordered.rows[0]!.output[1]!];
  assert.throws(() => compileCanonicalSplit(f.c, f.plan, reordered), /order|coverage/i);
  const badKind = structuredClone(f.layout); badKind.rows[0]!.output[0]!.kind = 'recitation';
  assert.throws(() => compileCanonicalSplit(f.c, f.plan, badKind), /kind/i);
  const stale = structuredClone(f.layout); stale.plan_sha256 = '0'.repeat(64);
  assert.throws(() => compileCanonicalSplit(f.c, f.plan, stale), /stale|plan/i);
  const changedPlan = structuredClone(f.plan); changedPlan.sources[0]!.source_sha256 = '0'.repeat(64);
  assert.throws(() => compileCanonicalSplit(f.c, changedPlan, f.layout), /stale|hash|plan/i);
});

test('rejects damaged output or redirected text and stale result verification', () => {
  const f = fixture(), compiled = compileCanonicalSplit(f.c, f.plan, f.layout), after = resultCorpus(f.c, compiled);
  after.items.get(f.item)!.rows[1]!.ar = f.arRef;
  assert.ok(validateRowSplitRecords(after).length > 0);
  assert.throws(() => verifyCanonicalResult(f.c, after, f.plan, f.layout), /result|mismatch|mapping/i);
});

test('pre-existing human review/alignment blocks physical rewriting rather than silently invalidating it', () => {
  const f = fixture();
  f.c.items.get(f.item)!.review = { ar_fa: { reviewer: 'human', date: '2026-01-01' } };
  assert.throws(() => compileCanonicalSplit(f.c, f.plan, f.layout), /review|align/i);
});

test('independent review is bound to the actual canonical result and every occurrence', () => {
  const f=fixture(), compiled=compileCanonicalSplit(f.c,f.plan,f.layout), after=resultCorpus(f.c,compiled);
  assert.throws(()=>createCanonicalReviewTemplate(f.c,after,f.plan,f.layout,'agent-1','a'.repeat(40)),/author|independent/i);
  const review=createCanonicalReviewTemplate(f.c,after,f.plan,f.layout,'agent-2','a'.repeat(40));
  assert.equal(verifyCanonicalReview(f.c,after,f.plan,f.layout,review).status,'needs-work');
  for(const source of review.semantic_review.sources){source.split='accept';source.kind='accept';}
  for(const issue of review.semantic_review.issues){issue.decision='addressed';issue.note='Inspected';}
  review.layout.decision='accept';
  assert.equal(verifyCanonicalReview(f.c,after,f.plan,f.layout,review).status,'agent-review-records-complete');
  after.items.get(f.item)!.rows[1]!.kind='note';
  assert.throws(()=>verifyCanonicalReview(f.c,after,f.plan,f.layout,review),/result|mismatch|mapping/i);
});

test('physical breaks are never silently removed or relocated by canonical application', () => {
  const f=fixture(), row=f.c.items.get(f.item)!.rows[0]!;
  row.fa=intern(f.c,'FA first\nFA second');
  const plan=createAgentTemplate(f.c,f.item,'agent-1');
  for(const source of plan.sources){source.checked=true;source.kinds=source.kinds.map(()=> 'recitation');}
  const preview=splitAgentPlan(f.c,plan), layout=createCanonicalLayoutTemplate(f.c,preview);
  for(const entry of layout.rows)entry.checked=true;
  assert.throws(()=>compileCanonicalSplit(f.c,plan,layout),/separator|break/i);
});
