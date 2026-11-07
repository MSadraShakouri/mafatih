import type { Catalog, CatalogItem, TocNode } from './data.js';

/** Navigation labels are provisional. They do not change canonical titles or IDs. */
export const TOPICS = [
  { id: 'dua', label: 'ادعیه' },
  { id: 'amal', label: 'اعمال' },
  { id: 'ziyarat', label: 'زیارات' },
  { id: 'namaz', label: 'نمازها و تعقیبات' },
  { id: 'quran', label: 'قرآن' },
  // Imported categories that cannot safely be assigned to the five topics
  // stay reachable here rather than being silently discarded or reclassified.
  { id: 'other', label: 'سایر مطالب' },
  { id: 'featured', label: 'فهرست منتخب' },
] as const;
export type TopicId = typeof TOPICS[number]['id'];
export type ContentTopic = Exclude<TopicId, 'featured'>;

export interface TopicNode {
  title: string;
  item: string | null;
  /** Path in the unchanged source TOC; null for an unreferenced catalog item. */
  sourcePath: string | null;
  children: TopicNode[];
}

export function isTopicId(value: string): value is TopicId {
  return TOPICS.some(topic => topic.id === value);
}

/** Use only existing imported metadata, and retain unknown categories. */
export function topicForCategory(category: string | undefined): ContentTopic {
  switch (category) {
    case 'dua': case 'monajat': case 'sahifa': return 'dua';
    case 'amal': return 'amal';
    case 'ziyarat': return 'ziyarat';
    case 'namaz': return 'namaz';
    case 'quran': return 'quran';
    default: return 'other';
  }
}

function fallbackTitle(item: CatalogItem): string {
  return item.title.fa || item.title.ar || item.title.en || item.id;
}

/**
 * Project the existing hierarchy, keeping all source ancestors and order.
 * A mixed node can contain its own item *and* child nodes; neither is dropped.
 */
function project(nodes: TocNode[], categories: Map<string, ContentTopic>, topic: ContentTopic, path: number[] = []): TopicNode[] {
  return nodes.flatMap((node, index) => {
    const location = [...path, index];
    const children = project(node.children, categories, topic, location);
    const item = node.item && categories.get(node.item) === topic ? node.item : null;
    return item || children.length ? [{ title: node.title, item, sourcePath: location.join('.'), children }] : [];
  });
}

// These are structural wrappers in the current imported hierarchy, not new
// names or classifications. Flattening them makes topic screens resemble the
// approved preview; if future data adds an item to one, it is never flattened.
const ROOT_WRAPPERS = new Set(['0', '0.3', '0.4', '0.4.1', '0.4.3', '0.5', '3', '4']);
function flattenWrappers(nodes: TopicNode[]): TopicNode[] {
  return nodes.flatMap(node => node.sourcePath && ROOT_WRAPPERS.has(node.sourcePath) && !node.item
    ? flattenWrappers(node.children) : [node]);
}

function walk(nodes: TopicNode[], visit: (node: TopicNode) => void): void {
  for (const node of nodes) { visit(node); walk(node.children, visit); }
}

function sourceItems(nodes: TocNode[], path: number[] = [], out = new Map<string, TopicNode>()): Map<string, TopicNode> {
  nodes.forEach((node, index) => {
    const location = [...path, index];
    if (node.item && !out.has(node.item)) out.set(node.item, {
      title: node.title, item: node.item, sourcePath: location.join('.'), children: [],
    });
    sourceItems(node.children, location, out);
  });
  return out;
}

/**
 * Return topic roots, or the children of a source node after drilling down.
 * Editorial featured entries deliberately reference the same stable item IDs.
 */
export function topicNodes(catalog: Catalog, topic: TopicId, sourcePath?: string): TopicNode[] | undefined {
  const entries = new Map(catalog.items.map(item => [item.id, item]));
  if (topic === 'featured') {
    if (sourcePath) return undefined;
    const source = sourceItems(catalog.toc);
    const order = catalog.featured ?? catalog.items.filter(item => item.featured).map(item => item.id);
    return order.flatMap(id => {
      const item = entries.get(id);
      if (!item) return [];
      return [source.get(id) ?? { title: fallbackTitle(item), item: id, sourcePath: null, children: [] }];
    });
  }
  const categories = new Map(catalog.items.map(item => [item.id, topicForCategory(item.category)]));
  const roots = project(catalog.toc, categories, topic);
  if (sourcePath) {
    if (!/^\d+(?:\.\d+)*$/.test(sourcePath)) return undefined;
    let found: TopicNode | undefined;
    walk(roots, node => { if (node.sourcePath === sourcePath) found = node; });
    if (!found) return undefined;
    const current: TopicNode = found;
    // A single source node can be both an item and a parent. Expose the item
    // itself before its children rather than silently losing it.
    const own = current.item ? [{ ...current, children: [] }] : [];
    return [...own, ...current.children];
  }
  const referenced = new Set<string>();
  walk(roots, node => { if (node.item) referenced.add(node.item); });
  const unreferenced = catalog.items.filter(item => categories.get(item.id) === topic && !referenced.has(item.id))
    .map(item => ({ title: fallbackTitle(item), item: item.id, sourcePath: null, children: [] }));
  return [...flattenWrappers(roots), ...unreferenced];
}

export function topicNodeTitle(catalog: Catalog, topic: TopicId, sourcePath: string): string | undefined {
  const entries = new Map(catalog.items.map(item => [item.id, topicForCategory(item.category)]));
  if (topic === 'featured') return undefined;
  let found: string | undefined;
  walk(project(catalog.toc, entries, topic), node => { if (node.sourcePath === sourcePath) found = node.title; });
  return found;
}
