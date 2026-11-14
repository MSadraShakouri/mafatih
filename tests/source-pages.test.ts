import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildData } from '../scripts/build-data.js';
import { loadCorpus, validateCorpus } from '../src/corpus.js';
import { NavNodeSchema } from '../src/schema.js';

// These fingerprints were calculated from the pre-migration navigation and
// the independently extracted source-marker audit, not from the corrected data.
const priorTocHash = '50427108a7940ebfb562e3710faf1582159482f116b442d7a60c74bc976c9031';
const priorPageLedgerHash = 'ff9fd1b74d55f82409ec53cb079e5e0e1d12da9e0faf392d3f5c145ea04c4322';
const sourceObservationsHash = '825046a0a74127579db822d35b51ec99226cef073c1905481c071094021fa1a0';
const comparedHtmlHash = '2b5222eb7c85b744c06b33faa53236e07db34be49cff246eb38b06627e5fe178';
const digest = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const has = (value: object, key: string): boolean => Object.hasOwn(value, key);

type Series = 'front-matter' | 'main' | null;
interface RawNode {
  title: string; source_level: number | null; source_page: number | null; source_page_end?: number | null;
  source_page_series?: Series; item: string | null; children: RawNode[];
}
interface RawNavigation { default_order: string[]; featured: string[]; toc: RawNode[] }
interface PageSnapshot { start: number | null; end?: number | null; series?: Series }
interface Observation {
  kind: string; heading: number | null; previous_footer: number | null; next_footer: number | null;
  last_text_footer: number | null; subtree_footer: number | null; descendant_max_end: number | null;
}
interface PageChange {
  path: number[]; title: string; item: string | null; source_level: number | null;
  previous: PageSnapshot; replacement: PageSnapshot; observation: Observation;
}
interface PageBatch {
  method: string; date: string | null; evidence: string; source_sha256: string | null; changes: PageChange[];
}
interface RawEditorial { evidence: Record<string, { url: string; description: string }>; navigation_page_corrections?: PageBatch[] }
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const navigation = (): RawNavigation => readJson<RawNavigation>('data/navigation.json');
const editorial = (): RawEditorial => readJson<RawEditorial>('data/editorial-history.json');
function flatten(nodes: RawNode[], parent: number[] = []): Array<{ path: number[]; node: RawNode }> {
  return nodes.flatMap((node, i) => [{ path: [...parent, i], node }, ...flatten(node.children, [...parent, i])]);
}
function at(nodes: RawNode[], indices: number[]): RawNode {
  let current = nodes; let node: RawNode | undefined;
  for (const index of indices) { node = current[index]; assert.ok(node, `missing path ${indices.join('/')}`); current = node.children; }
  assert.ok(node); return node;
}
function page(node: RawNode): PageSnapshot {
  return { start: node.source_page, ...(has(node, 'source_page_end') ? { end: node.source_page_end ?? null } : {}),
    series: node.source_page_series ?? null };
}
function auditedBatch(): PageBatch {
  const batches = editorial().navigation_page_corrections ?? [];
  const batch = batches.find(entry => entry.method === 'heading-trailing-footers-v1');
  assert.ok(batch, 'missing source-page correction history'); return batch;
}
function historicalToc(batch: PageBatch): RawNode[] {
  const roots: RawNode[] = [];
  for (const change of batch.changes) {
    const parent = change.path.slice(0, -1), position = change.path.at(-1)!;
    const siblings = parent.length ? at(roots, parent).children : roots;
    assert.equal(siblings.length, position, `invalid historical preorder ${change.path.join('/')}`);
    const node: RawNode = { title: change.title, source_level: change.source_level, source_page: change.previous.start,
      item: change.item, children: [] };
    if (has(change.previous, 'end')) node.source_page_end = change.previous.end ?? null;
    siblings.push(node);
  }
  return roots;
}
function withSignatures(nodes: RawNode[], ancestors: unknown[] = []): Array<{ node: RawNode; signature: string }> {
  return nodes.flatMap(node => {
    const identity = [node.title, node.source_level, node.item], chain = [...ancestors, identity];
    return [{ node, signature: JSON.stringify(chain) }, ...withSignatures(node.children, chain)];
  });
}
function currentNodesForHistory(nav: RawNavigation, batch: PageBatch): RawNode[] {
  const old = withSignatures(historicalToc(batch)), current = withSignatures(nav.toc);
  return batch.changes.map((change, i) => {
    const matchingPath = current.filter(entry => entry.signature === old[i]!.signature);
    const matchingItem = change.item ? current.filter(entry => entry.node.item === change.item) : [];
    const matchingIdentity = current.filter(entry => entry.node.title === change.title &&
      entry.node.source_level === change.source_level && entry.node.item === change.item);
    const match = matchingPath.length === 1 ? matchingPath[0] : matchingItem.length === 1 ? matchingItem[0] :
      matchingIdentity.length === 1 ? matchingIdentity[0] : undefined;
    assert.ok(match, `cannot identify historical page occurrence ${change.path.join('/')}`);
    return match.node;
  });
}

// Behavioral red/green: these are the actual corpus entries from the report.
test('the Yasin reset, front matter, and grouped page extents use the source numbering series', () => {
  const nav = navigation(); const nodes = flatten(nav.toc).map(x => x.node), corpus = loadCorpus();
  const byItem = (item: string): RawNode => { const found = nodes.find(node => node.item === item); assert.ok(found, item); return found; };
  const byTitle = (title: string): RawNode => { const found = nodes.filter(node => corpus.texts.get(node.title) === title);
    assert.equal(found.length, 1, title); return found[0]!; };
  assert.deepEqual(page(byItem('fazilat-svrhmbarkys')), { start: 1, end: 2, series: 'main' });
  assert.deepEqual(page(byItem('sura-yasin')), { start: 2, end: 9, series: 'main' });
  assert.deepEqual(page(byItem('item-fhrst')), { start: 1, end: 16, series: 'front-matter' });
  assert.deepEqual(page(byItem('item-mqdmh')), { start: 17, end: 20, series: 'front-matter' });
  assert.deepEqual(page(byTitle('سوره های قرآن در مفاتیح الجنان')), { start: 1, end: 34, series: 'main' });
  assert.deepEqual(page(byTitle('کتاب مفاتیح الجنان')), { start: 35, end: 1442, series: 'main' });
  assert.deepEqual(page(byTitle('باب اول: ادعیه')), { start: 36, end: 329, series: 'main' });
  assert.deepEqual(page(byItem('item-dvm-khtbh-ayd')), { start: 1396, end: 1403, series: 'main' });
});

test('unknown pages remain unknown, including explicit-null versus absent ends', () => {
  const nav = navigation(), nodes = flatten(nav.toc).map(x => x.node), batch = auditedBatch();
  const corpus = loadCorpus(), matched = currentNodesForHistory(nav, batch);
  assert.deepEqual(page(matched[0]!), { start: null, series: null }); // spans two series
  assert.deepEqual(page(nodes.find(n => n.item === 'item-mshkhsat-ktab')!), { start: null, end: null, series: null });
  assert.deepEqual(page(matched[740]!), { start: null, series: null }); // unpaginated colophon
  const added = batch.changes.flatMap((change, i) => change.observation.kind === 'not-in-edition' ? [matched[i]!] : []);
  assert.equal(added.length, 33);
  for (const node of added) {
    assert.equal(node.source_page, null); assert.equal(node.source_page_series, null);
    if (has(node, 'source_page_end')) assert.equal(node.source_page_end, null);
  }
  for (const title of ['هفتم:زیارت عاشورا', 'هشتم:زیارت اربعین']) {
    const node = nodes.find(n => corpus.texts.get(n.title) === title); assert.ok(node, title);
    assert.equal(node.source_page_series, 'main'); assert.equal(has(node, 'source_page_end'), false);
  }
  assert.equal(batch.changes.filter(change => change.replacement.start !== null).length, 738);
  assert.equal(batch.changes.filter(change => change.replacement.end != null).length, 736);
});

test('every corrected page and group extent has a pinned source observation and reversible prior value', () => {
  const nav = navigation(), batch = auditedBatch(), matched = currentNodesForHistory(nav, batch);
  assert.equal(batch.source_sha256, comparedHtmlHash); assert.equal(batch.date, '2026-11-01');
  assert.ok(editorial().evidence[batch.evidence]);
  assert.equal(batch.changes.length, 774);
  const priorLedger: unknown[] = [], observations: unknown[] = [];
  let headings = 0, inferredGroups = 0;
  for (const [i, change] of batch.changes.entries()) {
    const node = matched[i]!;
    assert.equal(has(node, 'source_page_series'), true, `missing series at ${change.path.join('/')}`);
    assert.deepEqual(page(node), change.replacement, `current values at ${change.path.join('/')}`);
    assert.equal(has(change.previous, 'series'), false, 'the old schema had no series field');
    const o = change.observation;
    priorLedger.push([change.path, change.title, change.source_level, change.item, change.previous.start,
      has(change.previous, 'end'), change.previous.end ?? null]);
    observations.push([o.kind, o.heading, o.previous_footer, o.next_footer, o.last_text_footer, o.subtree_footer, o.descendant_max_end]);
    if (o.kind === 'source-heading') {
      headings += 1; assert.ok(o.heading !== null); assert.equal(node.source_page, o.next_footer);
      assert.equal(node.source_page_series, o.heading <= 4 ? 'front-matter' : 'main');
      if (has(change.previous, 'end')) {
        assert.equal(node.source_page_end, o.last_text_footer);
      } else if (o.subtree_footer !== null) {
        inferredGroups += 1; assert.equal(node.source_page_end, o.subtree_footer);
        assert.equal(o.subtree_footer, o.descendant_max_end);
        const ends = batch.changes.filter(other => other.path.length > change.path.length &&
          change.path.every((part, index) => other.path[index] === part)).map(other => other.replacement.end)
          .filter((end): end is number => end != null);
        assert.ok(ends.length); assert.equal(Math.max(...ends), node.source_page_end);
      } else assert.equal(has(node, 'source_page_end'), false);
    }
  }
  assert.equal(headings, 738); assert.equal(inferredGroups, 82);
  assert.equal(digest(priorLedger), priorPageLedgerHash, 'all previous values, including absent ends, must be exact');
  assert.equal(digest(observations), sourceObservationsHash, 'the source marker observations must not drift');
  assert.equal(batch.changes[4]!.observation.previous_footer, 20);
  assert.equal(batch.changes[4]!.observation.next_footer, 1);
  assert.equal(batch.changes[5]!.observation.previous_footer, 20);
  assert.equal(batch.changes[5]!.observation.next_footer, 1);
  assert.equal(batch.changes.some(c => [c.observation.previous_footer, c.observation.next_footer,
    c.observation.last_text_footer, c.observation.subtree_footer].includes(1398)), false,
  'the compared HTML has no 1398 footer: do not silently assume it');
  assert.equal(batch.changes.some(c => c.observation.previous_footer === 1397 && c.observation.next_footer === 1399), false);
  assert.equal(batch.changes.some(c => [c.observation.last_text_footer, c.observation.subtree_footer].includes(1399)), false);

  // Reconstruct the original TOC from the historical paths and values alone.
  // This remains valid if future items are added or existing nodes move.
  assert.equal(digest(historicalToc(batch)), priorTocHash);
});

test('historical page checks tolerate unrelated new nodes and reordering', () => {
  const nav = structuredClone(navigation()), batch = auditedBatch(), root = nav.toc[0]!;
  root.children.reverse();
  root.children.unshift({ title: root.title, source_level: null, source_page: null, source_page_series: null, item: null, children: [] });
  nav.toc.unshift({ title: root.title, source_level: null, source_page: null, source_page_series: null, item: null, children: [] });
  const matched = currentNodesForHistory(nav, batch);
  assert.equal(matched.length, batch.changes.length);
  for (const [i, change] of batch.changes.entries()) assert.deepEqual(page(matched[i]!), change.replacement);
  assert.equal(digest(historicalToc(batch)), priorTocHash);
});

test('strict navigation schema rejects zero, reversed, orphaned and unqualified page ranges', () => {
  const valid = { title: `t${'a'.repeat(24)}`, source_level: 1, source_page: 2, source_page_end: 9,
    source_page_series: 'main', item: null, children: [] };
  assert.equal(NavNodeSchema.safeParse(valid).success, true);
  assert.equal(NavNodeSchema.safeParse({ ...valid, source_page: null, source_page_end: null, source_page_series: null }).success, true);
  assert.equal(NavNodeSchema.safeParse({ ...valid, source_page_end: undefined }).success, true);
  for (const patch of [
    { source_page: 0 }, { source_page: -1 }, { source_page: 1.5 }, { source_page_end: 0 },
    { source_page_end: 1 }, { source_page: null }, { source_page_series: null }, { source_page_series: 'unknown' },
  ]) assert.equal(NavNodeSchema.safeParse({ ...valid, ...patch }).success, false, JSON.stringify(patch));
  const noSeries = { ...valid } as Partial<typeof valid>; delete noSeries.source_page_series;
  assert.equal(NavNodeSchema.safeParse(noSeries).success, false);
});

test('validation treats invalid page metadata and broken page history as errors, not warnings', () => {
  const c = loadCorpus(); const n = c.nav.toc[0]!.children.find(node => node.item === 'item-fhrst')!;
  n.source_page = 0; n.source_page_end = 1;
  assert.ok(validateCorpus(c).errors.some(error => error.includes('source_page')));
  n.source_page = 9; n.source_page_end = 2;
  assert.ok(validateCorpus(c).errors.some(error => error.includes('source_page')));
  n.source_page = null; n.source_page_end = 2;
  assert.ok(validateCorpus(c).errors.some(error => error.includes('source_page')));
  const history = c.editorial as unknown as RawEditorial;
  const batch = history.navigation_page_corrections?.find(x => x.method === 'heading-trailing-footers-v1');
  assert.ok(batch); batch.evidence = 'nonexistent-evidence';
  assert.ok(validateCorpus(c).errors.some(error => error.includes('page history') && error.includes('evidence')));
  batch.changes.push(structuredClone(batch.changes[0]!));
  assert.ok(validateCorpus(c).errors.some(error => error.includes('page history') && error.includes('duplicate')));
});

test('resolved catalog and separate history retain every page series, value and witness', () => {
  let catalog = '', pageHistory = '';
  buildData({ includeSearch: false, includePageHistory: true, quiet: true, write: (name, value) => {
    if (name === 'catalog.json') catalog = value;
    if (name === 'navigation-page-history.json') pageHistory = value;
  } });
  assert.ok(catalog); const built = JSON.parse(catalog) as RawNavigation;
  const current = flatten(navigation().toc), output = flatten(built.toc);
  assert.equal(output.length, current.length);
  for (const [i, row] of current.entries()) {
    const actual = output[i]!.node;
    assert.equal(has(actual, 'source_page_series'), true);
    assert.deepEqual(page(actual), page(row.node), row.path.join('/'));
  }
  assert.ok(pageHistory, 'history must be available separately, without bloating the reader catalog');
  const original = editorial(), batches = original.navigation_page_corrections ?? [];
  const evidence = Object.fromEntries([...new Set(batches.map(batch => batch.evidence))].map(id => [id, original.evidence[id]]));
  assert.deepEqual(JSON.parse(pageHistory), { evidence, navigation_page_corrections: batches });
});

test('SQLite preserves current page fields, exact history, witnesses and range constraints', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-pages-sqlite-')); const db = path.join(temp, 'pages.sqlite');
  try {
    const result = spawnSync('python3', ['tools/export_sqlite.py'], { cwd: process.cwd(),
      env: { ...process.env, MAFATIH_SQLITE_OUT: db }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const probe = spawnSync('python3', ['-c', `
import json,sqlite3,sys
c=sqlite3.connect(sys.argv[1]);c.execute('PRAGMA foreign_keys=ON')
nodes=c.execute('''SELECT title_text_id,item_id,source_level,source_page,source_page_end,source_page_series,source_page_end_present
                    FROM navigation_node ORDER BY id''').fetchall()
batches=c.execute('SELECT position,method,edit_date,evidence_id,source_sha256 FROM navigation_page_batch ORDER BY position').fetchall()
changes=c.execute('''SELECT batch_position,position,path_json,title_text_id,item_id,source_level,
 previous_start,previous_end,previous_end_present,previous_series,previous_series_present,
 replacement_start,replacement_end,replacement_end_present,replacement_series,observation_kind,source_heading,
 previous_footer,next_footer,last_text_footer,subtree_footer,descendant_max_end
 FROM navigation_page_correction ORDER BY batch_position,position''').fetchall()
invalid=[(0,None,'main',0),(2,1,'main',1),(None,2,None,1),(1,None,None,0),(1,2,'main',0),(1,None,'bad',0)]
accepted=[]; title=nodes[0][0]
for i,(start,end,series,present) in enumerate(invalid):
 try:
  c.execute('''INSERT INTO navigation_node(id,parent_id,position,title_text_id,item_id,source_level,source_page,source_page_end,
               source_page_series,source_page_end_present) VALUES (?,?,?,?,?,?,?,?,?,?)''',(-1-i,None,99,title,None,1,start,end,series,present))
  accepted.append(i)
 except sqlite3.IntegrityError: pass
print(json.dumps({'nodes':nodes,'batches':batches,'changes':changes,'accepted':accepted,
 'version':c.execute('PRAGMA user_version').fetchone()[0], 'violations':c.execute('PRAGMA foreign_key_check').fetchall()}))
`, db], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    assert.equal(probe.status, 0, probe.stderr); const actual = JSON.parse(probe.stdout) as {
      nodes: unknown[][]; batches: unknown[][]; changes: unknown[][]; accepted: number[]; version: number; violations: unknown[] };
    assert.equal(actual.version, 4);
    const nodes = flatten(navigation().toc).map(({ node }) => [node.title, node.item, node.source_level, node.source_page,
      node.source_page_end ?? null, node.source_page_series ?? null, Number(has(node, 'source_page_end'))]);
    assert.deepEqual(actual.nodes, nodes); assert.deepEqual(actual.accepted, []); assert.deepEqual(actual.violations, []);
    const batches = editorial().navigation_page_corrections ?? [];
    assert.deepEqual(actual.batches, batches.map((batch, i) => [i, batch.method, batch.date, batch.evidence, batch.source_sha256]));
    const changes = batches.flatMap((batch, batchIndex) => batch.changes.map((change, i) => {
      const { previous: p, replacement: r, observation: o } = change;
      return [batchIndex, i, JSON.stringify(change.path), change.title, change.item, change.source_level,
        p.start, p.end ?? null, Number(has(p, 'end')), p.series ?? null, Number(has(p, 'series')),
        r.start, r.end ?? null, Number(has(r, 'end')), r.series ?? null, o.kind, o.heading,
        o.previous_footer, o.next_footer, o.last_text_footer, o.subtree_footer, o.descendant_max_end];
    }));
    assert.deepEqual(actual.changes, changes);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('legacy importer quarantines unqualified page numbers and preserves their exact raw values', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-pages-import-'));
  const src = path.join(temp, 'source'), dest = path.join(temp, 'data');
  try {
    fs.mkdirSync(path.join(src, 'items'), { recursive: true }); fs.mkdirSync(path.join(src, 'en'));
    const write = (name: string, value: unknown): void => { fs.writeFileSync(path.join(src, name), JSON.stringify(value)); };
    const item = { slug: 'sample', legacy_id: 'legacy-1', title: { fa: 'Sample', ar: null, en: null }, category: 'dua',
      featured: false, tags: [], align: null, en_id: null, rows: [{ ar: '', fa: 'Text' }] };
    const { rows: _rows, ...indexItem } = item;
    const oldToc = [
      { title: 'Sample', level: 1, page: 20, page_end: 1, item_id: 'sample', children: [] },
      { title: 'Unnumbered', level: 1, page: 0, item_id: null, children: [] },
      { title: 'Unknown', level: 1, page: null, page_end: null, item_id: null, children: [] },
    ];
    write('index.json', { items: [{ ...indexItem, rows_count: 1 }], en: [], stars: [], toc: oldToc });
    write('EN_PROVENANCE.json', { en_blocks: [] }); write('manifest.json', { built: 'legacy' });
    write('items/sample.json', item); fs.writeFileSync(path.join(src, 'CREDITS.md'), 'Legacy credits\n');
    const result = spawnSync('python3', ['tools/import_legacy.py', '--source', src, '--destination', dest, '--commit', 'a'.repeat(40)],
      { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /ROUND-TRIP PASS/);
    const raw = readJson<RawNavigation>(path.join(dest, 'navigation.json'));
    assert.deepEqual(raw.toc.map(page), [{ start: null, end: null, series: null }, { start: null, series: null },
      { start: null, end: null, series: null }]);
    const c = loadCorpus(dest); assert.deepEqual(validateCorpus(c).errors, []);
    const history = readJson<RawEditorial>(path.join(dest, 'editorial-history.json'));
    const batch = history.navigation_page_corrections?.find(x => x.method === 'legacy-unmapped-v1'); assert.ok(batch);
    assert.ok(history.evidence[batch.evidence]);
    assert.deepEqual(batch.changes.map(change => change.previous), [{ start: 20, end: 1 }, { start: 0 }, { start: null, end: null }]);
    assert.deepEqual(batch.changes.map(change => change.observation.kind), ['legacy-unmapped', 'legacy-unmapped', 'legacy-unmapped']);
    const db = path.join(temp, 'imported.sqlite');
    const exported = spawnSync('python3', ['tools/export_sqlite.py'], { cwd: process.cwd(), encoding: 'utf8',
      env: { ...process.env, MAFATIH_DATA_ROOT: dest, MAFATIH_SQLITE_OUT: db } });
    assert.equal(exported.status, 0, exported.stderr);
    const probe = spawnSync('python3', ['-c', `
import json,sqlite3,sys
c=sqlite3.connect(sys.argv[1]); print(json.dumps({'pages':c.execute('''SELECT previous_start,previous_end,previous_end_present,
 replacement_start,replacement_end,replacement_end_present,observation_kind FROM navigation_page_correction ORDER BY position''').fetchall(),
 'violations':c.execute('PRAGMA foreign_key_check').fetchall()}))
`, db], { encoding: 'utf8' });
    assert.equal(probe.status, 0, probe.stderr);
    assert.deepEqual(JSON.parse(probe.stdout), { pages: [[20, 1, 1, null, null, 1, 'legacy-unmapped'],
      [0, null, 0, null, null, 0, 'legacy-unmapped'], [null, null, 1, null, null, 1, 'legacy-unmapped']], violations: [] });
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('independent HTML extraction respects trailing footers, the reset and missing markers', () => {
  const html = `<h1>Book</h1><h2>Index</h2>
    <p class="content_paragraph"><span>Front matter</span></p><p class="content_paragraph"><span>ص: 20</span></p>
    <h2>Quran</h2><h3>Virtue</h3><p class="content_paragraph">Body</p>
    <p class="content_paragraph"><span>ص: 1</span></p><p class="content_paragraph">صوت</p><p class="content_paragraph">***</p>
    <h3>Surah</h3><p class="content_paragraph">Body</p><p class="content_paragraph"><span>ص: 2</span></p>
    <h3>Uncertain</h3><p class="content_paragraph">Body</p><p class="content_paragraph"><span>ص: 4</span></p>`;
  const result = spawnSync('python3', ['-c', `
import json,sys
from tools.verify_source_pages import observe_headings, unambiguous_pair
heads,markers,paras=observe_headings(sys.stdin.read())
print(json.dumps({'heads':[[h['title'],h['level'],h['previous_footer'],h['next_footer'],h['last_text_footer']] for h in heads],
 'markers':[value for _,value in markers], 'reset':unambiguous_pair(20,1), 'gap':unambiguous_pair(2,4)}))
`], { cwd: process.cwd(), input: html, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { heads: [
    ['Book', 1, null, 20, null], ['Index', 2, null, 20, 20], ['Quran', 2, 20, 1, null],
    ['Virtue', 3, 20, 1, 1], ['Surah', 3, 1, 2, 2], ['Uncertain', 3, 2, 4, 4],
  ], markers: [20, 1, 2, 4], reset: true, gap: false });
});

test('source verifier rejects a changed snapshot and a matching-hash snapshot with an ambiguous page gap', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mafatih-source-proof-'));
  try {
    const root = path.join(temp, 'data'), texts = path.join(root, 'texts'), htmlFile = path.join(temp, 'source.html');
    fs.mkdirSync(texts, { recursive: true });
    const source = `<h1>Book</h1><h2>Index</h2><p class="content_paragraph">Front</p>
      <p class="content_paragraph"><span>ص: 20</span></p><h2>Quran</h2><h3>Virtue</h3>
      <p class="content_paragraph">Body</p><p class="content_paragraph"><span>ص: 1</span></p>
      <h3>Surah</h3><p class="content_paragraph">Body</p><p class="content_paragraph"><span>ص: 2</span></p>`;
    const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
    const ids = Object.fromEntries(['Book', 'Index', 'Quran', 'Virtue', 'Surah'].map(value => [`t${hash(value).slice(0, 24)}`, value]));
    const tid = (value: string): string => `t${hash(value).slice(0, 24)}`;
    fs.writeFileSync(path.join(texts, 'fixture.json'), JSON.stringify(ids));
    const observed = (kind: string, heading: number, previous: number | null, next: number | null,
      last: number | null, subtree: number | null = null): Observation => ({ kind, heading, previous_footer: previous,
      next_footer: next, last_text_footer: last, subtree_footer: subtree, descendant_max_end: subtree });
    const changes = [
      { path: [0], title: tid('Book'), source_level: 1, observation: observed('mixed-series-root', 1, null, 20, null) },
      { path: [0, 0], title: tid('Index'), source_level: 2, observation: observed('source-heading', 2, null, 20, 20) },
      { path: [0, 1], title: tid('Quran'), source_level: 2, observation: observed('source-heading', 3, 20, 1, null, 2) },
      { path: [0, 1, 0], title: tid('Virtue'), source_level: 3, observation: observed('source-heading', 4, 20, 1, 1) },
      { path: [0, 1, 1], title: tid('Surah'), source_level: 3, observation: observed('source-heading', 5, 1, 2, 2) },
    ];
    const batch = { method: 'heading-trailing-footers-v1', source_sha256: hash(source), changes };
    const historyFile = path.join(root, 'editorial-history.json');
    const writeHistory = (): void => fs.writeFileSync(historyFile, JSON.stringify({ navigation_page_corrections: [batch] }));
    fs.writeFileSync(htmlFile, source); writeHistory();
    const run = () => spawnSync('python3', ['tools/verify_source_pages.py', htmlFile, '--data-root', root],
      { cwd: process.cwd(), encoding: 'utf8' });
    const valid = run(); assert.equal(valid.status, 0, valid.stderr); assert.match(valid.stdout, /5 matching headings/);
    const gap = source.replace('ص: 2</span>', 'ص: 4</span>'); fs.writeFileSync(htmlFile, gap);
    const changed = run(); assert.notEqual(changed.status, 0); assert.match(changed.stderr, /SHA-256 differs/);
    batch.source_sha256 = hash(gap); changes[4]!.observation.next_footer = 4; changes[4]!.observation.last_text_footer = 4;
    changes[2]!.observation.subtree_footer = 4; changes[2]!.observation.descendant_max_end = 4; writeHistory();
    const ambiguous = run(); assert.notEqual(ambiguous.status, 0); assert.match(ambiguous.stderr, /ambiguous footer/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('the default runtime build does not expose editorial page history', () => {
  const files = new Set<string>();
  buildData({ includeSearch: false, quiet: true, write: name => files.add(name) });
  assert.ok(files.has('catalog.json'));
  assert.equal(files.has('navigation-page-history.json'), false);
  assert.throws(() => buildData({ includePageHistory: true }), /explicit local-analysis output sink/);
});
