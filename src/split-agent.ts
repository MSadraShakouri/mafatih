import { z } from 'zod';
import { text, type Corpus } from './corpus.js';
import { BreakKind, breakPositions } from './line-breaks.js';
import { Key, RowFieldsSchema, TextId } from './schema.js';
import { codePoints, sha256, slicePoints, textId } from './text-ids.js';

// These artifacts are proposals, not canonical edits or reviewed alignments.
// Bump the protocol if a change makes old plans or reviews incompatible.
export const SPLIT_AGENT_PROTOCOL = 'ar-fa-split-preflight-v1';
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Language = z.enum(['ar', 'fa']);
const Kind = RowFieldsSchema.shape.kind.unwrap();
const Agent = Key;
const MeaningfulNote = z.string().trim().min(1);
const Point = z.number().int().nonnegative();

const SourcePlan = z.object({
  row: Key, language: Language, source_sha256: Hash, checked: z.boolean(),
  cuts: z.array(z.number().int().positive()).optional(),
  cut_after: z.array(z.string().min(1)).optional(),
  kinds: z.array(Kind),
}).strict();
const PunctuationSuggestion = z.object({
  row: Key, language: Language, source_sha256: Hash,
  replacement: z.string(), reason: MeaningfulNote,
}).strict();
const Issue = z.object({
  row: Key, language: Language,
  kind: z.enum(['mixed-language', 'ambiguous-boundary', 'uncertain-classification', 'historical-line-break', 'historical-marker-move', 'other']),
  note: MeaningfulNote,
}).strict();
export const AgentPlanSchema = z.object({
  format_version: z.literal(1), protocol: z.literal(SPLIT_AGENT_PROTOCOL), item: Key,
  item_sha256: Hash, author: Agent, sources: z.array(SourcePlan),
  punctuation_suggestions: z.array(PunctuationSuggestion), issues: z.array(Issue),
}).strict();
export type AgentPlan = z.infer<typeof AgentPlanSchema>;

type Lang = z.infer<typeof Language>;
type Role = z.infer<typeof Kind>;
type IssueRecord = z.infer<typeof Issue>;
type PunctuationRecord = z.infer<typeof PunctuationSuggestion>;
type SourceRecord = { row: string; language: Lang; ref: string; value: string; hash: string; kind: Role };

const TextPart = z.object({
  type: z.literal('text'), part: Point, start: Point, end: Point,
  sha256: Hash, text: z.string(), kind: Kind,
}).strict();
const SeparatorPart = z.object({
  type: z.literal('separator'), start: Point, end: Point,
  sha256: Hash, text: z.string(), break: BreakKind,
}).strict();
const PreviewSource = z.object({
  row: Key, language: Language, source_ref: TextId, source_sha256: Hash,
  checked: z.boolean(), parts: z.array(z.discriminatedUnion('type', [TextPart, SeparatorPart])),
}).strict();
const PunctuationChange = z.object({ start: Point, end: Point, before: z.string(), after: z.string() }).strict();
const PreviewPunctuation = PunctuationSuggestion.extend({
  status: z.literal('proposed-unreviewed'), changes: z.array(PunctuationChange).min(1),
}).strict();
export const AgentPreviewSchema = z.object({
  format_version: z.literal(1), protocol: z.literal(SPLIT_AGENT_PROTOCOL), item: Key,
  item_sha256: Hash, author: Agent, plan_sha256: Hash,
  status: z.literal('proposed-unreviewed'), sources: z.array(PreviewSource),
  punctuation_suggestions: z.array(PreviewPunctuation), issues: z.array(Issue),
}).strict();
export type AgentPreview = z.infer<typeof AgentPreviewSchema>;
type PreviewPart = AgentPreview['sources'][number]['parts'][number];

const sortKey = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const sourceKey = (s: { row: string; language: Lang }): string => `${s.row}\0${s.language}`;
const label = (item: string, s: { row: string; language: Lang }): string => `${item}/${s.row}/${s.language}`;
const serialHash = (value: unknown): string => sha256(JSON.stringify(value));

/** Resolve every AR/FA field occurrence, not just unique pooled text IDs. */
function sourcesFor(c: Corpus, itemId: string): SourceRecord[] {
  const item = c.items.get(itemId);
  if (!item) throw new Error(`Unknown item ${itemId}`);
  const seen = new Set<string>(), result: SourceRecord[] = [];
  for (const row of item.rows) {
    if (seen.has(row.id)) throw new Error(`${itemId}: duplicate row ID ${row.id}`);
    seen.add(row.id);
    for (const language of ['ar', 'fa'] as const) {
      const ref = row[language];
      if (ref === null) continue;
      const value = text(c, ref);
      if (textId(value) !== ref) throw new Error(`${itemId}/${row.id}/${language}: text ID does not match content`);
      result.push({ row: row.id, language, ref, value, hash: sha256(value), kind: row.kind ?? 'unknown' });
    }
  }
  return result;
}

/** Includes ordered rows, source/review metadata, relevant history and exact AR/FA values. */
function itemFingerprint(c: Corpus, itemId: string, sources = sourcesFor(c, itemId)): string {
  const item = c.items.get(itemId);
  if (!item) throw new Error(`Unknown item ${itemId}`);
  const history = c.editorial;
  const punctuation = (history.punctuation_normalizations ?? []).flatMap(batch => {
    const changes = batch.changes.filter(change => change.location.kind === 'item-row' && change.location.item === itemId);
    return changes.length ? [{ rule: batch.rule, date: batch.date, changes }] : [];
  });
  return serialHash({ protocol: SPLIT_AGENT_PROTOCOL, item: itemId, item_record: item,
    source_occurrences: sources.map(s => [s.row, s.language, s.ref, s.hash]),
    history: { row_corrections: (history.row_corrections ?? []).filter(e => e.item === itemId),
      marker_moves: (history.line_break_marker_moves ?? []).filter(e => e.item === itemId),
      row_insertions: (history.row_insertions ?? []).filter(e => e.item === itemId),
      row_classifications: (history.row_classifications ?? []).filter(e => e.item === itemId),
      metadata_corrections: history.metadata_corrections.filter(e => e.item === itemId), punctuation },
    alignment: c.alignments.get(itemId) ?? null });
}

type HistoryHint = {
  historical_line_break_corrections: Array<{ previous_ref: string; previous_text: string; previous_sha256: string;
    previous_breaks: ReturnType<typeof breakPositions>; replacement_ref: string | null; evidence: string; reason: string }>;
  historical_marker_moves: Array<{ direction: 'incoming' | 'outgoing'; source_row: string; destination_row: string;
    marker: string; evidence: string; reason: string }>;
};
/** Old breaks are evidence for review, never automatically restored into current text. */
function historyHints(c: Corpus, itemId: string): Map<string, HistoryHint> {
  const hints = new Map<string, HistoryHint>();
  const at = (row: string, language: Lang): HistoryHint => {
    const key = sourceKey({ row, language });
    let hint = hints.get(key);
    if (!hint) { hint = { historical_line_break_corrections: [], historical_marker_moves: [] }; hints.set(key, hint); }
    return hint;
  };
  for (const edit of c.editorial.row_corrections ?? []) {
    if (edit.item !== itemId || edit.previous === null) continue;
    const previous = text(c, edit.previous), breaks = breakPositions(previous);
    if (breaks.length) at(edit.row, edit.language).historical_line_break_corrections.push({
      previous_ref: edit.previous, previous_text: previous, previous_sha256: sha256(previous), previous_breaks: breaks,
      replacement_ref: edit.replacement, evidence: edit.evidence, reason: edit.reason,
    });
  }
  for (const move of c.editorial.line_break_marker_moves ?? []) {
    if (move.item !== itemId) continue;
    for (const [row, direction] of [[move.source_row, 'outgoing'], [move.destination_row, 'incoming']] as const) {
      at(row, move.language).historical_marker_moves.push({ direction, source_row: move.source_row,
        destination_row: move.destination_row, marker: move.marker, evidence: move.evidence, reason: move.reason });
    }
  }
  return hints;
}

type ItemMeasure = {
  item: string; item_sha256: string; row_count: number; source_count: number;
  ar_code_points: number; fa_code_points: number; code_points: number; weight: number;
  manual_v1: boolean;
};
function measureItem(c: Corpus, itemId: string, sources = sourcesFor(c, itemId)): ItemMeasure {
  const item = c.items.get(itemId)!;
  let ar = 0, fa = 0;
  for (const s of sources) {
    if (s.language === 'ar') ar += codePoints(s.value).length;
    else fa += codePoints(s.value).length;
  }
  return { item: itemId, item_sha256: itemFingerprint(c, itemId, sources), row_count: item.rows.length,
    source_count: sources.length, ar_code_points: ar, fa_code_points: fa, code_points: ar + fa,
    // Deliberately simple proxy; the pilot must calibrate actual semantic effort.
    weight: ar + fa + 100 * sources.length + 300, manual_v1: item.legacy_alignment === 'manual-v1' };
}
function measureAll(c: Corpus): ItemMeasure[] {
  return [...c.items.keys()].sort(sortKey).map(id => measureItem(c, id));
}

/**
 * Pin all scoped item fingerprints and metadata that could change the review
 * context. This is not a rights, language, meaning or completeness certificate.
 */
function snapshotFingerprint(c: Corpus, items: ItemMeasure[]): string {
  return serialHash({ protocol: SPLIT_AGENT_PROTOCOL,
    items: items.map(i => [i.item, i.item_sha256]), sources: c.sources,
    editorial_history: c.editorial,
    alignments: [...c.alignments.entries()].sort(([a], [b]) => sortKey(a, b)),
  });
}

export function exportAgentInput(c: Corpus, itemId: string) {
  const item = c.items.get(itemId);
  if (!item) throw new Error(`Unknown item ${itemId}`);
  const sources = sourcesFor(c, itemId), byKey = new Map(sources.map(s => [sourceKey(s), s])), hints = historyHints(c, itemId);
  const field = (row: string, language: Lang) => {
    const s = byKey.get(sourceKey({ row, language }));
    return s ? { source_ref: s.ref, source_sha256: s.hash, text: s.value,
      code_points: codePoints(s.value).length, breaks: breakPositions(s.value),
      historical_line_break_corrections: hints.get(sourceKey(s))?.historical_line_break_corrections ?? [],
      historical_marker_moves: hints.get(sourceKey(s))?.historical_marker_moves ?? [] } : null;
  };
  return { format_version: 1 as const, protocol: SPLIT_AGENT_PROTOCOL, item: itemId,
    item_sha256: itemFingerprint(c, itemId, sources),
    title: { ar: text(c, item.title.ar), fa: text(c, item.title.fa) },
    category: item.category, legacy_alignment: item.legacy_alignment,
    item_sources: item.sources ?? null,
    rows: item.rows.map(row => ({ id: row.id, kind: row.kind ?? 'unknown', sources: row.sources ?? null,
      ar: field(row.id, 'ar'), fa: field(row.id, 'fa') })),
    warning: 'Existing Arabic/Persian only. Source fields may themselves contain mixed or mislabeled languages. No content, alignment, translation, rights or human review is certified.',
  };
}

const BREAK_TEXT: Record<z.infer<typeof BreakKind>, string> = {
  LF: '\n', CRLF: '\r\n', CR: '\r', NEL: '\u0085', LS: '\u2028', PS: '\u2029', VT: '\v', FF: '\f',
};
function graphemeBoundaries(value: string): Set<number> {
  const bounds = new Set<number>([0]); let n = 0;
  for (const { segment } of new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(value)) {
    n += codePoints(segment).length; bounds.add(n);
  }
  return bounds;
}
function markerRanges(value: string): Array<{ start: number; end: number; text: string }> {
  return [...value.matchAll(/﴿[^﴿﴾]*﴾/gu)].map(m => ({
    start: codePoints(value.slice(0, m.index)).length,
    end: codePoints(value.slice(0, m.index + m[0].length)).length,
    text: m[0],
  }));
}
function checkBoundary(value: string, at: number, bounds: Set<number>, where: string): void {
  if (!bounds.has(at)) throw new Error(`${where}: cut ${at} splits a Unicode grapheme or separator`);
  if (markerRanges(value).some(m => at > m.start && at < m.end)) {
    throw new Error(`${where}: cut ${at} divides a protected Quran marker`);
  }
}
function cutsFor(source: z.infer<typeof SourcePlan>, value: string, where: string): number[] {
  if (source.cuts !== undefined && source.cut_after !== undefined) {
    throw new Error(`${where}: choose cuts OR cut_after, not both`);
  }
  const cuts = source.cut_after?.map(quote => {
    const index = value.indexOf(quote);
    if (index < 0) throw new Error(`${where}: cut_after excerpt not found exactly`);
    if (value.indexOf(quote, index + 1) >= 0) throw new Error(`${where}: cut_after excerpt is ambiguous; use more context`);
    return codePoints(value.slice(0, index + quote.length)).length;
  }) ?? source.cuts ?? [];
  const bounds = graphemeBoundaries(value), n = codePoints(value).length; let previous = 0;
  for (const at of cuts) {
    if (at <= previous || at >= n) throw new Error(`${where}: cuts must be strictly increasing and inside the source`);
    checkBoundary(value, at, bounds, where); previous = at;
  }
  return cuts;
}

type Range = { start: number; end: number; break?: z.infer<typeof BreakKind> };
function ranges(value: string, cuts: number[], where: string): Range[] {
  const n = codePoints(value).length, boundaries = new Set([0, n, ...cuts]);
  const breaks = new Map<number, { end: number; kind: z.infer<typeof BreakKind> }>();
  const graphemes = graphemeBoundaries(value);
  for (const entry of breakPositions(value)) {
    const end = entry.offset + codePoints(BREAK_TEXT[entry.break]).length;
    checkBoundary(value, entry.offset, graphemes, where);
    checkBoundary(value, end, graphemes, where);
    boundaries.add(entry.offset); boundaries.add(end);
    breaks.set(entry.offset, { end, kind: entry.break });
  }
  const points = [...boundaries].sort((a, b) => a - b), out: Range[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!, end = points[i + 1]!, sep = breaks.get(start);
    if (sep && end !== sep.end) throw new Error(`${where}: a cut divides a physical separator`);
    out.push(sep ? { start, end, break: sep.kind } : { start, end });
  }
  return out;
}

function requiredHistoryIssues(c: Corpus, itemId: string, sources: SourceRecord[]): IssueRecord[] {
  const hints = historyHints(c, itemId), issues: IssueRecord[] = [];
  for (const source of sources) {
    const hint = hints.get(sourceKey(source));
    if (hint?.historical_line_break_corrections.length) issues.push({ row: source.row, language: source.language, kind: 'historical-line-break',
      note: 'Recorded earlier source value contains physical separators. Inspect the exported history and current context; do not silently restore old separators.' });
    if (hint?.historical_marker_moves.length) issues.push({ row: source.row, language: source.language, kind: 'historical-marker-move',
      note: 'Recorded historical marker movement affects this field. Inspect the exported movement and its neighboring row; do not silently move it again.' });
  }
  return issues;
}
export function createAgentTemplate(c: Corpus, itemId: string, author: string): AgentPlan {
  Agent.parse(author);
  const sources = sourcesFor(c, itemId);
  return { format_version: 1, protocol: SPLIT_AGENT_PROTOCOL, item: itemId,
    item_sha256: itemFingerprint(c, itemId, sources), author,
    sources: sources.map(s => ({ row: s.row, language: s.language, source_sha256: s.hash, checked: false,
      cuts: [], kinds: ranges(s.value, [], label(itemId, s)).filter(r => r.break === undefined).map(() => 'unknown') })),
    punctuation_suggestions: [], issues: requiredHistoryIssues(c, itemId, sources) };
}

/** Only Unicode punctuation may change; verse-marker brackets and contents are protected. */
function punctuationDiff(original: string, replacement: string, where: string) {
  const editable = (s: string): boolean => /\p{P}/u.test(s) && s !== '﴿' && s !== '﴾';
  const gaps = (value: string) => {
    const points = codePoints(value), fixed: string[] = [], sections: Array<{ start: number; end: number; text: string }> = [];
    let start = 0, current = '';
    points.forEach((p, i) => {
      if (editable(p)) current += p;
      else { sections.push({ start, end: i, text: current }); fixed.push(p); start = i + 1; current = ''; }
    });
    sections.push({ start, end: points.length, text: current });
    return { fixed, sections };
  };
  const before = gaps(original), after = gaps(replacement);
  if (before.fixed.join('') !== after.fixed.join('') ||
      JSON.stringify(markerRanges(original).map(x => x.text)) !== JSON.stringify(markerRanges(replacement).map(x => x.text))) {
    throw new Error(`${where}: punctuation suggestion changes protected wording, whitespace, markers or another non-punctuation character`);
  }
  const changes = before.sections.flatMap((gap, i) => gap.text === after.sections[i]!.text ? [] :
    [{ start: gap.start, end: gap.end, before: gap.text, after: after.sections[i]!.text }]);
  if (!changes.length) throw new Error(`${where}: punctuation suggestion does not change any punctuation`);
  // Verify that the generated occurrence-level edit log reproduces the full replacement.
  const reconstructed = codePoints(original);
  for (const change of [...changes].reverse()) reconstructed.splice(change.start, change.end - change.start, ...codePoints(change.after));
  if (reconstructed.join('') !== replacement) throw new Error(`${where}: punctuation edit reconstruction failed`);
  return changes;
}
function validateIssues(c: Corpus, item: string, issues: IssueRecord[], expected: Map<string, SourceRecord>): void {
  for (const issue of issues) if (!expected.has(sourceKey(issue))) throw new Error(`${label(item, issue)}: issue refers to an unexpected source`);
  for (const required of requiredHistoryIssues(c, item, [...expected.values()])) {
    if (!issues.some(issue => sourceKey(issue) === sourceKey(required) && issue.kind === required.kind)) {
      throw new Error(`${label(item, required)}: required historical review flag is missing`);
    }
  }
}
function checkedPunctuation(item: string, suggestions: PunctuationRecord[], expected: Map<string, SourceRecord>) {
  const seen = new Set<string>();
  return suggestions.map(s => {
    const key = sourceKey(s), source = expected.get(key), where = label(item, s);
    if (!source) throw new Error(`${where}: punctuation suggestion refers to an unexpected source`);
    if (seen.has(key)) throw new Error(`${where}: duplicate punctuation suggestion; combine edits for this occurrence`);
    seen.add(key);
    if (source.hash !== s.source_sha256) throw new Error(`${where}: punctuation source hash is stale`);
    return { ...s, status: 'proposed-unreviewed' as const, changes: punctuationDiff(source.value, s.replacement, where) };
  });
}
function checkCoverage<T extends { row: string; language: Lang }>(actual: T[], expected: SourceRecord[], item: string): void {
  const seen = new Set<string>(), known = new Set(expected.map(sourceKey));
  for (const s of actual) {
    const key = sourceKey(s);
    if (seen.has(key)) throw new Error(`${label(item, s)}: duplicate source occurrence`);
    if (!known.has(key)) throw new Error(`${label(item, s)}: unexpected source occurrence`);
    seen.add(key);
  }
  if (actual.length !== expected.length) throw new Error(`${item}: missing source occurrence; complete coverage is required`);
  actual.forEach((s, i) => {
    if (sourceKey(s) !== sourceKey(expected[i]!)) throw new Error(`${item}: source occurrence order differs from the item`);
  });
}

/** Compile a complete plan to exact, reversible proposed slices, without writing data/. */
export function splitAgentPlan(c: Corpus, input: unknown): AgentPreview {
  const plan = AgentPlanSchema.parse(input), expected = sourcesFor(c, plan.item);
  if (plan.item_sha256 !== itemFingerprint(c, plan.item, expected)) throw new Error(`${plan.item}: item fingerprint is stale`);
  checkCoverage(plan.sources, expected, plan.item);
  const byKey = new Map(expected.map(s => [sourceKey(s), s]));
  validateIssues(c, plan.item, plan.issues, byKey);
  const punctuation = checkedPunctuation(plan.item, plan.punctuation_suggestions, byKey);
  const sources = plan.sources.map((source, i) => {
    const s = expected[i]!, where = label(plan.item, s);
    if (source.source_sha256 !== s.hash) throw new Error(`${where}: source hash is stale`);
    const pieces = ranges(s.value, cutsFor(source, s.value, where), where);
    const textCount = pieces.filter(r => r.break === undefined).length;
    if (textCount !== source.kinds.length) throw new Error(`${where}: provide one kind for each of ${textCount} text pieces`);
    let number = 0;
    const parts: PreviewPart[] = pieces.map(r => {
      const partText = slicePoints(s.value, r.start, r.end);
      return r.break === undefined
        ? { type: 'text', part: number, start: r.start, end: r.end, sha256: sha256(partText), text: partText, kind: source.kinds[number++]! }
        : { type: 'separator', start: r.start, end: r.end, sha256: sha256(partText), text: partText, break: r.break };
    });
    if (parts.map(p => p.text).join('') !== s.value) throw new Error(`${where}: reconstruction failed`);
    return { row: s.row, language: s.language, source_ref: s.ref, source_sha256: s.hash, checked: source.checked, parts };
  });
  return { format_version: 1, protocol: SPLIT_AGENT_PROTOCOL, item: plan.item, item_sha256: plan.item_sha256,
    author: plan.author, plan_sha256: serialHash(input), status: 'proposed-unreviewed', sources,
    punctuation_suggestions: punctuation, issues: plan.issues };
}

/** Independent structural pass over the actual preview and its pinned corpus. */
export function verifyAgentPreview(c: Corpus, input: unknown, reviewer?: string) {
  const preview = AgentPreviewSchema.parse(input), expected = sourcesFor(c, preview.item);
  if (reviewer !== undefined) {
    Agent.parse(reviewer);
    if (reviewer === preview.author) throw new Error('An author cannot independently review their own preview');
  }
  if (preview.item_sha256 !== itemFingerprint(c, preview.item, expected)) throw new Error(`${preview.item}: item fingerprint is stale`);
  checkCoverage(preview.sources, expected, preview.item);
  const byKey = new Map(expected.map(s => [sourceKey(s), s]));
  validateIssues(c, preview.item, preview.issues, byKey);
  const suggestions = preview.punctuation_suggestions.map(({ status: _status, changes: _changes, ...s }) => s);
  const recalculated = checkedPunctuation(preview.item, suggestions, byKey);
  if (JSON.stringify(recalculated) !== JSON.stringify(preview.punctuation_suggestions)) {
    throw new Error(`${preview.item}: punctuation edit log does not match its source and replacement`);
  }
  let textPartCount = 0, separators = 0, unchecked = 0, unknown = 0, whitespaceOnly = 0, emptySources = 0;
  preview.sources.forEach((source, i) => {
    const s = expected[i]!, where = label(preview.item, s), points = codePoints(s.value), bounds = graphemeBoundaries(s.value);
    if (source.source_ref !== s.ref || source.source_sha256 !== s.hash) throw new Error(`${where}: source reference or hash is stale`);
    if (!source.checked) unchecked++;
    if (!points.length) emptySources++;
    let cursor = 0, partNumber = 0;
    const actualBreaks = new Map(breakPositions(s.value).map(b => [b.offset, b.break]));
    for (const part of source.parts) {
      if (part.start !== cursor || part.end <= part.start || part.end > points.length) {
        throw new Error(`${where}: segment coverage/order is invalid at ${part.start}`);
      }
      checkBoundary(s.value, part.start, bounds, where); checkBoundary(s.value, part.end, bounds, where);
      const value = points.slice(part.start, part.end).join('');
      if (part.text !== value || part.sha256 !== sha256(value)) throw new Error(`${where}: segment text/hash does not match source slice`);
      if (part.type === 'separator') {
        if (actualBreaks.get(part.start) !== part.break || part.text !== BREAK_TEXT[part.break]) {
          throw new Error(`${where}: separator type or text is incorrect`);
        }
        separators++;
      } else {
        if (part.part !== partNumber++) throw new Error(`${where}: text part order is incorrect`);
        if (breakPositions(part.text).length) throw new Error(`${where}: physical separator hidden inside text part`);
        if (part.kind === 'unknown') unknown++;
        if (!part.text.trim()) whitespaceOnly++;
        textPartCount++;
      }
      cursor = part.end;
    }
    if (cursor !== points.length || source.parts.map(p => p.text).join('') !== s.value) {
      throw new Error(`${where}: segment coverage or reconstruction does not reach source end`);
    }
  });
  return { format_version: 1 as const, protocol: SPLIT_AGENT_PROTOCOL,
    status: 'structurally-verified-unreviewed' as const, item: preview.item, item_sha256: preview.item_sha256,
    author: preview.author, reviewer: reviewer ?? null, preview_sha256: serialHash(input),
    source_count: preview.sources.length, text_part_count: textPartCount, separator_count: separators,
    unchecked_source_count: unchecked, unknown_part_count: unknown, whitespace_only_part_count: whitespaceOnly,
    empty_source_count: emptySources, issue_count: preview.issues.length,
    punctuation_suggestion_count: preview.punctuation_suggestions.length,
    ready_for_independent_review: unchecked === 0, human_reviewed: false as const,
    note: 'Structural checks only; checked flags and proposed kinds are agent assertions, not evidence of semantic, source, rights, translation or human review.' };
}

/** Summary of the current scoped corpus, not a claim that any item was reviewed. */
export function createSplitInventory(c: Corpus) {
  const items = measureAll(c), rowKinds: Record<string, number> = {}, breakKinds: Record<string, number> = {};
  const pool = new Map<string, { count: number; items: Set<string> }>();
  const lengths: number[] = [];
  let rows = 0, bilingual = 0, arOnly = 0, faOnly = 0, arSources = 0, faSources = 0;
  let breakOccurrences = 0, breakFields = 0, empty = 0, whitespace = 0;
  for (const measure of items) {
    const item = c.items.get(measure.item)!;
    for (const row of item.rows) {
      rows++; const kind = row.kind ?? 'unknown'; rowKinds[kind] = (rowKinds[kind] ?? 0) + 1;
      if (row.ar !== null && row.fa !== null) bilingual++;
      else if (row.ar !== null) arOnly++;
      else faOnly++;
    }
    for (const s of sourcesFor(c, measure.item)) {
      if (s.language === 'ar') arSources++; else faSources++;
      const n = codePoints(s.value).length; lengths.push(n);
      if (!n) empty++; else if (!s.value.trim()) whitespace++;
      const bs = breakPositions(s.value);
      if (bs.length) breakFields++;
      for (const b of bs) { breakOccurrences++; breakKinds[b.break] = (breakKinds[b.break] ?? 0) + 1; }
      const e = pool.get(s.ref) ?? { count: 0, items: new Set<string>() };
      e.count++; e.items.add(measure.item); pool.set(s.ref, e);
    }
  }
  lengths.sort((a, b) => a - b);
  const percentile = (p: number) => lengths.length ? lengths[Math.ceil(lengths.length * p) - 1]! : 0;
  const legacy = items.filter(i => i.manual_v1), sum = (values: ItemMeasure[], key: keyof ItemMeasure): number =>
    values.reduce((n, i) => n + (typeof i[key] === 'number' ? i[key] as number : 0), 0);
  const crossItem = [...pool.values()].filter(x => x.items.size > 1);
  const oldBreaks = (c.editorial.row_corrections ?? []).flatMap(edit => {
    if (edit.previous === null) return [];
    const breaks = breakPositions(text(c, edit.previous));
    return breaks.length ? [{ item: edit.item, row: edit.row, language: edit.language, count: breaks.length }] : [];
  });
  const moves = c.editorial.line_break_marker_moves ?? [];
  return { format_version: 1 as const, protocol: SPLIT_AGENT_PROTOCOL,
    snapshot_sha256: snapshotFingerprint(c, items), item_count: items.length, row_count: rows,
    source_count: arSources + faSources, language_sources: { ar: arSources, fa: faSources },
    row_languages: { bilingual, ar_only: arOnly, fa_only: faOnly }, row_kinds: rowKinds,
    code_points: { ar: sum(items, 'ar_code_points'), fa: sum(items, 'fa_code_points') },
    source_length_code_points: { p50: percentile(.50), p90: percentile(.90), p99: percentile(.99), max: lengths.at(-1) ?? 0 },
    physical_separators: { occurrences: breakOccurrences, fields: breakFields, kinds: breakKinds },
    historical_line_breaks: {
      correction_records_with_old_breaks: oldBreaks.length,
      distinct_fields_with_old_breaks: new Set(oldBreaks.map(e => `${e.item}\0${e.row}\0${e.language}`)).size,
      old_breaks_counted_across_records: oldBreaks.reduce((n, e) => n + e.count, 0),
      recorded_marker_moves: moves.length,
      marker_affected_fields: new Set(moves.flatMap(m => [
        `${m.item}\0${m.source_row}\0${m.language}`, `${m.item}\0${m.destination_row}\0${m.language}`,
      ])).size,
      caveat: 'History records can overlap; these counts do not prove original formatting intent or imply breaks should be restored.',
    },
    empty_sources: empty, whitespace_only_sources: whitespace,
    shared_pool: { unique_referenced_text_ids: pool.size,
      repeated_text_ids: [...pool.values()].filter(x => x.count > 1).length,
      text_ids_referenced_by_multiple_items: crossItem.length,
      occurrences_of_cross_item_text_ids: crossItem.reduce((n, x) => n + x.count, 0) },
    legacy_manual_v1: { items: legacy.length, rows: sum(legacy, 'row_count'), sources: sum(legacy, 'source_count'),
      caveat: 'Historical alignment assertion only, not proof that splitting or review is complete.' },
    largest_items_by_weight: [...items].sort((a, b) => b.weight - a.weight || sortKey(a.item, b.item)).slice(0, 12),
    caveat: 'Occurrences and characters are known; remaining semantic splitting and review effort are not automatically measurable.' };
}

const PartitionItem = z.object({
  item: Key, item_sha256: Hash, row_count: Point, source_count: Point, ar_code_points: Point,
  fa_code_points: Point, code_points: Point, weight: Point, manual_v1: z.boolean(),
}).strict();
const PartitionGroup = z.object({
  agent: Agent, reviewer: Agent, weight: Point, row_count: Point, source_count: Point,
  ar_code_points: Point, fa_code_points: Point, items: z.array(PartitionItem),
}).strict();
export const AgentPartitionsSchema = z.object({
  format_version: z.literal(1), protocol: z.literal(SPLIT_AGENT_PROTOCOL), snapshot_sha256: Hash,
  weight_formula: z.literal('AR+FA code points + 100 per source occurrence + 300 per item'),
  groups: z.array(PartitionGroup).length(6),
}).strict();
export type AgentPartitions = z.infer<typeof AgentPartitionsSchema>;

export function createAgentPartitions(c: Corpus): AgentPartitions {
  const all = measureAll(c), groups: AgentPartitions['groups'] = Array.from({ length: 6 }, (_, i) => ({
    agent: `agent-${i + 1}`, reviewer: `agent-${(i + 1) % 6 + 1}`,
    weight: 0, row_count: 0, source_count: 0, ar_code_points: 0, fa_code_points: 0, items: [],
  }));
  // Longest-processing-time-first; deterministic tie-breakers, no shared item.
  for (const item of [...all].sort((a, b) => b.weight - a.weight || sortKey(a.item, b.item))) {
    const target = [...groups].sort((a, b) => a.weight - b.weight || sortKey(a.agent, b.agent))[0]!;
    target.items.push(item); target.weight += item.weight; target.row_count += item.row_count;
    target.source_count += item.source_count; target.ar_code_points += item.ar_code_points; target.fa_code_points += item.fa_code_points;
  }
  for (const group of groups) group.items.sort((a, b) => sortKey(a.item, b.item));
  return { format_version: 1, protocol: SPLIT_AGENT_PROTOCOL, snapshot_sha256: snapshotFingerprint(c, all),
    weight_formula: 'AR+FA code points + 100 per source occurrence + 300 per item', groups };
}

/** Verify the manifest itself, its snapshot, assignments, weights and reviewer rotation. */
export function verifyAgentPartitions(c: Corpus, input: unknown) {
  const manifest = AgentPartitionsSchema.parse(input), all = measureAll(c), allById = new Map(all.map(i => [i.item, i]));
  if (manifest.snapshot_sha256 !== snapshotFingerprint(c, all)) throw new Error('Partition snapshot is stale; regenerate and redistribute assignments');
  const agents = new Set<string>(), reviewers = new Set<string>(), seen = new Set<string>();
  for (const group of manifest.groups) {
    if (agents.has(group.agent) || reviewers.has(group.reviewer)) throw new Error('Duplicate agent or reviewer in partitions');
    agents.add(group.agent); reviewers.add(group.reviewer);
    if (group.agent === group.reviewer) throw new Error(`${group.agent}: own partition cannot be independently reviewed`);
    let weight = 0, rows = 0, sources = 0, ar = 0, fa = 0;
    for (const entry of group.items) {
      if (seen.has(entry.item)) throw new Error(`Duplicate partition item ${entry.item}`);
      seen.add(entry.item);
      const expected = allById.get(entry.item);
      if (!expected) throw new Error(`Unexpected partition item ${entry.item}`);
      if (JSON.stringify(entry) !== JSON.stringify(expected)) throw new Error(`${entry.item}: partition fingerprint or weight is stale`);
      weight += entry.weight; rows += entry.row_count; sources += entry.source_count; ar += entry.ar_code_points; fa += entry.fa_code_points;
    }
    if (group.weight !== weight || group.row_count !== rows || group.source_count !== sources ||
        group.ar_code_points !== ar || group.fa_code_points !== fa) throw new Error(`${group.agent}: partition totals or weight are wrong`);
  }
  if (agents.size !== reviewers.size || [...agents].some(agent => !reviewers.has(agent))) throw new Error('Reviewers must be a rotation of the six agents');
  if (seen.size !== all.length) throw new Error('Missing item coverage in partitions');
  const weights = manifest.groups.map(g => g.weight);
  return { format_version: 1 as const, protocol: SPLIT_AGENT_PROTOCOL, status: 'valid-partitions' as const,
    snapshot_sha256: manifest.snapshot_sha256, item_count: all.length, group_count: manifest.groups.length,
    min_weight: Math.min(...weights), max_weight: Math.max(...weights),
    caveat: 'Weight is an estimate; inspect the pilot and individual item complexity before full assignment.' };
}

const SourceAssessment = z.object({
  row: Key, language: Language, split: z.enum(['pending', 'accept', 'revise', 'uncertain']),
  kind: z.enum(['pending', 'accept', 'revise', 'uncertain']), note: z.string(),
}).strict();
const PunctuationAssessment = z.object({
  index: Point, decision: z.enum(['pending', 'accept', 'reject', 'revise', 'uncertain']), note: z.string(),
}).strict();
const IssueAssessment = z.object({
  index: Point, decision: z.enum(['pending', 'addressed', 'escalate']), note: z.string(),
}).strict();
export const AgentReviewSchema = z.object({
  format_version: z.literal(1), protocol: z.literal(SPLIT_AGENT_PROTOCOL), item: Key, item_sha256: Hash,
  author: Agent, reviewer: Agent, preview_sha256: Hash,
  sources: z.array(SourceAssessment), punctuation: z.array(PunctuationAssessment), issues: z.array(IssueAssessment),
}).strict();
export type AgentReview = z.infer<typeof AgentReviewSchema>;

/** A different agent explicitly assesses every occurrence, punctuation proposal and flagged issue. */
export function createAgentReviewTemplate(c: Corpus, input: unknown, reviewer: string): AgentReview {
  const report = verifyAgentPreview(c, input, reviewer), preview = AgentPreviewSchema.parse(input);
  return { format_version: 1, protocol: SPLIT_AGENT_PROTOCOL, item: preview.item, item_sha256: preview.item_sha256,
    author: preview.author, reviewer, preview_sha256: report.preview_sha256,
    sources: preview.sources.map(s => ({ row: s.row, language: s.language, split: 'pending', kind: 'pending', note: '' })),
    punctuation: preview.punctuation_suggestions.map((_, index) => ({ index, decision: 'pending', note: '' })),
    issues: preview.issues.map((_, index) => ({ index, decision: 'pending', note: '' })) };
}

/** Checks the review record's coverage and identity, not the truth of its assertions. */
export function verifyAgentReview(c: Corpus, previewInput: unknown, reviewInput: unknown) {
  const review = AgentReviewSchema.parse(reviewInput), preview = AgentPreviewSchema.parse(previewInput);
  const structural = verifyAgentPreview(c, previewInput, review.reviewer);
  if (review.item !== preview.item || review.author !== preview.author || review.item_sha256 !== preview.item_sha256 ||
      review.preview_sha256 !== structural.preview_sha256) throw new Error('Review is stale or refers to a different preview, item or author');
  const expected = sourcesFor(c, preview.item); checkCoverage(review.sources, expected, preview.item);
  if (review.punctuation.length !== preview.punctuation_suggestions.length || review.issues.length !== preview.issues.length) {
    throw new Error('Review must cover each punctuation suggestion and issue');
  }
  let pending = 0, findings = 0;
  for (const assessment of review.sources) {
    if (assessment.split === 'pending') pending++;
    if (assessment.kind === 'pending') pending++;
    const problem = ['revise', 'uncertain'].includes(assessment.split) || ['revise', 'uncertain'].includes(assessment.kind);
    if (problem) { findings++; if (!assessment.note.trim()) throw new Error(`${label(preview.item, assessment)}: review finding needs a note`); }
  }
  review.punctuation.forEach((assessment, i) => {
    if (assessment.index !== i) throw new Error('Punctuation review coverage/order is wrong');
    if (assessment.decision === 'pending') pending++;
    if (['revise', 'uncertain'].includes(assessment.decision)) findings++;
    if (['reject', 'revise', 'uncertain'].includes(assessment.decision) && !assessment.note.trim()) {
      throw new Error('Punctuation decision needs a note');
    }
  });
  review.issues.forEach((assessment, i) => {
    if (assessment.index !== i) throw new Error('Issue review coverage/order is wrong');
    if (assessment.decision === 'pending') pending++;
    else if (!assessment.note.trim()) throw new Error('Issue disposition needs a note');
    if (assessment.decision === 'escalate') findings++;
  });
  const allRecorded = pending === 0 && structural.unchecked_source_count === 0;
  const ready = allRecorded && findings === 0 && structural.unknown_part_count === 0 && structural.empty_source_count === 0 && structural.whitespace_only_part_count === 0;
  return { format_version: 1 as const, protocol: SPLIT_AGENT_PROTOCOL,
    status: ready ? 'agent-review-records-complete' as const : allRecorded ? 'findings-require-adjudication' as const : 'review-incomplete' as const,
    item: review.item, author: review.author, reviewer: review.reviewer, preview_sha256: structural.preview_sha256,
    review_sha256: serialHash(reviewInput), pending_assessment_count: pending, open_finding_count: findings,
    unchecked_source_count: structural.unchecked_source_count, unknown_part_count: structural.unknown_part_count,
    empty_source_count: structural.empty_source_count, whitespace_only_part_count: structural.whitespace_only_part_count,
    human_reviewed: false as const,
    note: 'Coverage and identities are checked; recorded semantic decisions remain agent assertions, not human or scholarly approval.' };
}

/** Bind a plan/review to the verified manifest without trusting guessed IDs. */
export function assertAgentAssignment(c: Corpus, input: unknown, item: string, author: string, reviewer?: string): void {
  verifyAgentPartitions(c, input);
  const manifest = AgentPartitionsSchema.parse(input), group = manifest.groups.find(g => g.items.some(i => i.item === item));
  if (!group || group.agent !== author || (reviewer !== undefined && group.reviewer !== reviewer)) {
    throw new Error(`${item}: author or reviewer does not match its assigned partition`);
  }
}
