import assert from 'node:assert/strict';
import test from 'node:test';
import { itemTitle, loadCorpus, text } from '../src/corpus.js';
import type { NavNode } from '../src/schema.js';
import type { Catalog, TocNode } from '../web/data.js';
import { topicForCategory, topicNodes, TOPICS, type TopicId, type TopicNode } from '../web/topic-navigation.js';

function runtimeCatalog(): Catalog {
  const c = loadCorpus();
  const node = (n: NavNode): TocNode => ({ title: text(c, n.title), item: n.item, children: n.children.map(node) });
  return {
    items: c.nav.default_order.map(id => ({ id, title: itemTitle(c, id), category: c.items.get(id)!.category, featured: c.nav.featured.includes(id) })),
    featured: c.nav.featured,
    toc: c.nav.toc.map(node),
  };
}
function all(nodes: TopicNode[]): TopicNode[] { return nodes.flatMap(n => [n, ...all(n.children)]); }
function sourceAt(toc: TocNode[], sourcePath: string): TocNode {
  let nodes = toc, found: TocNode | undefined;
  for (const part of sourcePath.split('.')) { found = nodes[Number(part)]; assert.ok(found); nodes = found.children; }
  return found!;
}

test('every real catalog item remains reachable through one provisional topic without altering TOC titles or IDs', () => {
  const catalog = runtimeCatalog();
  const found: string[] = [];
  for (const topic of TOPICS.filter(t => t.id !== 'featured')) {
    const roots = topicNodes(catalog, topic.id)!;
    assert.ok(roots.length, topic.id);
    for (const node of all(roots)) {
      if (node.sourcePath) {
        const original = sourceAt(catalog.toc, node.sourcePath);
        assert.equal(node.title, original.title);
        if (node.item) assert.equal(node.item, original.item);
      }
      if (node.item) {
        assert.equal(topicForCategory(catalog.items.find(i => i.id === node.item)!.category), topic.id);
        found.push(node.item);
      }
      if (node.children.length) {
        const screen = topicNodes(catalog, topic.id, node.sourcePath!);
        assert.ok(screen);
        if (node.item) assert.equal(screen[0]?.item, node.item);
      }
    }
  }
  assert.equal(found.length, catalog.items.length);
  assert.deepEqual(new Set(found), new Set(catalog.items.map(i => i.id)));
  assert.equal(new Set(found).size, found.length);
  const featured = topicNodes(catalog, 'featured')!;
  assert.deepEqual(featured.map(n => n.item), catalog.featured);
  assert.equal(topicNodes(catalog, 'dua', '999.2'), undefined);
});

test('mixed parent/items and unreferenced or unknown-category items are retained', () => {
  const catalog: Catalog = {
    items: [
      { id: 'parent', title: { fa: 'Parent', ar: '', en: '' }, category: 'dua', featured: false },
      { id: 'child', title: { fa: 'Child', ar: '', en: '' }, category: 'dua', featured: false },
      { id: 'unreferenced', title: { fa: 'Other', ar: '', en: '' }, category: 'new-category', featured: false },
    ],
    toc: [{ title: 'Source parent', item: 'parent', children: [{ title: 'Source child', item: 'child', children: [] }] }],
  };
  const roots = topicNodes(catalog, 'dua')!;
  assert.equal(roots[0]!.item, 'parent'); assert.equal(roots[0]!.children[0]!.item, 'child');
  const screen = topicNodes(catalog, 'dua', '0')!;
  assert.deepEqual(screen.map(x => x.item), ['parent', 'child']);
  assert.deepEqual(topicNodes(catalog, 'other')!.map(x => x.item), ['unreferenced']);
  assert.equal(topicForCategory(undefined), 'other');
  assert.equal(topicNodes(catalog, 'featured', '0'), undefined);
  for (const topic of TOPICS) assert.ok(topicNodes(catalog, topic.id as TopicId));
});
