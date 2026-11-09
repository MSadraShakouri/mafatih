import type { Corpus } from './corpus.js';
import { sourcePageIssues } from './schema.js';

/**
 * Check the internal evidence trail, not the accuracy of a source or a later
 * current TOC. Paths are historical positions and can move after an edit.
 */
export function validateSourcePageHistory(c: Corpus): string[] {
  const errors: string[] = [];
  for (const [batchIndex, batch] of (c.editorial.navigation_page_corrections ?? []).entries()) {
    if (!(batch.evidence in c.editorial.evidence)) errors.push(`page history: missing evidence in batch ${batchIndex}`);
    if (batch.method === 'heading-trailing-footers-v1' && (!batch.source_sha256 || !batch.date))
      errors.push(`page history: missing source fingerprint or date in batch ${batchIndex}`);
    const seen = new Set<string>();
    for (const change of batch.changes) {
      const key = change.path.join('/'), label = `batch ${batchIndex}, path ${key}`;
      if (seen.has(key)) errors.push(`page history: duplicate path in ${label}`);
      seen.add(key);
      if (change.item && !c.items.has(change.item)) errors.push(`page history: missing item in ${label}`);
      for (const message of sourcePageIssues({source_page:change.replacement.start,
        source_page_end:change.replacement.end,source_page_series:change.replacement.series}))
        errors.push(`page history: ${label}: ${message}`);
      const { observation: o, previous: before, replacement: after } = change;
      const priorHasEnd = Object.hasOwn(before, 'end'), replacementHasEnd = Object.hasOwn(after, 'end');
      const noMarkers = [o.heading,o.previous_footer,o.next_footer,o.last_text_footer,o.subtree_footer,o.descendant_max_end]
        .every(value => value === null);
      if (batch.method === 'legacy-unmapped-v1') {
        if (o.kind !== 'legacy-unmapped' || !noMarkers || after.start !== null || after.series !== null ||
            after.end != null || priorHasEnd !== replacementHasEnd)
          errors.push(`page history: invalid unqualified legacy pages in ${label}`);
        continue;
      }
      if (o.kind === 'legacy-unmapped') errors.push(`page history: wrong observation method in ${label}`);
      if (o.kind === 'not-in-edition') {
        if (!noMarkers) errors.push(`page history: unmatched heading has source markers in ${label}`);
      } else if (o.heading === null) errors.push(`page history: missing matched heading in ${label}`);
      if (o.kind !== 'source-heading') {
        if (after.start !== null || after.series !== null || after.end != null || priorHasEnd !== replacementHasEnd)
          errors.push(`page history: unsupported unknown-page replacement in ${label}`);
        continue;
      }
      if (o.next_footer === null || after.start !== o.next_footer)
        errors.push(`page history: start differs from following footer in ${label}`);
      if (priorHasEnd) {
        if (!replacementHasEnd || o.last_text_footer === null || after.end !== o.last_text_footer)
          errors.push(`page history: end differs from last-text footer in ${label}`);
      } else if (replacementHasEnd) {
        if (after.end == null || o.subtree_footer === null || after.end !== o.subtree_footer ||
            o.subtree_footer !== o.descendant_max_end)
          errors.push(`page history: inferred subtree end lacks agreeing evidence in ${label}`);
      }
    }
  }
  return errors;
}
