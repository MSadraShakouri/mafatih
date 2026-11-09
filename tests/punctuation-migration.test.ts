import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus, type Corpus } from '../src/corpus.js';
import { EnglishDocumentSchema, ItemSchema, NavigationSchema } from '../src/schema.js';
import { textId } from '../src/text-ids.js';
import { applyPunctuationNormalization, planPunctuationNormalization } from '../src/punctuation-migration.js';

function fixture(): Corpus {
  const corpus = loadCorpus();
  corpus.texts = new Map(); corpus.textShards = new Map();
  const add = (value: string): string => {
    const id = textId(value); corpus.texts.set(id, value); corpus.textShards.set(id, id.slice(1, 3)); return id;
  };
  const ar = add('نَصّ  ، ب');
  const fa = add('می‌روم , فردا');
  const title = add('عنوان : اول');
  const english = add('One , two !');
  corpus.items = new Map([['sample', ItemSchema.parse({
    legacy_id: null, title: { ar: null, fa: title, en: null }, category: 'dua', tags: [title],
    legacy_alignment: null, rows: [{ id: 'r1', ar, fa }, { id: 'r2', ar, fa: null }],
  })]]);
  corpus.english = new Map([['sample-en', EnglishDocumentSchema.parse({
    source_metadata: { title: english, title_ar: null, section: null, chapter: null,
      translator_claim: null, origin_claim: null, method_claim: null, note_claim: null },
    display_title: { en: english, ar: null }, coverage: 'unknown', paragraphs: [{ id: 'p1', text: english }],
  })]]);
  corpus.nav = NavigationSchema.parse({ default_order: ['sample'], featured: [], toc: [{
    title, source_level: 1, source_page: null, source_page_series: null, item: 'sample', children: [],
  }] });
  corpus.alignments = new Map();
  corpus.claims = { c000000000000000000000000: ar }; // An unrelated historical claim shares this text.
  corpus.editorial = { evidence: {}, metadata_corrections: [] };
  return corpus;
}

test('plans all content occurrences and preserves shared original values and stable occurrence IDs', () => {
  const c = fixture();
  const originalRows = c.items.get('sample')!.rows.map(row => ({ ...row }));
  const claim = c.claims.c000000000000000000000000;
  const originalValues = new Map(c.texts);
  const plan = planPunctuationNormalization(c);
  assert.equal(plan.length, 9); // titles, tag, three row fields, three English fields, TOC
  assert.deepEqual(c.items.get('sample')!.rows, originalRows, 'planning does not modify content');
  const changed = applyPunctuationNormalization(c, plan, '2026-11-06');
  assert.deepEqual([...changed.files].sort(), ['editorial-history.json', 'english/sample-en.json', 'items/sample.json', 'navigation.json']);
  assert.deepEqual(c.items.get('sample')!.rows.map(row => row.id), ['r1', 'r2']);
  assert.deepEqual(c.english.get('sample-en')!.paragraphs.map(p => p.id), ['p1']);
  assert.equal(c.claims.c000000000000000000000000, claim);
  assert.equal(c.texts.get(claim!), 'نَصّ  ، ب');
  for (const edit of plan) {
    assert.ok(originalValues.has(edit.previous));
    assert.equal(c.texts.get(edit.previous), originalValues.get(edit.previous));
    assert.ok(c.texts.has(edit.replacement));
  }
  assert.deepEqual(c.editorial.punctuation_normalizations?.[0]?.changes, plan);
  assert.equal(planPunctuationNormalization(c).length, 0, 'applying twice is a no-op');
  assert.equal(c.items.get('sample')!.rows[0]!.ar, c.items.get('sample')!.rows[1]!.ar, 'shared corrected strings stay interned');
});

test('refuses changed reviewed rows, titles and English documents without altering data or review history', () => {
  for (const field of ['text', 'ar_fa', 'titles', 'english'] as const) {
    const c = fixture();
    const plan = planPunctuationNormalization(c);
    const before = structuredClone({ items: [...c.items], english: [...c.english], editorial: c.editorial, texts: [...c.texts] });
    const review = { reviewer: 'human', date: '2026-11-01' };
    if (field === 'english') c.english.get('sample-en')!.review = review;
    else c.items.get('sample')!.review = { [field]: review };
    const reviewed = structuredClone({ items: [...c.items], english: [...c.english], editorial: c.editorial, texts: [...c.texts] });
    assert.throws(() => applyPunctuationNormalization(c, plan, '2026-11-06'), /review/i);
    assert.deepEqual({ items: [...c.items], english: [...c.english], editorial: c.editorial, texts: [...c.texts] }, reviewed);
    assert.notDeepEqual(reviewed, before);
  }
});

test('refuses affected reviewed alignment spans before changing any occurrence', () => {
  const c = fixture(); const plan = planPunctuationNormalization(c);
  c.alignments.set('sample', { item: 'sample', groups: [{ id: 'g1', review: { reviewer: 'human', date: '2026-11-01' },
    method: 'manual', evidence: {}, ar: [{ row: 'r1', start: 0, end: 1, sha256: '0'.repeat(64) }], fa: [], en: [],
  }] });
  const before = structuredClone({ items: [...c.items], editorial: c.editorial, texts: [...c.texts], alignments: [...c.alignments] });
  assert.throws(() => applyPunctuationNormalization(c, plan, '2026-11-06'), /reviewed alignment/i);
  assert.deepEqual({ items: [...c.items], editorial: c.editorial, texts: [...c.texts], alignments: [...c.alignments] }, before);
});

test('refuses a reviewed English alignment even when the English document itself is unreviewed', () => {
  const c = fixture(); const plan = planPunctuationNormalization(c);
  c.alignments.set('sample', { item: 'sample', groups: [{ id: 'g1', review: { reviewer: 'human', date: '2026-11-01' },
    method: 'manual', evidence: {}, ar: [], fa: [{ row: 'r1', start: 0, end: 1, sha256: '0'.repeat(64) }],
    en: [{ document: 'sample-en', paragraph: 'p1', start: 0, end: 1, sha256: '0'.repeat(64) }],
  }] });
  const before = structuredClone({ items: [...c.items], english: [...c.english], editorial: c.editorial, texts: [...c.texts], alignments: [...c.alignments] });
  assert.throws(() => applyPunctuationNormalization(c, plan, '2026-11-06'), /reviewed alignment/i);
  assert.deepEqual({ items: [...c.items], english: [...c.english], editorial: c.editorial, texts: [...c.texts], alignments: [...c.alignments] }, before);
});

test('refuses duplicate targets and pooled text hash collisions before changing anything', () => {
  const duplicate = fixture(); const duplicatePlan = planPunctuationNormalization(duplicate);
  const duplicateBefore = structuredClone({ items: [...duplicate.items], editorial: duplicate.editorial, texts: [...duplicate.texts] });
  assert.throws(() => applyPunctuationNormalization(duplicate, [...duplicatePlan, duplicatePlan[0]!], '2026-11-06'), /duplicate/i);
  assert.deepEqual({ items: [...duplicate.items], editorial: duplicate.editorial, texts: [...duplicate.texts] }, duplicateBefore);
  const collision = fixture(); const collisionPlan = planPunctuationNormalization(collision);
  collision.texts.set(collisionPlan[0]!.replacement, 'a different existing string');
  const collisionBefore = structuredClone({ items: [...collision.items], editorial: collision.editorial, texts: [...collision.texts] });
  assert.throws(() => applyPunctuationNormalization(collision, collisionPlan, '2026-11-06'), /collision/i);
  assert.deepEqual({ items: [...collision.items], editorial: collision.editorial, texts: [...collision.texts] }, collisionBefore);
});

test('refuses stale plans and invalid dates before changing anything', () => {
  const c = fixture(); const plan = planPunctuationNormalization(c);
  c.items.get('sample')!.rows[0]!.ar = null;
  const before = structuredClone({ items: [...c.items], editorial: c.editorial, texts: [...c.texts] });
  assert.throws(() => applyPunctuationNormalization(c, plan, '2026-11-06'), /stale/i);
  assert.deepEqual({ items: [...c.items], editorial: c.editorial, texts: [...c.texts] }, before);
  const fresh = fixture(); const freshPlan = planPunctuationNormalization(fresh);
  assert.throws(() => applyPunctuationNormalization(fresh, freshPlan, '2026-02-30'), /date/i);
  assert.equal(fresh.editorial.punctuation_normalizations, undefined);
});
