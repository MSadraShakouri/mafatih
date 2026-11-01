import test from 'node:test';
import assert from 'node:assert/strict';
import {isGeneratedRepositoryPath} from '../src/repository-policy.js';

test('repository policy flags generated indexes, databases, reports, builds and archives',()=>{
  for(const p of ['generated/web-data/search-index.json','reports/quran-comparison.json','dist/data/catalog.json','build/app.js','node_modules/zod/index.js','site/node_modules/a.js','web/.next/cache/x','generated\\corpus.sqlite','corpus.sqlite','archive.sqlite3','analysis.db','analysis.db-wal','x/search-index.json','app.apk','backup.tar.xz','backup.zip','a.tsbuildinfo'])
    assert.equal(isGeneratedRepositoryPath(p),true,p);
});
test('repository policy keeps canonical data, source code, documentation and tests trackable',()=>{
  for(const p of ['data/items/dua-kumayl.json','data/texts/00.json','data/editorial-history.json','src/search.ts','scripts/build-data.ts','docs/substantive-audit.md','tests/normalization.test.ts','package-lock.json'])
    assert.equal(isGeneratedRepositoryPath(p),false,p);
});
