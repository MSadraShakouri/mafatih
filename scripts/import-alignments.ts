import fs from 'node:fs';import path from 'node:path';import {isDeepStrictEqual} from 'node:util';
import {loadCorpus,validateCorpus} from '../src/corpus.js';import {commit,pretty} from '../src/editor.js';import {AlignmentFileSchema} from '../src/schema.js';
const input=process.argv[2];if(!input)throw new Error('Usage: npm run alignment:import -- <reviewed-download.json>');
const c=loadCorpus();const initial=validateCorpus(c);if(initial.errors.length)throw new Error(`Fix existing errors first:\n${initial.errors.join('\n')}`);
const incoming=AlignmentFileSchema.parse(JSON.parse(fs.readFileSync(path.resolve(input),'utf8')));if(!c.items.has(incoming.item))throw new Error('Unknown item '+incoming.item);
const existing=c.alignments.get(incoming.item)??{item:incoming.item,groups:[]};const byId=new Map(existing.groups.map(g=>[g.id,g]));let added=0;
for(const group of incoming.groups){const prior=byId.get(group.id);if(prior&&!isDeepStrictEqual(prior,group))throw new Error(`Conflicting reviewed group ${group.id}; compare manually before replacing it.`);if(!prior){existing.groups.push(group);byId.set(group.id,group);added++;}}
c.alignments.set(incoming.item,existing);const result=validateCorpus(c);if(result.errors.length)throw new Error(`Cannot import reviewed groups:\n${result.errors.join('\n')}`);
if(!added){console.log('No new groups; existing reviews were left unchanged.');process.exit(0);}
const changes=new Map<string,string|null>([[path.join(c.root,'alignments',incoming.item+'.json'),pretty(existing)]]);commit(c,changes,[],[]);
console.log(`Imported ${added} reviewed group(s) for ${incoming.item}; retained ${existing.groups.length-added} existing group(s).`);
console.log('This does not automatically verify the document link, source permissions, or unreviewed spans.');
