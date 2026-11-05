import type { SearchRequest, SearchSnapshot } from '../src/search.js';

export type SearchWorkerRequest =
  | { type: 'init'; indexUrl: string }
  | { type: 'search'; request: SearchRequest }
  | { type: 'cancel' };

export type SearchWorkerResponse =
  | { type: 'snapshot'; snapshot: SearchSnapshot }
  | { type: 'error'; id: number; message: string };
