import { normalizeSearch } from './normalize.js';
import { findOriginalMatches } from './search-text.js';

export type SearchLanguage = 'ar' | 'fa';
export type SearchSection = 'toc' | 'text';

/** A single source TOC title or a single Arabic/Persian row field. */
export interface SearchRecord {
  key: string;
  section: SearchSection;
  item: string | null;
  row?: string;
  language: SearchLanguage | 'toc';
  text: string;
  normalized: string;
  featured: boolean;
  order: number;
  /** Source TOC path; usable to reveal a heading that has no item. */
  tocPath?: string;
  context?: string;
}

export interface SearchIndex {
  version: 3;
  normalization: 'nfkd-search-v2';
  /** Small table-of-contents index arrives before the text shards. */
  records: SearchRecord[];
  shards: string[];
}

export interface SearchShard {
  version: 3;
  records: SearchRecord[];
}

export interface SearchHit {
  record: SearchRecord;
  /** Distinct normalized query words found in this one record. */
  matchedWords: string[];
  /** Direct normalized matches; used only after word count, featured and language. */
  directMatches: number;
}

export interface SearchSnapshot {
  id: number;
  complete: boolean;
  toc: SearchHit[];
  text: SearchHit[];
  tocTotal: number;
  textTotal: number;
}

export interface SearchRequest {
  id: number;
  query: string;
  languages: SearchLanguage[];
  item?: string;
  tocLimit: number;
  textLimit: number;
}

interface WordScan {
  word: string;
  cursor: number;
  matches: number[];
  spacedMatches: Set<number>;
  used: number;
}

/** Unique terms implement OR search; repetitions do not inflate relevance. */
export function searchWords(query: string): string[] {
  return [...new Set(normalizeSearch(query).split(' ').filter(Boolean))];
}

function matchKind(record: SearchRecord, word: string): 'direct' | 'spaced' | undefined {
  if (record.normalized.includes(word)) return 'direct';
  // Fast rejection before examining the actual source gaps. The shared
  // original-span matcher rejects unrelated partial words, punctuation, and
  // line breaks rather than joining every space in a row indiscriminately.
  if (word.length >= 3 && record.normalized.replace(/ /g, '').includes(word) &&
      findOriginalMatches(record.text, [word], 1).length) return 'spaced';
  return undefined;
}

/**
 * One engine for global and item-scoped search. Work is cached by normalized
 * word, independently of language and item filters. An unfinished word is
 * suspended when no current query needs it and resumes at the same cursor.
 */
export class IncrementalSearch {
  private readonly cache = new Map<string, WordScan>();
  private readonly records: SearchRecord[];
  private active: { request: SearchRequest; words: string[] } | undefined;
  private clock = 0;
  private loading: boolean;

  constructor(records: SearchRecord[], private readonly maxCachedWords = 32, moreRecordsComing = false) {
    this.records = [...records];
    this.loading = moreRecordsComing;
  }

  /** Appending shards preserves all existing per-word scan cursors and hits. */
  appendRecords(records: SearchRecord[]): void { this.records.push(...records); }
  finishLoading(): void { this.loading = false; }
  hasUnscannedRecords(): boolean {
    return Boolean(this.active?.words.some(word => this.cache.get(word)!.cursor < this.records.length));
  }

  begin(request: SearchRequest): SearchSnapshot {
    const words = searchWords(request.query);
    this.active = { request, words };
    for (const word of words) {
      let scan = this.cache.get(word);
      if (!scan) {
        scan = { word, cursor: 0, matches: [], spacedMatches: new Set(), used: 0 };
        this.cache.set(word, scan);
      }
      scan.used = ++this.clock;
    }
    this.trimCache(new Set(words));
    return this.snapshot();
  }

  /** Advance each needed word by up to `batchSize` individual records. */
  advance(batchSize = 500): SearchSnapshot {
    if (!Number.isInteger(batchSize) || batchSize <= 0) throw new Error('Invalid search batch size');
    if (!this.active) throw new Error('Start a search first');
    for (const word of this.active.words) {
      const scan = this.cache.get(word)!;
      const end = Math.min(this.records.length, scan.cursor + batchSize);
      for (; scan.cursor < end; scan.cursor += 1) {
        const kind = matchKind(this.records[scan.cursor]!, word);
        if (kind) {
          scan.matches.push(scan.cursor);
          if (kind === 'spaced') scan.spacedMatches.add(scan.cursor);
        }
      }
    }
    return this.snapshot();
  }

  /** Exposes progress for testing/diagnostics, without clearing or restarting it. */
  progress(word: string): { cursor: number; complete: boolean } | undefined {
    const scan = this.cache.get(word);
    return scan && { cursor: scan.cursor, complete: scan.cursor === this.records.length };
  }

  private trimCache(active: Set<string>): void {
    while (this.cache.size > this.maxCachedWords) {
      let oldest: WordScan | undefined;
      for (const scan of this.cache.values()) {
        if (!active.has(scan.word) && (!oldest || scan.used < oldest.used)) oldest = scan;
      }
      if (!oldest) break; // Never evict a word required by the active query.
      this.cache.delete(oldest.word);
    }
  }

  private snapshot(): SearchSnapshot {
    if (!this.active) throw new Error('Start a search first');
    const { request, words } = this.active;
    const languages = new Set(request.languages);
    const matched = new Map<number, { words: string[]; direct: number }>();
    for (const word of words) {
      const scan = this.cache.get(word)!;
      for (const index of scan.matches) {
        const record = this.records[index]!;
        if (request.item && record.item !== request.item) continue;
        if (record.section === 'text' && !languages.has(record.language as SearchLanguage)) continue;
        let existing = matched.get(index);
        if (!existing) { existing = { words: [], direct: 0 }; matched.set(index, existing); }
        existing.words.push(word);
        if (!scan.spacedMatches.has(index)) existing.direct += 1;
      }
    }
    const toc: SearchHit[] = [];
    const text: SearchHit[] = [];
    for (const [index, info] of matched) {
      const record = this.records[index]!;
      (record.section === 'toc' ? toc : text).push({ record, matchedWords: info.words, directMatches: info.direct });
    }
    // Sections never compete. Within each one, matched-word count comes
    // first, then featured status, then Arabic, then direct matches. Original
    // source order is the final tie-breaker.
    const compare = (a: SearchHit, b: SearchHit): number =>
      b.matchedWords.length - a.matchedWords.length ||
      Number(b.record.featured) - Number(a.record.featured) ||
      Number(b.record.language === 'ar') - Number(a.record.language === 'ar') ||
      b.directMatches - a.directMatches ||
      a.record.order - b.record.order;
    toc.sort(compare);
    text.sort(compare);
    return {
      id: request.id,
      complete: words.length === 0 || (!this.loading && words.every((word) => this.cache.get(word)!.cursor === this.records.length)),
      toc: toc.slice(0, Math.max(0, request.tocLimit)),
      text: text.slice(0, Math.max(0, request.textLimit)),
      tocTotal: toc.length,
      textTotal: text.length,
    };
  }
}
