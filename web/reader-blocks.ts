import type { ItemRow } from './data.js';

/**
 * A small presentation seam around stable occurrences. It deliberately does
 * not infer alignment or classify an Arabic-empty row as an instruction.
 * Other block kinds can be added when the source data supports them.
 */
export type ReaderBlock =
  | { kind: 'row'; row: ItemRow }
  | { kind: 'instruction'; row: ItemRow };

export function readerBlocks(rows: readonly ItemRow[]): ReaderBlock[] {
  return rows.map(row => row.kind === 'instruction'
    ? { kind: 'instruction', row }
    : { kind: 'row', row });
}

export function readerTextRole(row: ItemRow, language: 'ar' | 'fa'): 'arabic' | 'translation' | 'explanation' {
  if (row.kind === 'instruction' || row.kind === 'note') return 'explanation';
  return language === 'ar' ? 'arabic' : 'translation';
}
