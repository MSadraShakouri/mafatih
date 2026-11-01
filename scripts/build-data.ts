import fs from 'node:fs';
import path from 'node:path';
import { claim, documentTitle, itemTitle, linksForItem, loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { normalizeSearch } from '../src/normalize.js';
import type { SearchEntry } from '../src/search.js';
import type { NavNode } from '../src/schema.js';

const c=loadCorpus();const checked=validateCorpus(c);
if(checked.errors.length)throw new Error(`Structural validation failed:\n${checked.errors.join('\n')}`);
const out=path.resolve('generated/web-data');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
function write(rel:string,value:unknown){const target=path.join(out,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value)+'\n','utf8');}
const featured=new Set(c.nav.featured);const catalog=[];const searchEntries:SearchEntry[]=[];
for(const id of c.nav.default_order){
  const item=c.items.get(id)!;const title=itemTitle(c,id);const tags=item.tags.map(x=>text(c,x));
  const links=linksForItem(c,id).map(l=>({document:l.document,kind:l.kind,coverage:c.english.get(l.document)!.coverage,reviewed:Boolean(l.review)}));
  // Source-page audio menus accidentally imported as Persian text remain in
  // canonical data/history but are not prayer rows or searchable content.
  const excludedAudioRows=item.rows.filter(r=>r.kind==='audio-reciter').length;
  const rows=item.rows.filter(r=>r.kind!=='audio-reciter').map(r=>({id:r.id,ar:text(c,r.ar),fa:text(c,r.fa),...(r.kind?{kind:r.kind}:{}),...(r.sources?{sources:r.sources}:{})}));
  catalog.push({id,title,category:item.category,...(item.quran?{quran:item.quran}:{}),tags,featured:featured.has(id),row_count:rows.length,
    excluded_audio_rows:excludedAudioRows,alignment_claim:item.legacy_alignment, titles_reviewed:Boolean(item.review?.titles),english:links});
  write(`items/${id}.json`,{id,legacy_id:item.legacy_id,title,category:item.category,...(item.quran?{quran:item.quran}:{}),tags,
    alignment_claim:item.legacy_alignment,ar_fa_reviewed:Boolean(item.review?.ar_fa),sources:item.sources??{},excluded_audio_rows:excludedAudioRows,rows,english:links,
    reviewed_alignment_groups:c.alignments.get(id)?.groups??[]});
  const enStrings:string[]=[];const seen=new Set<string>();
  for(const l of links){
    const doc=c.english.get(l.document)!;enStrings.push(documentTitle(c,l.document));
    for(const p of doc.paragraphs)if(!seen.has(p.text)){seen.add(p.text);enStrings.push(text(c,p.text));}
  }
  searchEntries.push({item:id,fields:{
    title:normalizeSearch([title.fa,title.ar,title.en].join(' ')),
    ar:normalizeSearch(rows.map(r=>r.ar).join(' ')),fa:normalizeSearch(rows.map(r=>r.fa).join(' ')),
    en:normalizeSearch(enStrings.join(' ')),tags:normalizeSearch(tags.join(' '))
  }});
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
  source_page:n.source_page,...('source_page_end' in n?{source_page_end:n.source_page_end}:{}),children:n.children.map(node)};}
const resolvedSources=Object.fromEntries(Object.entries(c.sources.sources).map(([id,s])=>[id,{
  name:text(c,s.name),author:text(c,s.author),edition:text(c,s.edition),url:s.url??null,
  license:{status:s.license.status,name:text(c,s.license.name),url:s.license.url??null,
    evidence:text(c,s.license.evidence),allowed_uses:s.license.allowed_uses??[]},
  attribution:text(c,s.attribution),notes:text(c,s.notes)
}]));
write('sources.json',{sources:resolvedSources});
fs.writeFileSync(path.join(out,'legacy-attribution.md'),'# Historical attribution and rights claims (unverified)\n\n> The following is preserved from the original dataset. Claims of permission, public-domain status and attribution have not been independently verified.\n\n'+fs.readFileSync(path.join(c.root,'legacy-attribution.md'),'utf8'));
write('catalog.json',{format_version:c.meta.format_version,items:catalog,featured:c.nav.featured,toc:c.nav.toc.map(node)});
write('search-index.json',{normalization:'nfkd-search-v1',entries:searchEntries});
write('manifest.json',{format_version:c.meta.format_version,normalization:'nfkd-search-v1',
  counts:{items:c.items.size,rows:checked.stats.rows,english_documents:c.english.size,english_paragraphs:checked.stats.paragraphs},
  // This warning is a runtime fact; it does not claim that review has been completed.
  warning:'Imported titles, translations, source claims, and alignments require review.'});
console.log(`Built ${catalog.length} lazy items, ${c.english.size} English documents and search into ${out}`);
console.log('All original links and source claims are still unverified unless explicitly reviewed.');
