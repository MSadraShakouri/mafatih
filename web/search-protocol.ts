import { normalizeSearchQuery } from '../src/normalize.js';
import type { SearchRequest, SearchSnapshot } from '../src/search.js';
import type { ReaderItem } from './data.js';

/** Bound more expensive multi-position scoring more tightly between worker yields. */
export function searchBatchSize(query: string): number {
  return normalizeSearchQuery(query).split(' ').filter(Boolean).length === 1 ? 600 : 450;
}

export type SearchWorkerRequest =
  | { type: 'init'; indexUrl: string }
  | { type: 'prepare-item'; item: ReaderItem }
  | { type: 'search'; request: SearchRequest }
  | { type: 'cancel' };

export type SearchWorkerResponse =
  | { type: 'snapshot'; snapshot: SearchSnapshot }
  | { type: 'error'; id: number; message: string };
