import assert from 'node:assert/strict';
import test from 'node:test';
import * as reader from '../web/text-offset.js';
import * as search from '../src/search-text.js';

test('reader offsets agree with the separately retained search engine, including astral text', () => {
  for (const text of ['', 'سلام', 'a😀ب🕊️z', '\u200cاَللّٰه']) {
    for (let offset = -1; offset <= text.length + 3; offset++) {
      assert.equal(reader.codePointToUtf16Offset(text, offset), search.codePointToUtf16Offset(text, offset));
      assert.equal(reader.utf16ToCodePointOffset(text, offset), search.utf16ToCodePointOffset(text, offset));
    }
  }
});
