import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claim, documentTitle, itemTitle, linksForItem, loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { normalizeSearch } from '../src/normalize.js';
import type { SearchIndex, SearchRecord } from '../src/search.js';
import type { NavNode } from '../src/schema.js';

export interface BuildDataOptions {
  /** Include the search index and shards (default true). */
  includeSearch?: boolean;
  /** Explicitly export page history for local analysis; never a default runtime asset. */
  includePageHistory?: boolean;
  root?: string;
  /** Preserve validation warnings when the caller is building the app. */
  onWarning?: (warning: string) => void;
  /** An in-memory sink lets Vite serve data without staging thousands of files. */
  write?: (relativePath: string, content: string) => void;
  quiet?: boolean;
}

export function buildData(options: BuildDataOptions = {}): void {
  if(options.includePageHistory&&!options.write)throw new Error('Page history requires an explicit local-analysis output sink.');
  const c=loadCorpus(options.root);const checked=validateCorpus(c);
  if(checked.errors.length)throw new Error(`Structural validation failed:\n${checked.errors.join('\n')}`);
  if(options.onWarning) for(const warning of checked.warnings) options.onWarning(warning);
  const out=path.resolve('generated/web-data');
  if(!options.write){fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});}
  const writeText=options.write ?? ((rel:string,content:string)=>{const target=path.join(out,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content,'utf8');});
  function write(rel:string,value:unknown){writeText(rel,JSON.stringify(value)+'\n');}
  const includeSearch=options.includeSearch !== false;
  const featured=new Set(c.nav.featured);const catalog=[];const textSearchRecords:SearchRecord[]=[];
  for(const id of c.nav.default_order){
    const item=c.items.get(id)!;const title=itemTitle(c,id);const tags=item.tags.map(x=>text(c,x));
    const links=linksForItem(c,id).map(l=>({document:l.document,kind:l.kind,coverage:c.english.get(l.document)!.coverage,reviewed:Boolean(l.review)}));
    // Source-page audio menus accidentally imported as Persian text remain in
    // canonical data/history but are not prayer rows or searchable content.
    const excludedAudioRows=item.rows.filter(r=>r.kind==='audio-reciter').length;
    // Record adjacency before filtering audio: local in-text search must not
    // join across an excluded source row. The canonical data stays unchanged.
    const rows=item.rows.flatMap((r,position)=>{
      if(r.kind==='audio-reciter')return [];
      const following=item.rows[position+1];
      return [{id:r.id,ar:text(c,r.ar),fa:text(c,r.fa),...(r.kind?{kind:r.kind}:{}),...(r.sources?{sources:r.sources}:{}),
        ...(following&&following.kind!=='audio-reciter'?{searchNext:following.id}:{})}];
    });
    catalog.push({id,title,category:item.category,...(item.quran?{quran:item.quran}:{}),tags,featured:featured.has(id),row_count:rows.length,
      excluded_audio_rows:excludedAudioRows,alignment_claim:item.legacy_alignment, titles_reviewed:Boolean(item.review?.titles),english:links});
    const redirects=c.rowSplits.get(id)?.rows.map(entry=>({original:{id:entry.original.id},ar:entry.ar,fa:entry.fa}))??[];
    write(`items/${id}.json`,{id,legacy_id:item.legacy_id,title,featured:featured.has(id),category:item.category,...(item.quran?{quran:item.quran}:{}),tags,
      alignment_claim:item.legacy_alignment,ar_fa_reviewed:Boolean(item.review?.ar_fa),sources:item.sources??{},excluded_audio_rows:excludedAudioRows,rows,english:links,
      ...(redirects.length?{row_split_redirects:redirects}:{}),reviewed_alignment_groups:c.alignments.get(id)?.groups??[]});
    // Each source field remains a separate OR result. Link only an immediately
    // neighboring source row in the same language, never across an excluded
    // audio row or an empty field; local phrase ranking can follow this link.
    if(includeSearch) {
      for(let position=0;position<item.rows.length;position+=1){
        const row=item.rows[position]!;if(row.kind==='audio-reciter')continue;
        for(const language of ['ar','fa'] as const){
          const value=text(c,row[language]);if(!value)continue;
          const following=item.rows[position+1];
          const nextText=following&&following.kind!=='audio-reciter'?text(c,following[language]):'';
          const next=following&&nextText&&normalizeSearch(nextText)?`row:${id}:${following.id}:${language}`:undefined;
          textSearchRecords.push({key:`row:${id}:${row.id}:${language}`,section:'text',item:id,row:row.id,
            language,text:value,normalized:normalizeSearch(value),featured:featured.has(id),order:textSearchRecords.length,
            ...(next?{next}:{})});
        }
      }
    }
  }
  // Retired paragraph IDs remain resolvable; this does not re-create an erroneous
  // item/document relationship or approve the new source association.
  const paragraphRedirects=(c.editorial.paragraph_removals??[]).map(e=>({
    document:e.document,paragraph:e.paragraph,target_document:e.preserved_document,target_paragraph:e.preserved_paragraph,original_text_id:e.text
  }));
  write('paragraph-redirects.json',{note:'Retired occurrence IDs map to preserved paragraphs; item links remain independently reviewed.',redirects:paragraphRedirects});
  for(const [id,doc] of c.english){
    const m=doc.source_metadata;
    write(`english/${id}.json`,{id,display_title:{en:documentTitle(c,id),ar:text(c,doc.display_title?doc.display_title.ar:m.title_ar)},source_metadata:{title:text(c,m.title),title_ar:text(c,m.title_ar),
      section:text(c,m.section),chapter:text(c,m.chapter),translator_claim:claim(c,m.translator_claim),
      origin_claim:claim(c,m.origin_claim),method_claim:claim(c,m.method_claim),note_claim:claim(c,m.note_claim)},
      coverage:doc.coverage,reviewed:Boolean(doc.review),sources:doc.sources??[],
      paragraph_redirects:paragraphRedirects.filter(r=>r.document===id),
      paragraphs:doc.paragraphs.map(p=>({id:p.id,text:text(c,p.text),source_claim:claim(c,p.source_claim),sources:p.sources??[]}))});
  }
  function node(n:NavNode):unknown{return {title:text(c,n.title),item:n.item,source_level:n.source_level,
    source_page:n.source_page,source_page_series:n.source_page_series,
    ...('source_page_end' in n?{source_page_end:n.source_page_end}:{}),children:n.children.map(node)};}
  const resolvedSources=Object.fromEntries(Object.entries(c.sources.sources).map(([id,s])=>[id,{
    name:text(c,s.name),author:text(c,s.author),edition:text(c,s.edition),url:s.url??null,
    license:{status:s.license.status,name:text(c,s.license.name),url:s.license.url??null,
      evidence:text(c,s.license.evidence),allowed_uses:s.license.allowed_uses??[]},
    attribution:text(c,s.attribution),notes:text(c,s.notes)
  }]));
  write('sources.json',{sources:resolvedSources});
  writeText('legacy-attribution.md','# Historical attribution and rights claims (unverified)\n\n> The following is preserved from the original dataset. Claims of permission, public-domain status and attribution have not been independently verified.\n\n'+fs.readFileSync(path.join(c.root,'legacy-attribution.md'),'utf8'));
  write('catalog.json',{format_version:c.meta.format_version,items:catalog,featured:c.nav.featured,toc:c.nav.toc.map(node)});
  // Do not expose editorial history as a default runtime asset. An explicit
  // local-analysis build can request it separately from the reader catalog.
  if(options.includePageHistory){
    const pageBatches=c.editorial.navigation_page_corrections??[];
    const pageEvidence=Object.fromEntries([...new Set(pageBatches.map(batch=>batch.evidence))]
      .map(id=>[id,c.editorial.evidence[id]]));
    write('navigation-page-history.json',{evidence:pageEvidence,navigation_page_corrections:pageBatches});
  }
  const tocSearchRecords:SearchRecord[]=[];const shards:string[]=[];
  function indexToc(nodes:NavNode[],parents:string[],path:number[]=[]):void{
    nodes.forEach((n,i)=>{
      const title=text(c,n.title);const next=[...path,i];
      if(title)tocSearchRecords.push({key:`toc:${next.join('.')}`,section:'toc',item:n.item,language:'toc',
        text:title,normalized:normalizeSearch(title),featured:Boolean(n.item&&featured.has(n.item)),
        order:tocSearchRecords.length,tocPath:next.join('.'),...(parents.length?{context:parents.join(' › ')}:{})});
      indexToc(n.children,title?[...parents,title]:parents,next);
    });
  }
  if(includeSearch) {
    indexToc(c.nav.toc,[]);
    // TOC is immediately available. Fetch featured rows first and give Arabic a
    // head start within the featured/unfeatured groups. `order` remains source order.
    const prioritized=[
      ...textSearchRecords.filter(r=>r.featured&&r.language==='ar'),
      ...textSearchRecords.filter(r=>r.featured&&r.language==='fa'),
      ...textSearchRecords.filter(r=>!r.featured&&r.language==='ar'),
      ...textSearchRecords.filter(r=>!r.featured&&r.language==='fa'),
    ];
    for(let start=0;start<prioritized.length;start+=800){
      const shard=`search/${String(shards.length).padStart(3,'0')}.json`;
      shards.push(shard);write(shard,{version:4,records:prioritized.slice(start,start+800)});
    }
    const searchIndex:SearchIndex={version:4,normalization:'nfkd-search-v2',records:tocSearchRecords,shards};
    write('search-index.json',searchIndex);
  }
  write('manifest.json',{format_version:c.meta.format_version,normalization:'nfkd-search-v2',
    counts:{items:c.items.size,rows:checked.stats.rows,english_documents:c.english.size,english_paragraphs:checked.stats.paragraphs},
    // This warning is a runtime fact; it does not claim that review has been completed.
    warning:'Imported titles, translations, source claims, and alignments require review.'});
  if(!options.quiet){
    console.log(`Built ${catalog.length} lazy items, ${c.english.size} English documents and ${tocSearchRecords.length+textSearchRecords.length} search records in ${shards.length} shards into ${out}`);
    console.log('All original links and source claims are still unverified unless explicitly reviewed.');
  }
}

if(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildData();
