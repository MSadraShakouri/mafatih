import assert from 'node:assert/strict';
import { text, type Corpus } from '../../src/corpus.js';
import { restoreCanonicalItem } from '../../src/split-canonical.js';
import type { Row } from '../../src/schema.js';

/** The row as it stood immediately before this round's reversible split. */
export function historicalRow(c: Corpus, item: string, row: string): Row {
  const entry = c.rowSplits.get(item)?.rows.find(value => value.original.id === row);
  const original = entry?.original ?? c.items.get(item)?.rows.find(value => value.id === row);
  assert.ok(original, `missing historical row ${item}/${row}`);
  return original;
}

/** Current output fields, in source order, for one historical occurrence. */
export function currentPieces(c: Corpus, item: string, row: string, language: 'ar' | 'fa') {
  const source = historicalRow(c, item, row);
  const entry = c.rowSplits.get(item)?.rows.find(value => value.original.id === row);
  const segments = entry ? entry[language] : source[language] === null ? [] : [{ row, language }];
  const current = c.items.get(item);
  assert.ok(current, `missing current item ${item}`);
  const pieces = segments.map(segment => {
    const target = current.rows.find(value => value.id === segment.row);
    assert.ok(target && target[segment.language] !== null, `missing mapped field ${item}/${segment.row}/${segment.language}`);
    return { row: target, language: segment.language, text: text(c, target[segment.language]) };
  });
  assert.equal(pieces.map(piece => piece.text).join(''), text(c, source[language]),
    `mapped pieces do not reconstruct ${item}/${row}/${language}`);
  return pieces;
}

/** An in-memory historical fixture for tests whose expected ranking or old
 * classification deliberately describes the pre-split source rows. Current
 * runtime/index tests must separately exercise c, not this reconstructed view. */
export function corpusBeforeRowSplits(c: Corpus): Corpus {
  const items = new Map([...c.items.keys()].map(id => [id, restoreCanonicalItem(c, id)]));
  return { ...c, items, rowSplits: new Map() };
}
