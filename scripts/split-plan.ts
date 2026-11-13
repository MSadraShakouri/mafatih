import fs from 'node:fs';
import path from 'node:path';
import {loadCorpus,validateCorpus} from '../src/corpus.js';
import {compileSplitPlan,exportSplitInput} from '../src/split-plans.js';

const usage=`Text-only, lossless split planning for AI agents (no translation):
  npm run split:plan -- export <item-id> [--output <file>]
  npm run split:plan -- validate <plan.json> [--output <file>]

Export resolves existing text and hashes; validate checks exact source hashes,
Unicode boundaries and proposed groups, then writes non-canonical segment slices.
Neither command changes data/ or approves an alignment. See docs/ai-splitting.md.`;
const args=process.argv.slice(2);const cmd=args[0],input=args[1];
if(!input||!['export','validate'].includes(cmd??''))throw new Error(usage);
const outputIndex=args.indexOf('--output');if(outputIndex>=0&&!args[outputIndex+1])throw new Error(usage);
if(args.some((x,i)=>i>=2&&x!=='--output'&&i!==outputIndex+1))throw new Error(usage);
const c=loadCorpus(),check=validateCorpus(c);if(check.errors.length)throw new Error('Fix corpus validation errors first:\n'+check.errors.join('\n'));
let result:unknown;let defaultFile:string;
if(cmd==='export'){
  result=exportSplitInput(c,input);defaultFile=`${input}.input.json`;
}else{
  const plan=JSON.parse(fs.readFileSync(path.resolve(input),'utf8')) as unknown;
  const compiled=compileSplitPlan(c,plan);result=compiled;defaultFile=`${compiled.item}.validated.json`;
  console.log(`Validated ${compiled.source_count} sources, ${compiled.segment_count} lossless segments and ${compiled.groups.length} unreviewed proposed groups.`);
}
const target=path.resolve(outputIndex>=0?args[outputIndex+1]!:path.join('generated','split-plans',defaultFile));
// An alternate data root must not make the repository's own canonical data or
// Git directory writable by this proposal-only command. Resolve ancestor
// symlinks before creating output and never overwrite existing user work.
const protectedRoots=[path.resolve(c.root),path.resolve('data'),path.resolve('.git')]
  .filter(root=>fs.existsSync(root)).map(root=>fs.realpathSync(root));
const inside=(candidate:string,root:string)=>{
  const relative=path.relative(root,candidate);
  return relative===''||(!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative));
};
const parent=path.dirname(target);
let existing=parent;
while(!fs.existsSync(existing)) {
  const next=path.dirname(existing);if(next===existing)throw new Error('No output ancestor');existing=next;
}
const resolved=path.resolve(fs.realpathSync(existing),path.relative(existing,parent));
if(protectedRoots.some(root=>inside(path.join(resolved,path.basename(target)),root)))throw new Error('Output must be outside canonical data/ and .git/.');
if(cmd==='validate'&&target===path.resolve(input))throw new Error('Output must not overwrite the input plan.');
fs.mkdirSync(parent,{recursive:true,mode:0o700});
const realParent=fs.realpathSync(parent);
if(protectedRoots.some(root=>inside(path.join(realParent,path.basename(target)),root)))throw new Error('Output must be outside canonical data/ and .git/.');
fs.writeFileSync(path.join(realParent,path.basename(target)),JSON.stringify(result,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
console.log(`Wrote ${target}. Canonical data and reviewed alignments were not changed.`);
