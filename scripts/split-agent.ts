import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorpus, validateCorpus, type Corpus } from '../src/corpus.js';
import { auditAgentBatch } from '../src/split-agent-batch.js';
import {
  AgentPreviewSchema, AgentReviewSchema, SPLIT_AGENT_PROTOCOL, assertAgentAssignment,
  createAgentPartitions, createAgentReviewTemplate, createAgentTemplate, createSplitInventory,
  exportAgentInput, splitAgentPlan, verifyAgentPartitions, verifyAgentPreview, verifyAgentReview,
} from '../src/split-agent.js';
import { sha256 } from '../src/text-ids.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = `Arabic/Persian split preparation (local, text-only, never writes canonical data):
  npx tsx scripts/split-agent.ts tool-info [--output FILE]
  npx tsx scripts/split-agent.ts verify-tool-info FILE
  npx tsx scripts/split-agent.ts inventory [--output FILE]
  npx tsx scripts/split-agent.ts partition [--output FILE]
  npx tsx scripts/split-agent.ts verify-partitions MANIFEST [--output FILE]
  npx tsx scripts/split-agent.ts export ITEM [--output FILE]
  npx tsx scripts/split-agent.ts template ITEM --author AGENT [--manifest FILE] [--output FILE]
  npx tsx scripts/split-agent.ts split PLAN [--manifest FILE] [--output FILE]
  npx tsx scripts/split-agent.ts verify PREVIEW [--reviewer AGENT] [--manifest FILE] [--output FILE]
  npx tsx scripts/split-agent.ts review-template PREVIEW --reviewer AGENT [--manifest FILE] [--output FILE]
  npx tsx scripts/split-agent.ts verify-review PREVIEW REVIEW [--manifest FILE] [--output FILE]
  npx tsx scripts/split-agent.ts audit-batch MANIFEST --work-dir DIR [--output FILE]

Output is JSON, printed to stdout unless --output names a NEW file outside data/.
Audit-batch exits nonzero until all assigned review records are complete.
Nothing here performs a canonical migration or certifies meaning or rights.`;

const files = [
  'scripts/split-agent.ts', 'src/split-agent.ts', 'src/split-agent-batch.ts', 'src/corpus.ts',
  'src/line-breaks.ts', 'src/line-break-history.ts', 'src/source-page-history.ts', 'src/punctuation-history.ts',
  'src/punctuation.ts', 'src/quran-markers.ts', 'src/normalize.ts', 'src/schema.ts', 'src/text-ids.ts',
  'tests/split-agent.test.ts', 'tests/split-plans.test.ts', 'docs/split-agent-instructions.md',
  'AGENTS.md', 'CONTENT_POLICY.md', 'package.json', 'package-lock.json',
];
function toolInfo() {
  const versions = ['tsx', 'typescript', 'zod'].map(name => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')) as { version: string };
    return [name, pkg.version];
  });
  return { format_version: 1, protocol: SPLIT_AGENT_PROTOCOL,
    node: process.version, icu: process.versions.icu, unicode: process.versions.unicode,
    dependencies: Object.fromEntries(versions),
    files: Object.fromEntries(files.map(file => [file, sha256(fs.readFileSync(path.join(root, file), 'utf8'))])) };
}
function json(file: string): unknown { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')) as unknown; }
function isInside(candidate: string, base: string): boolean {
  const rel = path.relative(base, candidate);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
function checkedParent(parent: string, protectedRoots: string[]): string {
  let existing = parent;
  // Resolve the nearest existing ancestor before creating any directory; this
  // also rejects a parent symlink pointing into the canonical corpus.
  for (;;) {
    try { fs.lstatSync(existing); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const next = path.dirname(existing);
      if (next === existing) throw error;
      existing = next;
    }
  }
  const resolved = path.resolve(fs.realpathSync(existing), path.relative(existing, parent));
  for (const protectedRoot of protectedRoots) {
    if (isInside(resolved, protectedRoot)) throw new Error('Output must be outside canonical data/ and .git/.');
  }
  return resolved;
}
function output(value: unknown, destination: string | undefined, c?: Corpus): void {
  const body = JSON.stringify(value, null, 2) + '\n';
  if (destination === undefined) { process.stdout.write(body); return; }
  const target = path.resolve(destination), parent = path.dirname(target);
  const protectedRoots = [path.join(root, 'data'), path.join(root, '.git'), ...(c ? [c.root] : [])]
    .filter(x => fs.existsSync(x)).map(x => fs.realpathSync(x));
  checkedParent(parent, protectedRoots);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const realParent = checkedParent(parent, protectedRoots);
  // wx follows no existing file/symlink and protects plans, input files and
  // user work. Private permissions also protect rights-sensitive drafts.
  fs.writeFileSync(path.join(realParent, path.basename(target)), body, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

function main(): void {
  const args = process.argv.slice(2), command = args.shift();
  if (!command || command === '--help' || command === '-h') { process.stdout.write(usage + '\n'); return; }
  const flags: Record<string, string> = {}, positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    if (!['--output', '--author', '--reviewer', '--manifest', '--work-dir'].includes(arg) || flags[arg] !== undefined ||
        !args[i + 1] || args[i + 1]!.startsWith('--')) throw new Error(usage);
    flags[arg] = args[++i]!;
  }
  const allowed: Record<string, { count: number; options: string[] }> = {
    'tool-info': { count: 0, options: ['--output'] },
    'verify-tool-info': { count: 1, options: ['--output'] },
    inventory: { count: 0, options: ['--output'] },
    partition: { count: 0, options: ['--output'] },
    'verify-partitions': { count: 1, options: ['--output'] },
    export: { count: 1, options: ['--output'] },
    template: { count: 1, options: ['--output', '--author', '--manifest'] },
    split: { count: 1, options: ['--output', '--manifest'] },
    verify: { count: 1, options: ['--output', '--reviewer', '--manifest'] },
    'review-template': { count: 1, options: ['--output', '--reviewer', '--manifest'] },
    'verify-review': { count: 2, options: ['--output', '--manifest'] },
    'audit-batch': { count: 1, options: ['--output', '--work-dir'] },
  };
  const specification = allowed[command];
  if (!specification || positional.length !== specification.count || Object.keys(flags).some(f => !specification.options.includes(f))) throw new Error(usage);
  if (command === 'tool-info') { output(toolInfo(), flags['--output']); return; }
  if (command === 'verify-tool-info') {
    try { assert.deepStrictEqual(json(positional[0]!), toolInfo()); }
    catch { throw new Error('Tool source, dependencies, Node or Unicode/ICU version differs from the pinned common tool version'); }
    output({ status: 'tool-version-matches', protocol: SPLIT_AGENT_PROTOCOL }, flags['--output']); return;
  }
  const c = loadCorpus(), validation = validateCorpus(c);
  if (validation.errors.length) throw new Error('Fix corpus validation errors first:\n' + validation.errors.join('\n'));
  const assignment = (item: string, author: string, reviewer?: string) => {
    if (flags['--manifest']) assertAgentAssignment(c, json(flags['--manifest']), item, author, reviewer);
  };
  let result: unknown;
  switch (command) {
    case 'inventory': result = createSplitInventory(c); break;
    case 'partition': result = createAgentPartitions(c); break;
    case 'verify-partitions': result = verifyAgentPartitions(c, json(positional[0]!)); break;
    case 'export': result = exportAgentInput(c, positional[0]!); break;
    case 'template': {
      const author = flags['--author']; if (!author) throw new Error('template requires --author');
      assignment(positional[0]!, author);
      result = createAgentTemplate(c, positional[0]!, author); break;
    }
    case 'split': {
      const plan = json(positional[0]!); const preview = splitAgentPlan(c, plan);
      assignment(preview.item, preview.author); result = preview; break;
    }
    case 'verify': {
      const preview = json(positional[0]!); const parsed = AgentPreviewSchema.parse(preview);
      assignment(parsed.item, parsed.author, flags['--reviewer']);
      result = verifyAgentPreview(c, preview, flags['--reviewer']); break;
    }
    case 'review-template': {
      const reviewer = flags['--reviewer']; if (!reviewer) throw new Error('review-template requires --reviewer');
      const preview = json(positional[0]!); const parsed = AgentPreviewSchema.parse(preview);
      assignment(parsed.item, parsed.author, reviewer);
      result = createAgentReviewTemplate(c, preview, reviewer); break;
    }
    case 'verify-review': {
      const preview = json(positional[0]!), review = json(positional[1]!); const parsed = AgentReviewSchema.parse(review);
      assignment(parsed.item, parsed.author, parsed.reviewer);
      result = verifyAgentReview(c, preview, review); break;
    }
    case 'audit-batch': {
      if (!flags['--work-dir']) throw new Error('audit-batch requires --work-dir');
      const report = auditAgentBatch(c, json(positional[0]!), flags['--work-dir']);
      result = report;
      if (report.status !== 'agent-review-records-complete') process.exitCode = 1;
      break;
    }
    default: throw new Error(usage);
  }
  output(result, flags['--output'], c);
}
try { main(); }
catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
