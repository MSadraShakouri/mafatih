import { loadCorpus, validateCorpus } from '../src/corpus.js';
try {
  const c=loadCorpus();const result=validateCorpus(c);
  for(const [k,v] of Object.entries(result.stats))console.log(`${k}: ${v}`);
  for(const w of result.warnings)console.warn('WARNING:',w);
  if(result.errors.length){ for(const e of result.errors)console.error('ERROR:',e); process.exitCode=1; }
  else console.log('STRUCTURAL VALIDATION PASS (not a content/rights approval).');
} catch(e){ console.error(e); process.exitCode=1; }
