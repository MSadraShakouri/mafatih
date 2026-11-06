import fs from 'node:fs';
import path from 'node:path';
import { loadCorpus, text } from '../src/corpus.js';
import { compareLineBreaks, LineBreakExceptionFile, lineBreakKey, scanLineBreaks, type Occurrence } from '../src/line-breaks.js';

try {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--list' && arg !== '--json') || (args.includes('--list') && args.includes('--json'))) {
    throw new Error('Usage: npm run check:line-breaks -- [--list | --json]');
  }
  const c = loadCorpus();
  const exceptionFile = path.join(c.root, 'line-break-exceptions.json');
  const manifest = LineBreakExceptionFile.parse(JSON.parse(fs.readFileSync(exceptionFile, 'utf8')) as unknown);
  const actual = scanLineBreaks(c);
  const result = compareLineBreaks(actual, manifest.exceptions);
  const exceptions = new Map(manifest.exceptions.map(entry => [lineBreakKey(entry), entry]));
  const context = (entry: Occurrence): string => {
    const points = Array.from(text(c, entry.text));
    return points.slice(Math.max(0, entry.offset - 28), Math.min(points.length, entry.offset + 30)).join('');
  };
  const problems = result.unexpected.length + result.stale.length + result.duplicates.length;
  if (args.includes('--json')) {
    console.log(JSON.stringify({
      breaks: actual.map(entry => ({ ...entry, context: context(entry), exception: exceptions.get(lineBreakKey(entry)) ?? null })),
      ...result,
    }, null, 2));
  } else {
    if (args.includes('--list')) {
      for (const entry of actual) {
        const exception = exceptions.get(lineBreakKey(entry));
        console.log(`${entry.location} ${entry.text} @${entry.offset} ${entry.break} ${JSON.stringify(context(entry))} ` +
          (exception ? `[${exception.status}] ${exception.reason}` : '[NEW: review required]'));
      }
    }
    for (const entry of result.unexpected) console.error(`NEW: ${entry.location} ${entry.text} @${entry.offset} ${entry.break} ${JSON.stringify(context(entry))}`);
    for (const entry of result.stale) console.error(`STALE EXCEPTION: ${entry.location} ${entry.text} @${entry.offset} ${entry.break}`);
    for (const entry of result.duplicates) console.error(`DUPLICATE EXCEPTION: ${entry.location} @${entry.offset}`);
    if (!problems) {
      const pending = manifest.exceptions.filter(entry => entry.status === 'pending').length;
      const reviewed = manifest.exceptions.length - pending;
      console.log(`Line-break check passed: ${actual.length} exact retained breaks (${pending} pending, ${reviewed} reviewed). No new or stale entries.`);
    } else console.error(`Line-break check failed: ${result.unexpected.length} new, ${result.stale.length} stale, ${result.duplicates.length} duplicate exception(s).`);
  }
  if (problems) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
