import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCorpus } from '../src/corpus.js';
import { intern } from '../src/editor.js';
import { ItemSchema } from '../src/schema.js';
import { sha256 } from '../src/text-ids.js';
import {
  assertAgentAssignment, createAgentPartitions, createAgentReviewTemplate, createAgentTemplate, createSplitInventory, exportAgentInput,
  splitAgentPlan, verifyAgentPartitions, verifyAgentPreview, verifyAgentReview,
} from '../src/split-agent.js';
import { auditAgentBatch } from '../src/split-agent-batch.js';

function fixture() {
  const c = loadCorpus(), item = 'test-agent-tool';
  const ar = 'AR a\u0301 one.\r\nAR two ﴿۱﴾!', fa = 'FA first. FA second.';
  const ref = intern(c, ar), faRef = intern(c, fa), audio = intern(c, 'Audio label');
  c.items.set(item, ItemSchema.parse({ legacy_id: null,
    title: { fa: c.items.get('dua-kumayl')!.title.fa, ar: null, en: null },
    category: 'other', tags: [], legacy_alignment: null,
    rows: [
      { id: 'row-one', ar: ref, fa: faRef },
      { id: 'row-two', ar: ref, fa: null, kind: 'note' },
      { id: 'row-audio', ar: null, fa: audio, kind: 'audio-reciter' },
    ],
  }));
  return { c, item, ar, fa };
}

function completedFixture() {
  const f = fixture(), plan = createAgentTemplate(f.c, f.item, 'agent-1');
  for (const source of plan.sources) {
    source.checked = true;
    source.kinds = source.kinds.map(() => source.row === 'row-audio' ? 'audio-reciter' : 'recitation');
  }
  const persian = plan.sources.find(source => source.row === 'row-one' && source.language === 'fa')!;
  persian.cuts = [Array.from('FA first. ').length]; persian.kinds = ['note', 'instruction'];
  return { ...f, plan };
}

test('Arabic/Persian export and full template cover every occurrence, including existing audio labels', () => {
  const { c, item, ar } = fixture();
  const exported = exportAgentInput(c, item), template = createAgentTemplate(c, item, 'agent-1');
  assert.equal(exported.rows.length, 3);
  assert.equal(exported.rows[0]!.ar!.text, ar);
  assert.deepEqual(exported.rows[0]!.ar!.breaks.map(x => x.break), ['CRLF']);
  assert.equal(exported.rows[2]!.kind, 'audio-reciter');
  assert.equal('english_documents' in exported, false);
  assert.equal('en' in exported.title, false);
  assert.deepEqual(template.sources.map(s => `${s.row}/${s.language}`), [
    'row-one/ar', 'row-one/fa', 'row-two/ar', 'row-audio/fa',
  ]);
  assert.ok(template.sources.every(s => s.checked === false));
  assert.deepEqual(template.sources[0]!.kinds, ['unknown', 'unknown']);
  assert.equal(template.item_sha256, exported.item_sha256);
  const preview = splitAgentPlan(c, template), report = verifyAgentPreview(c, preview);
  assert.equal(report.unchecked_source_count, 4);
  assert.equal(report.unknown_part_count, 6);
  assert.equal(report.ready_for_independent_review, false);
  assert.equal(report.status, 'structurally-verified-unreviewed');
});

test('splits preserve source order and text exactly, with newline separators outside text pieces', () => {
  const { c, item, ar, fa, plan } = completedFixture();
  const before = JSON.stringify(c.items.get(item));
  const preview = splitAgentPlan(c, plan), report = verifyAgentPreview(c, preview, 'agent-2');
  assert.equal(report.source_count, 4); assert.equal(report.unchecked_source_count, 0);
  assert.equal(report.ready_for_independent_review, true);
  assert.equal(report.reviewer, 'agent-2'); assert.equal(report.human_reviewed, false);
  assert.equal(report.preview_sha256, sha256(JSON.stringify(preview)));
  const first = preview.sources[0]!;
  assert.equal(first.parts.map(part => part.text).join(''), ar);
  assert.deepEqual(first.parts.filter(part => part.type === 'separator').map(part => part.text), ['\r\n']);
  assert.ok(first.parts.filter(part => part.type === 'text').every(part => !/[\r\n\u0085\u2028\u2029\v\f]/u.test(part.text)));
  assert.equal(preview.sources[1]!.parts.map(part => part.text).join(''), fa);
  assert.deepEqual(preview.sources[1]!.parts.filter(part => part.type === 'text').map(part => part.kind), ['note', 'instruction']);
  assert.equal(preview.sources[2]!.parts.map(part => part.text).join(''), ar); // same pooled text, distinct occurrence
  assert.equal(JSON.stringify(c.items.get(item)), before);
  assert.throws(() => verifyAgentPreview(c, preview, 'agent-1'), /author|own/i);
});

test('all physical separator kinds are represented losslessly and never hidden in text pieces', () => {
  const { c, item } = fixture();
  const row = c.items.get(item)!.rows[0]!;
  const original = 'a\nb\rc\r\nd\u0085e\u2028f\u2029g\vh\fi';
  row.ar = intern(c, original);
  const plan = createAgentTemplate(c, item, 'agent-1');
  const preview = splitAgentPlan(c, plan), source = preview.sources[0]!;
  assert.deepEqual(source.parts.filter(p => p.type === 'separator').map(p => p.break), ['LF','CR','CRLF','NEL','LS','PS','VT','FF']);
  assert.equal(source.parts.map(p => p.text).join(''), original);
  assert.equal(source.parts.filter(p => p.type === 'text').length, 9);
  assert.equal(verifyAgentPreview(c, preview).separator_count, 8 + 1); // shared second row has one CRLF
});

test('split plans reject missing, duplicated, unexpected or stale occurrences', () => {
  const { c, item, plan } = completedFixture();
  const missing = structuredClone(plan); missing.sources.pop();
  assert.throws(() => splitAgentPlan(c, missing), /missing|coverage/i);
  const duplicate = structuredClone(plan); duplicate.sources.push(structuredClone(duplicate.sources[0]!));
  assert.throws(() => splitAgentPlan(c, duplicate), /duplicate/i);
  const extra = structuredClone(plan); extra.sources[0]!.row = 'not-a-row';
  assert.throws(() => splitAgentPlan(c, extra), /unknown|unexpected|missing/i);
  const staleText = structuredClone(plan); staleText.sources[0]!.source_sha256 = '0'.repeat(64);
  assert.throws(() => splitAgentPlan(c, staleText), /hash|stale/i);
  const staleItem = structuredClone(plan); c.items.get(item)!.rows[0]!.kind = 'instruction';
  assert.throws(() => splitAgentPlan(c, staleItem), /item|fingerprint|stale/i);
  const english = structuredClone(plan) as unknown as { sources: Array<Record<string, unknown>> };
  english.sources[0]!.language = 'en';
  assert.throws(() => splitAgentPlan(c, english));
});

test('cuts require exact unique anchors, proper ordering and Unicode grapheme boundaries', () => {
  const { c, plan } = completedFixture();
  const mark = structuredClone(plan); mark.sources[0]!.cuts = [4]; // between a and its combining mark
  assert.throws(() => splitAgentPlan(c, mark), /grapheme/i);
  const crlf = structuredClone(plan), source = 'AR a\u0301 one.\r\nAR two ﴿۱﴾!';
  crlf.sources[0]!.cuts = [Array.from(source.slice(0, source.indexOf('\r'))).length + 1];
  assert.throws(() => splitAgentPlan(c, crlf), /grapheme|separator/i);
  const ambiguous = structuredClone(plan) as unknown as { sources: Array<Record<string, unknown>> };
  delete ambiguous.sources[0]!.cuts; ambiguous.sources[0]!.cut_after = ['AR'];
  assert.throws(() => splitAgentPlan(c, ambiguous), /ambiguous/i);
  const badKinds = structuredClone(plan); badKinds.sources[0]!.kinds = ['note'];
  assert.throws(() => splitAgentPlan(c, badKinds), /kind|piece/i);
});

test('independent verification rejects changed, dropped, duplicated or reordered results', () => {
  const { c, plan } = completedFixture(), preview = splitAgentPlan(c, plan);
  const changed = structuredClone(preview); changed.sources[0]!.parts[0]!.text += 'x';
  assert.throws(() => verifyAgentPreview(c, changed), /text|slice|reconstruct/i);
  const dropped = structuredClone(preview); dropped.sources[0]!.parts.pop();
  assert.throws(() => verifyAgentPreview(c, dropped), /coverage|end|reconstruct/i);
  const duplicated = structuredClone(preview); duplicated.sources.push(structuredClone(duplicated.sources[0]!));
  assert.throws(() => verifyAgentPreview(c, duplicated), /duplicate|coverage|order/i);
  const reordered = structuredClone(preview); [reordered.sources[0], reordered.sources[1]] = [reordered.sources[1]!, reordered.sources[0]!];
  assert.throws(() => verifyAgentPreview(c, reordered), /order/i);
  const wrongSeparator = structuredClone(preview);
  const separator = wrongSeparator.sources[0]!.parts.find(part => part.type === 'separator')!;
  separator.text = '\n'; assert.throws(() => verifyAgentPreview(c, wrongSeparator), /separator|text|slice/i);
});

test('punctuation suggestions are separate, pinned, unreviewed and cannot change other text', () => {
  const { c, fa, plan } = completedFixture();
  plan.punctuation_suggestions.push({ row: 'row-one', language: 'fa', source_sha256: sha256(fa),
    replacement: fa.replace('first.', 'first!'), reason: 'Proposed punctuation only.' });
  const preview = splitAgentPlan(c, plan), report = verifyAgentPreview(c, preview, 'agent-2');
  assert.equal(report.punctuation_suggestion_count, 1);
  assert.equal(preview.sources[1]!.parts.map(part => part.text).join(''), fa);
  const changedLetters = structuredClone(plan); changedLetters.punctuation_suggestions[0]!.replacement = fa.replace('first', 'FIRST');
  assert.throws(() => splitAgentPlan(c, changedLetters), /punctuation/i);
  const changedSpaces = structuredClone(plan); changedSpaces.punctuation_suggestions[0]!.replacement = fa.replace(' ', '  ');
  assert.throws(() => splitAgentPlan(c, changedSpaces), /punctuation/i);
  const changedMarker = structuredClone(plan); changedMarker.punctuation_suggestions[0] = {
    row: 'row-one', language: 'ar', source_sha256: plan.sources[0]!.source_sha256,
    replacement: 'AR a\u0301 one.\r\nAR two [۱]!', reason: 'Try to alter a protected verse marker.',
  };
  assert.throws(() => splitAgentPlan(c, changedMarker), /punctuation|marker/i);
});

test('six deterministic partitions cover all items once and rotate independent reviewers', () => {
  const { c, item } = fixture();
  const inventory = createSplitInventory(c), manifest = createAgentPartitions(c);
  assert.equal(inventory.item_count, c.items.size); assert.equal(manifest.groups.length, 6);
  assert.deepEqual(createAgentPartitions(c), manifest);
  const ids = manifest.groups.flatMap(group => group.items.map(entry => entry.item));
  assert.equal(ids.length, c.items.size); assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(item));
  assert.ok(manifest.groups.every(group => group.agent !== group.reviewer));
  assert.equal(verifyAgentPartitions(c, manifest).item_count, c.items.size);
  const assignment = manifest.groups.find(g => g.items.some(entry => entry.item === item))!;
  assert.doesNotThrow(() => assertAgentAssignment(c, manifest, item, assignment.agent, assignment.reviewer));
  assert.throws(() => assertAgentAssignment(c, manifest, item, assignment.reviewer, assignment.agent), /assignment|assigned/i);
  const duplicate = structuredClone(manifest); duplicate.groups[1]!.items.push(duplicate.groups[0]!.items[0]!);
  assert.throws(() => verifyAgentPartitions(c, duplicate), /duplicate|coverage|weight/i);
  c.items.get(item)!.rows[0]!.kind = 'instruction';
  assert.throws(() => verifyAgentPartitions(c, manifest), /stale|fingerprint|snapshot/i);
});

test('review templates require independent per-occurrence decisions and remain tied to the exact preview', () => {
  const { c, plan, fa } = completedFixture();
  plan.punctuation_suggestions.push({ row: 'row-one', language: 'fa', source_sha256: sha256(fa),
    replacement: fa.replace('first.', 'first!'), reason: 'A suggestion for independent review.' });
  plan.issues.push({ row: 'row-two', language: 'ar', kind: 'mixed-language', note: 'Needs later language decision.' });
  const preview = splitAgentPlan(c, plan);
  assert.throws(() => createAgentReviewTemplate(c, preview, plan.author), /own|author/i);
  const review = createAgentReviewTemplate(c, preview, 'agent-2');
  assert.equal(verifyAgentReview(c, preview, review).status, 'review-incomplete');
  for (const source of review.sources) { source.split = 'accept'; source.kind = 'accept'; }
  review.punctuation[0]!.decision = 'reject'; review.punctuation[0]!.note = 'Leave the existing punctuation.';
  review.issues[0]!.decision = 'escalate'; review.issues[0]!.note = 'Representation not decided.';
  const flagged = verifyAgentReview(c, preview, review);
  assert.equal(flagged.status, 'findings-require-adjudication');
  assert.equal(flagged.open_finding_count, 1); assert.equal(flagged.human_reviewed, false);
  const noNote = structuredClone(review); noNote.sources[0]!.split = 'revise'; noNote.sources[0]!.note = '';
  assert.throws(() => verifyAgentReview(c, preview, noNote), /note/i);
  const missing = structuredClone(review); missing.sources.pop();
  assert.throws(() => verifyAgentReview(c, preview, missing), /missing|coverage/i);
  const stale = structuredClone(preview); stale.sources[0]!.checked = false;
  assert.throws(() => verifyAgentReview(c, stale, review), /stale|preview/i);
  review.issues[0]!.decision = 'addressed'; review.issues[0]!.note = 'Confirmed as not mixed after inspection.';
  assert.equal(verifyAgentReview(c, preview, review).status, 'agent-review-records-complete');
});

test('old line-break and marker history is exposed and flagged without restoring old text', () => {
  const c = loadCorpus(), item = 'ziyarat-ashura';
  const exported = exportAgentInput(c, item);
  const field = exported.rows.find(row => row.id === 'r00003')!.ar!;
  assert.ok(field.historical_line_break_corrections.length > 0);
  assert.ok(field.historical_line_break_corrections.some(edit => edit.previous_breaks.length > 0));
  assert.ok(field.historical_line_break_corrections.some(edit => /[\r\n]/u.test(edit.previous_text)));
  assert.equal(field.breaks.length, 0); // current text has no restored historical separator
  const plan = createAgentTemplate(c, item, 'agent-1');
  assert.ok(plan.issues.some(issue => issue.row === 'r00003' && issue.language === 'ar' && issue.kind === 'historical-line-break'));
  const deletedFlag = structuredClone(plan);
  deletedFlag.issues = deletedFlag.issues.filter(issue => !(issue.row === 'r00003' && issue.language === 'ar' && issue.kind === 'historical-line-break'));
  assert.throws(() => splitAgentPlan(c, deletedFlag), /historical|history/i);
  const preview = splitAgentPlan(c, plan);
  const edit = c.editorial.row_corrections!.find(e => e.item === item && e.row === 'r00003' && e.language === 'ar')!;
  edit.reason += ' changed';
  assert.throws(() => verifyAgentPreview(c, preview), /fingerprint|stale/i);
  const markerExport = exportAgentInput(c, 'item-mqdmh');
  const outgoing = markerExport.rows.find(row => row.id === 'r00006')!.fa!;
  const incoming = markerExport.rows.find(row => row.id === 'r00007')!.fa!;
  assert.ok(outgoing.historical_marker_moves.some(move => move.direction === 'outgoing'));
  assert.ok(incoming.historical_marker_moves.some(move => move.direction === 'incoming'));
  const markerPlan = createAgentTemplate(c, 'item-mqdmh', 'agent-1');
  assert.ok(markerPlan.issues.some(issue => issue.row === 'r00006' && /marker movement/i.test(issue.note)));
});

test('Quran markers stay whole and punctuation changes have reversible exact offsets', () => {
  const { c, plan, ar } = completedFixture();
  const marker = structuredClone(plan);
  marker.sources[0]!.cuts = [Array.from(ar.slice(0, ar.indexOf('﴿'))).length + 1];
  assert.throws(() => splitAgentPlan(c, marker), /marker/i);
  plan.punctuation_suggestions.push({ row: 'row-one', language: 'ar', source_sha256: sha256(ar),
    replacement: ar.replace('one.', 'one!').replace('two ', 'two, '), reason: 'Two isolated punctuation proposals.' });
  const preview = splitAgentPlan(c, plan), changes = preview.punctuation_suggestions[0]!.changes;
  assert.deepEqual(changes.map(x => [x.before, x.after]), [['.', '!'], ['', ',']]);
  const edited = Array.from(ar);
  for (const change of [...changes].reverse()) edited.splice(change.start, change.end - change.start, ...Array.from(change.after));
  assert.equal(edited.join(''), preview.punctuation_suggestions[0]!.replacement);
  const damaged = structuredClone(preview); damaged.punctuation_suggestions[0]!.changes[0]!.after = '?';
  assert.throws(() => verifyAgentPreview(c, damaged), /punctuation/i);
});

test('batch audit detects missing, invalid, unfinished and independently completed work', t => {
  const { c, item, plan } = completedFixture(), manifest = createAgentPartitions(c);
  const group = manifest.groups.find(g => g.items.some(x => x.item === item))!;
  plan.author = group.agent;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-agent-batch-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const preview = splitAgentPlan(c, plan), review = createAgentReviewTemplate(c, preview, group.reviewer);
  const put = (agent: string, kind: string, value: unknown) => {
    const d = path.join(dir, agent, kind); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, `${item}.json`), JSON.stringify(value));
  };
  put(group.agent, 'plans', plan); put(group.agent, 'previews', preview); put(group.reviewer, 'reviews', review);
  const initial = auditAgentBatch(c, manifest, dir);
  assert.equal(initial.total_items, c.items.size); assert.equal(initial.incomplete_reviews, 1);
  assert.equal(initial.missing_items, c.items.size - 1); assert.equal(initial.complete_reviews, 0);
  for (const source of review.sources) { source.split = 'accept'; source.kind = 'accept'; }
  put(group.reviewer, 'reviews', review);
  const complete = auditAgentBatch(c, manifest, dir); assert.equal(complete.complete_reviews, 1);
  const outsider = manifest.groups.find(g => g.agent !== group.agent)!.agent;
  put(outsider, 'plans', plan);
  const extra = auditAgentBatch(c, manifest, dir);
  assert.equal(extra.unexpected_work_files.length, 1);
  assert.match(extra.unexpected_work_files[0]!, /plans/);
  fs.unlinkSync(path.join(dir, outsider, 'plans', `${item}.json`));
  const altered = structuredClone(preview); altered.sources[0]!.checked = false;
  put(group.agent, 'previews', altered);
  const invalid = auditAgentBatch(c, manifest, dir); assert.equal(invalid.invalid_items, 1);
  assert.equal(invalid.complete_reviews, 0);
});

test('CLI is non-destructive, checks review identity, and refuses overwrite or symlinked data output', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-agent-split-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/split-agent.ts', ...args],
    { cwd: process.cwd(), encoding: 'utf8' });
  const plan = path.join(dir, 'plan.json'), preview = path.join(dir, 'preview.json');
  const before = fs.readFileSync('data/items/dua-kumayl.json', 'utf8');
  const template = run('template', 'dua-kumayl', '--author', 'agent-1', '--output', plan);
  assert.equal(template.status, 0, template.stderr);
  const split = run('split', plan, '--output', preview); assert.equal(split.status, 0, split.stderr);
  const own = run('verify', preview, '--reviewer', 'agent-1'); assert.notEqual(own.status, 0);
  const review = run('verify', preview, '--reviewer', 'agent-2'); assert.equal(review.status, 0, review.stderr);
  const overwrite = run('template', 'dua-kumayl', '--author', 'agent-1', '--output', plan); assert.notEqual(overwrite.status, 0);
  const info = path.join(dir, 'tool-info.json');
  const toolInfo = run('tool-info', '--output', info); assert.equal(toolInfo.status, 0, toolInfo.stderr);
  const common = run('verify-tool-info', info); assert.equal(common.status, 0, common.stderr);
  const pinned = JSON.parse(fs.readFileSync(info, 'utf8')) as { node: string }; pinned.node = 'wrong-version';
  const staleInfo = path.join(dir, 'stale-tool-info.json'); fs.writeFileSync(staleInfo, JSON.stringify(pinned));
  const mismatch = run('verify-tool-info', staleInfo); assert.notEqual(mismatch.status, 0);
  const bad = path.join('data', 'agent-tool-should-not-write.json');
  const forbidden = run('inventory', '--output', bad); assert.notEqual(forbidden.status, 0); assert.ok(!fs.existsSync(bad));
  const link = path.join(dir, 'to-data'); fs.symlinkSync(path.resolve('data'), link, 'dir');
  const viaLink = run('inventory', '--output', path.join(link, 'agent-tool-should-not-write.json'));
  assert.notEqual(viaLink.status, 0); assert.ok(!fs.existsSync(bad));
  assert.equal(fs.readFileSync('data/items/dua-kumayl.json', 'utf8'), before);
});
