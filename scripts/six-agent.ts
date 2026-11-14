import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { commit, pretty, preserveKeyOrder } from '../src/editor.js';
import { gitCommit, gitFile, gitFiles, loadCorpusAtCommit } from '../src/git-corpus.js';
import { ItemSchema, Key, RowSplitRecordSchema, type Item, type RowSplitRecord } from '../src/schema.js';
import { AgentPartitionsSchema, AgentPlanSchema, exportAgentInput, splitAgentPlan, verifyAgentPartitions } from '../src/split-agent.js';
import { CanonicalLayoutSchema, compileCanonicalSplit, createCanonicalLayoutTemplate, restoreCanonicalItem, verifyCanonicalResult } from '../src/split-canonical.js';
import { CanonicalReviewSchema, createCanonicalReviewTemplate, verifyCanonicalReview } from '../src/six-agent-review.js';
import { sha256, textId } from '../src/text-ids.js';
import { checkedAgent, currentAgentBranch, discoverAgentPeer, neighbors, registerAgent, requireAgentBranch } from '../src/six-agent-branch.js';

const usage=`Six-agent canonical workflow (text/JSON only; never pushes or opens a PR):
  node --import tsx scripts/six-agent.ts register --agent agent-N --base COMMIT
  node --import tsx scripts/six-agent.ts configure --agent agent-N
  node --import tsx scripts/six-agent.ts discover --agent agent-N --peer agent-M
  node --import tsx scripts/six-agent.ts layout PLAN --base COMMIT --output NEW_FILE
  node --import tsx scripts/six-agent.ts apply PLAN LAYOUT --base COMMIT --agent agent-N
  node --import tsx scripts/six-agent.ts merge-preview PLAN LAYOUT --base COMMIT --agent agent-N --left ROW --right ROW [--join MODE --reason TEXT]
  node --import tsx scripts/six-agent.ts merge-rows PLAN LAYOUT --base COMMIT --agent agent-N --left ROW --right ROW --join MODE [--reason TEXT]
  node --import tsx scripts/six-agent.ts restore-snapshot-texts --base COMMIT --agent agent-N
  node --import tsx scripts/six-agent.ts inspect ITEM --base COMMIT --result AUTHOR_COMMIT --author agent-N
  node --import tsx scripts/six-agent.ts review-template ITEM --base COMMIT --result AUTHOR_COMMIT --author agent-N --reviewer agent-M --output NEW_FILE
  node --import tsx scripts/six-agent.ts verify-review ITEM REVIEW --base COMMIT --result AUTHOR_COMMIT --author agent-N
  node --import tsx scripts/six-agent.ts audit-authored --base COMMIT --agent agent-N
  node --import tsx scripts/six-agent.ts audit-round --base COMMIT
  node --import tsx scripts/six-agent.ts audit-squashed --base COMMIT
  node --import tsx scripts/six-agent.ts message --from agent-N --to agent-M --kind TYPE --text TEXT [--commit COMMIT] [--item ID] [--reply-to ID]
Use a full immutable 40-character commit. Register, configure and message write only work metadata or local Git configuration.
Only apply, merge-rows and restore-snapshot-texts write data/, and only on the registered agent's own branch.
MODE is exact, ar-space, fa-space or both-space. Spacing modes propose one U+0020 per selected language,
require a reason and separate independent review, and retain exact original text and links.`;
const project=spawnSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'});
if(project.status!==0)throw new Error('Run inside the project Git repository');
const root=path.resolve(project.stdout.trim());process.chdir(root);
const read=(file:string):unknown=>JSON.parse(fs.readFileSync(file,'utf8')) as unknown;
const agent=checkedAgent;
const currentBranch=(who:string):string=>currentAgentBranch(who);
function requireOwnBranch(value:string,base?:string):void {requireAgentBranch(root,value,base);}
function output(value:unknown,destination:string|undefined):void {
  const body=JSON.stringify(value,null,2)+'\n';
  if(!destination){process.stdout.write(body);return;}
  const target=path.resolve(destination), parent=path.dirname(target);
  for(const forbidden of [path.join(root,'data'),path.join(root,'.git')]){
    const rel=path.relative(forbidden,target);
    if(rel===''||(!rel.startsWith(`..${path.sep}`)&&rel!=='..'&&!path.isAbsolute(rel)))throw new Error('Output must be outside data/ and .git/');
  }
  // Resolve an existing ancestor before creating anything; reject symlink escapes into protected paths.
  let existing=parent;while(!fs.existsSync(existing)){const next=path.dirname(existing);if(next===existing)throw new Error('No output ancestor');existing=next;}
  const resolved=path.resolve(fs.realpathSync(existing),path.relative(existing,parent));
  for(const forbidden of [path.join(root,'data'),path.join(root,'.git')]){
    const real=fs.realpathSync(forbidden),rel=path.relative(real,resolved);
    if(rel===''||(!rel.startsWith(`..${path.sep}`)&&rel!=='..'&&!path.isAbsolute(rel)))throw new Error('Output must be outside data/ and .git/');
  }
  fs.mkdirSync(parent,{recursive:true,mode:0o700});fs.writeFileSync(target,body,{encoding:'utf8',flag:'wx',mode:0o600});
}
function ensureExpectedPath(file:string,expected:string):void {
  const actual=fs.realpathSync(path.resolve(file)),wanted=fs.realpathSync(path.join(root,expected));
  if(actual!==wanted)throw new Error(`Use the assigned work file ${expected}`);
}
function checkPlanForPublication(input:unknown):void {
  const plan=AgentPlanSchema.parse(input);
  if(plan.sources.some(s=>s.cut_after!==undefined))throw new Error('Use code-point cuts, not source quotations in publicly pushed plans');
  if(plan.punctuation_suggestions.length)throw new Error('Punctuation proposals require a separate review and must not be embedded in pushed plans');
}
function filesFor(item:string,owner:string){
  Key.parse(item);agent(owner);
  return {plan:`agent-work/${owner}/plans/${item}.json`,layout:`agent-work/${owner}/layouts/${item}.json`};
}
function trackedInputAt(commitSha:string,item:string,owner:string){
  const names=filesFor(item,owner);
  return {plan:JSON.parse(gitFile(commitSha,names.plan)) as unknown,layout:JSON.parse(gitFile(commitSha,names.layout)) as unknown};
}
function ensureRoundScope(base:ReturnType<typeof loadCorpus>,current:ReturnType<typeof loadCorpus>,baseSha:string):void {
  const plain=['meta','claims','nav','relations','sources','editorial'] as const;
  for(const name of plain)if(JSON.stringify(base[name])!==JSON.stringify(current[name]))throw new Error(`Out-of-scope canonical change: ${name}`);
  for(const name of ['english','alignments'] as const){
    const encode=(map:Map<string,unknown>)=>JSON.stringify([...map.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0));
    if(encode(base[name])!==encode(current[name]))throw new Error(`Out-of-scope canonical change: ${name}`);
  }
  if(base.items.size!==current.items.size||[...base.items.keys()].some(id=>!current.items.has(id)))throw new Error('Out-of-scope item additions or removals');
  for(const id of current.rowSplits.keys())if(!base.items.has(id))throw new Error(`Out-of-scope split record: ${id}`);
  for(const [id,value] of base.texts)if(current.texts.get(id)!==value)throw new Error(`Original pooled text was removed or changed: ${id}`);
  const changed=spawnSync('git',['diff','--name-only','-z',baseSha,'--','data/'],{encoding:'utf8'});
  const untracked=spawnSync('git',['ls-files','--others','--exclude-standard','-z','--','data/'],{encoding:'utf8'});
  if(changed.status!==0||untracked.status!==0)throw new Error('Could not check canonical scope');
  for(const file of [...changed.stdout.split('\0'),...untracked.stdout.split('\0')].filter(Boolean)){
    const item=/^data\/(?:items|row-splits)\/([a-z0-9][a-z0-9-]*)\.json$/.exec(file);
    if((item&&base.items.has(item[1]!))||/^data\/texts\/[0-9a-f]{2}\.json$/.test(file))continue;
    throw new Error(`Out-of-scope canonical path: ${file}`);
  }
}
/** Never silently orphan a row or alias that an earlier V2 merge exposed. */
function ensurePriorAnchors(before:Item, previous:RowSplitRecord, next:Item, mapping:RowSplitRecord):void {
  const destinations=new Map(next.rows.map(row=>[row.id,row]));
  const origins=new Map([...mapping.rows,...(mapping.aliases ?? [])].map(entry=>[entry.original.id,entry.original]));
  for(const old of [...before.rows,...previous.rows.map(e=>e.original),...(previous.aliases ?? []).map(e=>e.original)]) {
    const direct=destinations.get(old.id), redirect=origins.get(old.id);
    const matches=(row:typeof old|undefined)=>row!==undefined && row.ar===old.ar && row.fa===old.fa;
    if(!matches(direct)&&!matches(redirect)) throw new Error(`${old.id}: revision would orphan a previously published row link; preserve it and request a mapping migration`);
  }
}
function parseArgs(args:string[]){
  const command=args.shift(),flags:Record<string,string>={},positional:string[]=[];
  for(let i=0;i<args.length;i++){
    const value=args[i]!;if(!value.startsWith('--')){positional.push(value);continue;}
    if(!['--base','--output','--agent','--peer','--author','--reviewer','--result','--from','--to','--kind','--text','--commit','--item','--reply-to','--left','--right','--join','--reason'].includes(value)||flags[value]!==undefined||!args[i+1]||args[i+1]!.startsWith('--'))throw new Error(usage);
    flags[value]=args[++i]!;
  }
  return {command,flags,positional};
}
function branchMessage(flags:Record<string,string>):void {
  const from=agent(flags['--from']),to=agent(flags['--to']);requireOwnBranch(from);
  if(!neighbors(from,to))throw new Error('Messages are only to your two ring neighbors');
  const kind=flags['--kind'],body=flags['--text'];
  if(!kind||!['ready','review','question','answer','resolved','acknowledgement','progress'].includes(kind)||!body?.trim()||body.length>2000)throw new Error('Invalid message kind or text');
  if(flags['--commit'])gitCommit(flags['--commit']);
  if(flags['--item'])Key.parse(flags['--item']);
  if(flags['--reply-to']&&!/^[a-z0-9][a-z0-9-]{0,127}$/.test(flags['--reply-to']))throw new Error('Invalid reply ID');
  const name=`coordination/${[from,to].sort().join('-')}.jsonl`,file=path.join(root,name);
  if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink())throw new Error(`Neighbor file missing or unsafe: ${name}`);
  const message={format_version:1,id:crypto.randomUUID(),sender:from,recipient:to,kind,text:body,
    ...(flags['--commit']?{commit:flags['--commit']}:{}),...(flags['--item']?{item:flags['--item']}:{}),
    ...(flags['--reply-to']?{reply_to:flags['--reply-to']}:{})};
  fs.appendFileSync(file,JSON.stringify(message)+'\n',{encoding:'utf8',mode:0o600});
  output({status:'message-appended',path:name,id:message.id,note:'Commit and push your own branch; the neighbor must fetch it to read this message.'},undefined);
}

function main():void {
  const {command,flags,positional}=parseArgs(process.argv.slice(2));
  if(!command||command==='--help'||command==='-h'){console.log(usage);return;}
  const specs:Record<string,{count:number;flags:string[]}>={
    register:{count:0,flags:['--agent','--base']},configure:{count:0,flags:['--agent']},
    discover:{count:0,flags:['--agent','--peer']},layout:{count:1,flags:['--base','--output']},apply:{count:2,flags:['--base','--agent']},
    'merge-preview':{count:2,flags:['--base','--agent','--left','--right','--join','--reason']},
    'merge-rows':{count:2,flags:['--base','--agent','--left','--right','--join','--reason']},
    'restore-snapshot-texts':{count:0,flags:['--base','--agent']},
    inspect:{count:1,flags:['--base','--result','--author']},
    'review-template':{count:1,flags:['--base','--result','--author','--reviewer','--output']},
    'verify-review':{count:2,flags:['--base','--result','--author']},
    'audit-authored':{count:0,flags:['--base','--agent']},'audit-round':{count:0,flags:['--base']},
    'audit-squashed':{count:0,flags:['--base']},
    message:{count:0,flags:['--from','--to','--kind','--text','--commit','--item','--reply-to']},
  };
  const spec=specs[command];
  if(!spec||positional.length!==spec.count||Object.keys(flags).some(x=>!spec.flags.includes(x)))throw new Error(usage);
  if(command==='register'){output(registerAgent(root,flags['--agent'],flags['--base']),undefined);return;}
  if(command==='discover'){output(discoverAgentPeer(root,flags['--agent'],flags['--peer']),undefined);return;}
  if(command==='message'){branchMessage(flags);return;}
  if(command==='configure'){
    const who=agent(flags['--agent']);requireOwnBranch(who);
    const desired:Record<string,string>={
      'merge.mafatih-texts.driver':'node scripts/merge-agent-files.mjs texts %O %A %B %P',
      'merge.mafatih-messages.driver':'node scripts/merge-agent-files.mjs messages %O %A %B %P',
    };
    for(const [key,value] of Object.entries(desired)){
      const existing=spawnSync('git',['config','--local','--get',key],{encoding:'utf8'});
      if(existing.status===0&&existing.stdout.trim()!==value)throw new Error(`Existing ${key} differs; preserve it and report rather than overwriting it`);
    }
    for(const [key,value] of Object.entries(desired)){
      const result=spawnSync('git',['config','--local',key,value],{encoding:'utf8'});
      if(result.status!==0)throw new Error(`Could not configure ${key}: ${result.stderr.trim()}`);
    }
    output({status:'safe-merge-drivers-configured',branch:currentBranch(who),note:'Only immutable pooled additions and append-only messages are unioned; other conflicts remain for the agent.'},undefined);return;
  }
  const baseSha=gitCommit(flags['--base']??''),base=loadCorpusAtCommit(baseSha),manifestPath='docs/split-assignments/assignments.json';
  const manifestBody=gitFile(baseSha,manifestPath), manifest=AgentPartitionsSchema.parse(JSON.parse(manifestBody) as unknown);
  if(sha256(fs.readFileSync(manifestPath,'utf8'))!==sha256(manifestBody))throw new Error('Worktree assignment manifest differs from frozen base');
  verifyAgentPartitions(base,manifest);
  const groupFor=(item:string)=>{
    Key.parse(item);const matches=manifest.groups.filter(g=>g.items.some(i=>i.item===item));
    if(matches.length!==1)throw new Error(`No unique assignment for ${item}`);return matches[0]!;
  };
  const verifyReviewCommit=(item:string,author:string,commitSha:string,current:ReturnType<typeof loadCorpus>,plan:unknown,layout:unknown):void=>{
    gitCommit(commitSha);
    if(spawnSync('git',['merge-base','--is-ancestor',commitSha,'HEAD']).status!==0)throw new Error('Reviewed author commit is not reachable from the integrated branch');
    const work=filesFor(item,author),itemPath=`data/items/${item}.json`,recordPath=`data/row-splits/${item}.json`;
    const ids=new Set<string>();
    const collect=(value:unknown):void=>{
      if(typeof value==='string'&&/^t[0-9a-f]{24}$/.test(value))ids.add(value);
      else if(Array.isArray(value))for(const x of value)collect(x);
      else if(value&&typeof value==='object')for(const x of Object.values(value))collect(x);
    };
    collect(current.items.get(item));collect(current.rowSplits.get(item));
    const shards=[...new Set([...ids].map(id=>`data/texts/${id.slice(1,3)}.json`))];
    const files=gitFiles(commitSha,[work.plan,work.layout,itemPath,recordPath,...shards]);
    const json=(name:string):unknown=>JSON.parse(files.get(name)!) as unknown;
    if(JSON.stringify(json(work.plan))!==JSON.stringify(plan)||JSON.stringify(json(work.layout))!==JSON.stringify(layout)||
       JSON.stringify(ItemSchema.parse(json(itemPath)))!==JSON.stringify(current.items.get(item))||
       JSON.stringify(RowSplitRecordSchema.parse(json(recordPath)))!==JSON.stringify(current.rowSplits.get(item))) {
      throw new Error('Recorded author commit does not contain the reviewed plan, layout and canonical item');
    }
    const pools=new Map(shards.map(file=>[file,json(file) as Record<string,string>]));
    for(const id of ids)if(pools.get(`data/texts/${id.slice(1,3)}.json`)?.[id]!==current.texts.get(id))throw new Error(`Recorded author commit lacks the reviewed text ${id}`);
  };
  if(command==='restore-snapshot-texts'){
    const who=agent(flags['--agent']);requireOwnBranch(who,baseSha);
    if(spawnSync('git',['diff','--quiet']).status!==0||spawnSync('git',['diff','--cached','--quiet']).status!==0||
       spawnSync('git',['rev-parse','-q','--verify','MERGE_HEAD']).status===0)
      throw new Error('Commit tracked changes and resolve any existing merge before restoring snapshot text; do not discard work');
    const untracked=spawnSync('git',['ls-files','--others','--exclude-standard','--','data/'],{encoding:'utf8'});
    if(untracked.status!==0||untracked.stdout.trim())throw new Error('Preserve and resolve untracked data files before restoring snapshot text');
    const history=spawnSync('git',['log','--topo-order','-1','--format=%H',`--grep=^Isolated ${who} authored snapshot$`,'HEAD'],{encoding:'utf8'});
    if(history.status!==0)throw new Error('Could not find prior authored snapshot');
    const parent=history.stdout.trim()||baseSha;
    if(spawnSync('git',['merge-base','--is-ancestor',baseSha,parent]).status!==0)throw new Error('Prior snapshot does not descend from frozen base');
    const dataRoot=path.join(root,'data');
    if(fs.realpathSync(dataRoot)!==dataRoot)throw new Error('Refusing canonical writes through a data-directory symlink');
    const current=loadCorpus(dataRoot),prior=loadCorpusAtCommit(parent),pre=validateCorpus(current);
    if(pre.errors.length)throw new Error(`Fix current corpus errors first: ${pre.errors.join('; ')}`);
    const missing:string[]=[];
    for(const [id,value] of prior.texts){
      if(textId(value)!==id)throw new Error(`Prior snapshot has invalid pooled text ${id}`);
      const present=current.texts.get(id);
      if(present!==undefined && present!==value)throw new Error(`Prior snapshot conflicts with current text ${id}`);
      if(present===undefined){current.texts.set(id,value);current.textShards.set(id,id.slice(1,3));missing.push(id);}
    }
    const shards=[...new Set(missing.map(id=>id.slice(1,3)))].sort();
    for(const shard of shards){const file=path.join(dataRoot,'texts',`${shard}.json`);
      if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw new Error(`Refusing to write a symlink: ${file}`);}
    const checked=validateCorpus(current);if(checked.errors.length)throw new Error(`Refusing invalid result: ${checked.errors.join('; ')}`);
    if(missing.length)commit(current,new Map(),[],missing);
    output({status:missing.length?'snapshot-texts-restored':'snapshot-texts-already-present',agent:who,base:baseSha,prior_snapshot:parent,
      restored_count:missing.length,restored_ids:missing.sort(),changed_shards:shards.map(s=>`data/texts/${s}.json`),
      note:'Explicitly restored immutable prior-snapshot values; some may be unreferenced. Review and commit these shards before the next snapshot; do not prune during the parallel round.'},undefined);return;
  }
  if(command==='layout'){
    const plan=read(positional[0]!);checkPlanForPublication(plan);const parsed=AgentPlanSchema.parse(plan),group=groupFor(parsed.item);
    if(parsed.author!==group.agent)throw new Error('Wrong author for item');
    output(createCanonicalLayoutTemplate(base,splitAgentPlan(base,plan)),flags['--output']);return;
  }
  if(command==='apply'||command==='merge-preview'||command==='merge-rows'){
    const who=agent(flags['--agent']);requireOwnBranch(who,baseSha);
    const plan=read(positional[0]!),oldLayoutInput=read(positional[1]!);checkPlanForPublication(plan);
    const parsed=AgentPlanSchema.parse(plan),oldLayout=CanonicalLayoutSchema.parse(oldLayoutInput),group=groupFor(parsed.item);
    if(group.agent!==who||parsed.author!==who||oldLayout.author!==who)throw new Error('Cannot apply a different agent’s assignment');
    const names=filesFor(parsed.item,who);ensureExpectedPath(positional[0]!,names.plan);ensureExpectedPath(positional[1]!,names.layout);
    const merging=command!=='apply';
    const leftId=merging?Key.parse(flags['--left']):'',rightId=merging?Key.parse(flags['--right']):'';
    const join=merging?(flags['--join'] ?? (command==='merge-preview'?'exact':'')):'';
    if(merging&&!['exact','ar-space','fa-space','both-space'].includes(join))
      throw new Error('Choose --join exact, ar-space, fa-space or both-space explicitly');
    if(merging&&join==='exact'&&flags['--reason']!==undefined)throw new Error('A reason is only used for a proposed spacing correction');
    if(merging&&join!=='exact'&&!flags['--reason']?.trim())throw new Error('An explicit single-line --reason is required for a spacing correction');
    const spacing=merging&&join!=='exact'?{mode:join,reason:flags['--reason']}:undefined;
    const layoutInput=merging?{...(oldLayoutInput as Record<string,unknown>),
      merges:[...(oldLayout.merges ?? []),{left:leftId,right:rightId,checked:true,...(spacing?{spacing}:{})}]}:oldLayoutInput;
    const dataRoot=path.join(root,'data');
    if(fs.realpathSync(dataRoot)!==dataRoot)throw new Error('Refusing canonical writes through a data-directory symlink');
    const current=loadCorpus(dataRoot),pre=validateCorpus(current);
    if(pre.errors.length)throw new Error(`Fix current corpus errors first: ${pre.errors.join('; ')}`);
    ensureRoundScope(base,current,baseSha);
    const before=current.items.get(parsed.item),baseline=base.items.get(parsed.item),record=current.rowSplits.get(parsed.item);
    if(!before||!baseline)throw new Error('Assigned item is missing');
    if(current.alignments.has(parsed.item)||before.review?.text||before.review?.ar_fa)throw new Error('A current human review or alignment needs separate migration');
    if(record){
      if(record.author!==who||record.baseline_item_sha256!==parsed.item_sha256||JSON.stringify(restoreCanonicalItem(current,parsed.item))!==JSON.stringify(baseline))throw new Error('Existing canonical work is not a reversible version of this agent’s frozen baseline; preserve it and report');
    } else if(JSON.stringify(before)!==JSON.stringify(baseline)) throw new Error('This item has other existing changes; preserve and reconcile them before applying');
    let preview:Record<string,unknown>|undefined;
    if(merging){
      if(!record)throw new Error('Apply and inspect the checked layout before merging its current rows');
      verifyCanonicalResult(base,current,plan,oldLayoutInput);
      const position=before.rows.findIndex(row=>row.id===leftId),left=before.rows[position],right=before.rows[position+1];
      if(position<0||!left||!right||right.id!==rightId)throw new Error('Merge requires two adjacent current rows in source order');
      const fields=Object.fromEntries((['ar','fa'] as const).map(lang=>{
        const a=text(current,left[lang]),b=text(current,right[lang]);
        const inserted=join==='both-space'||join===`${lang}-space`;
        return [lang,{left:a,right:b,merged:a+(inserted?' ':'')+b,inserted_separator:inserted?'U+0020':null,
          no_whitespace_boundary:Boolean(a&&b&&!/[\s\u0085]$/u.test(a)&&!/^[\s\u0085]/u.test(b))}];
      }));
      preview={left:leftId,right:rightId,join,fields};
    }
    const compiled=compileCanonicalSplit(base,plan,layoutInput);
    if(record&&(merging||record.format_version!==1))ensurePriorAnchors(before,record,compiled.item,compiled.record);
    current.items.set(parsed.item,compiled.item);current.rowSplits.set(parsed.item,compiled.record);
    for(const [id,value] of compiled.texts){const old=current.texts.get(id);if(old!==undefined&&old!==value)throw new Error(`Text hash collision: ${id}`);current.texts.set(id,value);current.textShards.set(id,id.slice(1,3));}
    const checked=validateCorpus(current);if(checked.errors.length)throw new Error(`Refusing invalid result: ${checked.errors.join('; ')}`);
    verifyCanonicalResult(base,current,plan,layoutInput);
    const mergedRow=merging?compiled.item.rows[before.rows.findIndex(row=>row.id===leftId)]?.id:undefined;
    if(command==='merge-preview'){
      output({status:'merge-preview',item:parsed.item,author:who,merged_row:mergedRow,...preview,
        note:join==='exact'?'No files changed. Exact join inserts no characters; inspect both languages. Do not commit this text-bearing preview.':
          'No files changed. The preview proposes an editorial space not present in the source; inspect both languages and request a separate independent spacing review. Do not commit this text-bearing preview.'},undefined);return;
    }
    const itemFile=path.join(dataRoot,'items',`${parsed.item}.json`),recordFile=path.join(dataRoot,'row-splits',`${parsed.item}.json`),layoutFile=path.join(root,names.layout);
    for(const file of [itemFile,recordFile,...(merging?[layoutFile]:[]),...[...compiled.texts.keys()].map(id=>path.join(dataRoot,'texts',`${id.slice(1,3)}.json`))]){
      if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw new Error(`Refusing to write a symlink: ${file}`);
    }
    const original=read(itemFile),changes=new Map<string,string|null>([
      [itemFile,pretty(preserveKeyOrder(original,compiled.item))],[recordFile,pretty(compiled.record)],
      ...(merging?[[layoutFile,pretty(layoutInput)] as [string,string]]:[]),
    ]);
    commit(current,changes,[],[...compiled.texts.keys()]);
    output({status:merging?'canonical-rows-merged':'canonical-item-applied',item:parsed.item,author:who,base:baseSha,
      ...(merging?{left:leftId,right:rightId,merged_row:mergedRow,separator:join==='exact'?'none':join,
        proposed_editorial_insertions:join==='both-space'?2:join==='exact'?0:1,
        total_editorial_insertions:compiled.record.insertions?.length ?? 0}:{}),
      original_rows:baseline.rows.length,result_rows:compiled.item.rows.length,new_text_values:compiled.texts.size,
      plan_sha256:compiled.record.plan_sha256,layout_sha256:compiled.record.layout_sha256,
      note:'Independent semantic review and separate review of every proposed space are still required; earlier reviews of this item are stale. No translation, scholarly approval or rights approval is claimed.'},undefined);return;
  }
  if(command==='audit-authored'||command==='audit-round'||command==='audit-squashed'){
    const who=command==='audit-authored'?agent(flags['--agent']):undefined;
    const reviewing=command!=='audit-authored';
    const current=loadCorpus(path.join(root,'data')),checked=validateCorpus(current);
    if(checked.errors.length)throw new Error(`Corpus invalid: ${checked.errors.join('; ')}`);
    ensureRoundScope(base,current,baseSha);
    const findings:Array<{item:string;status:string;detail?:string}>=[];
    let complete=0;
    for(const group of manifest.groups){
      if(who&&group.agent!==who)continue;
      for(const entry of group.items){
        const names=filesFor(entry.item,group.agent),reviewPath=`agent-work/${group.reviewer}/reviews/${entry.item}.json`;
        const required=[names.plan,names.layout,...(reviewing?[reviewPath]:[])];
        const missing=required.filter(f=>!fs.existsSync(f));
        if(missing.length){findings.push({item:entry.item,status:'missing',detail:missing.join(', ')});continue;}
        try{
          const plan=read(names.plan),layout=read(names.layout);checkPlanForPublication(plan);
          const parsedPlan=AgentPlanSchema.parse(plan),parsedLayout=CanonicalLayoutSchema.parse(layout);
          if(parsedPlan.author!==group.agent||parsedPlan.item!==entry.item||parsedLayout.item!==entry.item||parsedLayout.author!==group.agent)throw new Error('wrong item or author');
          verifyCanonicalResult(base,current,plan,layout);
          if(reviewing){
            const review=read(reviewPath),parsed=CanonicalReviewSchema.parse(review);
            if(parsed.reviewer!==group.reviewer)throw new Error('wrong assigned reviewer');
            const result=verifyCanonicalReview(base,current,plan,layout,review);
            if(result.status!=='agent-review-records-complete')throw new Error('independent review remains incomplete or has findings');
            // A squashed patch intentionally excludes agent commit ancestry and
            // a fresh clone need not possess those objects. Never weaken the
            // strict pre-squash audit; explicitly report the distinction below.
            if(command==='audit-round')verifyReviewCommit(entry.item,group.agent,parsed.author_commit,current,plan,layout);
          }
          complete++;
        }catch(error){findings.push({item:entry.item,status:'invalid-or-incomplete',detail:error instanceof Error?error.message:String(error)});}
      }
    }
    const total=complete+findings.length;
    output({status:findings.length?'needs-work':'complete',base:baseSha,agent:who??null,total_items:total,complete_items:complete,findings,
      author_commit_provenance:command==='audit-round'?'reachable-commits-and-content-checked':
        command==='audit-squashed'?'not-verified-after-squash':'not-applicable',
      note:command==='audit-squashed'
        ? 'Post-squash content and review-record consistency only; author commit reachability and provenance are NOT checked. Run the strict audit-round before squashing. Agent review is not a human, scholarly or rights certification.'
        : 'Completeness and matching are mechanical; agent review is not a human, scholarly or rights certification.'},undefined);
    if(findings.length)process.exitCode=1;return;
  }
  const item=Key.parse(positional[0]),author=agent(flags['--author']),group=groupFor(item);
  if(group.agent!==author)throw new Error('Wrong assigned author');
  const resultSha=gitCommit(flags['--result']??''),current=loadCorpusAtCommit(resultSha),{plan,layout}=trackedInputAt(resultSha,item,author);
  checkPlanForPublication(plan);
  const resultPlan=AgentPlanSchema.parse(plan),resultLayout=CanonicalLayoutSchema.parse(layout);
  if(resultPlan.item!==item||resultPlan.author!==author||resultLayout.item!==item||resultLayout.author!==author)throw new Error('Snapshot work file has the wrong item or author');
  verifyCanonicalResult(base,current,plan,layout);
  if(command==='inspect'){
    const actual=current.items.get(item)!;
    output({item,author,base:baseSha,result_commit:resultSha,original:exportAgentInput(base,item),layout,
      current_rows:actual.rows.map(r=>({...r,ar:r.ar===null?null:text(current,r.ar),fa:r.fa===null?null:text(current,r.fa)})),
      note:'Inspect source and actual rows independently. Do not commit this text-bearing export.'},undefined);return;
  }
  if(command==='review-template'){
    const reviewer=agent(flags['--reviewer']);requireOwnBranch(reviewer,baseSha);
    if(reviewer!==group.reviewer)throw new Error('Wrong independent reviewer');
    output(createCanonicalReviewTemplate(base,current,plan,layout,reviewer,resultSha),flags['--output']);return;
  }
  if(command==='verify-review'){
    const review=read(positional[1]!),parsed=CanonicalReviewSchema.parse(review);
    if(parsed.reviewer!==group.reviewer||parsed.author_commit!==resultSha)throw new Error('Review uses the wrong reviewer or author commit');
    const report=verifyCanonicalReview(base,current,plan,layout,review);output(report,undefined);
    if(report.status!=='agent-review-records-complete')process.exitCode=1;return;
  }
  throw new Error(usage);
}
try{main();}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
