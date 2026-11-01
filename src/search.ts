import { normalizeSearch, compactSearch } from './normalize.js';
export interface SearchEntry { item: string; fields: { title: string; ar: string; fa: string; en: string; tags: string }; }
export interface SearchHit { item: string; match: 'normalized' | 'compact'; }
/** Simple baseline; run in a worker/debounce if profiling warrants it. */
export function search(entries: SearchEntry[], query: string): SearchHit[] {
  const q=normalizeSearch(query); if (!q) return [];
  const compact=compactSearch(query); const out:SearchHit[]=[];
  for (const entry of entries) {
    const values=Object.values(entry.fields);
    if(values.some(v=>v.includes(q))) out.push({item:entry.item,match:'normalized'});
    else if (compact && values.some(v=>v.replace(/\s+/g,'').includes(compact))) out.push({item:entry.item,match:'compact'});
  }
  return out.sort((a,b)=>(a.match==='normalized'?0:1)-(b.match==='normalized'?0:1));
}
