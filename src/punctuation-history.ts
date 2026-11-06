import type { Corpus } from './corpus.js';
import { normalizeSearch } from './normalize.js';
import { normalizePunctuationSpacing } from './punctuation.js';
import type { PunctuationLocation } from './schema.js';

export function punctuationLocationKey(loc: PunctuationLocation): string {
  switch (loc.kind) {
    case 'item-title': return [loc.kind, loc.item, loc.language].join('\0');
    case 'item-tag': return [loc.kind, loc.item, loc.index].join('\0');
    case 'item-row': return [loc.kind, loc.item, loc.row, loc.language].join('\0');
    case 'english-display': return [loc.kind, loc.document, loc.language].join('\0');
    case 'english-metadata': return [loc.kind, loc.document, loc.field].join('\0');
    case 'english-paragraph': return [loc.kind, loc.document, loc.paragraph].join('\0');
    case 'navigation': return [loc.kind, ...loc.path].join('\0');
  }
}

function locationStillRecognizable(c: Corpus, loc: PunctuationLocation): boolean {
  switch (loc.kind) {
    case 'item-title': case 'item-tag': return c.items.has(loc.item);
    case 'item-row': return c.items.get(loc.item)?.rows.some(row => row.id === loc.row) ?? false;
    case 'english-display': case 'english-metadata': return c.english.has(loc.document);
    case 'english-paragraph': return Boolean(c.english.get(loc.document)?.paragraphs.some(p => p.id === loc.paragraph) ||
      c.editorial.paragraph_removals?.some(p => p.document === loc.document && p.paragraph === loc.paragraph));
    // Navigation paths are positions at the time of editing, not stable IDs.
    case 'navigation': return true;
  }
}

/** Validate exact reversible values; later legitimate content edits may change the current reference. */
export function validatePunctuationHistory(c: Corpus): string[] {
  const errors: string[] = [];
  for (const [batchIndex, batch] of (c.editorial.punctuation_normalizations ?? []).entries()) {
    const seen = new Set<string>();
    for (const edit of batch.changes) {
      const key = punctuationLocationKey(edit.location);
      const label = key.replaceAll('\0', '/');
      if (seen.has(key)) errors.push(`duplicate punctuation target in batch ${batchIndex}: ${label}`);
      seen.add(key);
      if (!locationStillRecognizable(c, edit.location)) errors.push(`punctuation history: missing occurrence ${label}`);
      const before = c.texts.get(edit.previous), after = c.texts.get(edit.replacement);
      // Generic corpus reference validation reports missing pooled IDs too.
      if (before === undefined || after === undefined || before === after ||
          normalizePunctuationSpacing(before) !== after || normalizeSearch(before) !== normalizeSearch(after)) {
        errors.push(`invalid punctuation history in batch ${batchIndex}: ${label}`);
      }
    }
  }
  return errors;
}
