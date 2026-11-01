import fs from 'node:fs';
import path from 'node:path';
import { documentTitle, itemTitle, linksForItem, loadCorpus, text, validateCorpus, walkNavigation } from '../src/corpus.js';
import { compactSearch } from '../src/normalize.js';
const c=loadCorpus();const r=validateCorpus(c);if(r.errors.length)throw new Error(r.errors.join('\n'));
const dir=path.resolve('generated/audit');fs.mkdirSync(dir,{recursive:true});
function csv(rows:(string|number)[][]){return rows.map(row=>row.map(v=>{let s=String(v);if(/^[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\n')+'\n';}
const normalTitle=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const mismatches:[string,string,string,string,string][]=[];
for(const l of c.relations.english_links){
  if(l.kind!=='legacy-primary'&&l.kind!=='legacy-primary-only')continue;
  const t=itemTitle(c,l.item);const dt=documentTitle(c,l.document);
  if(t.en && dt && normalTitle(t.en)!==normalTitle(dt))mismatches.push([l.item,t.fa,t.en,l.document,dt]);
}
fs.writeFileSync(path.join(dir,'title-comparison.csv'),csv([['item','persian_title','item_english_title','linked_document','document_title'],...mismatches]));
const edits=c.editorial.metadata_corrections.map(x=>{const item=c.items.get(x.item)!;const lang=x.field==='title.ar'?'ar':'en';return [x.item,x.field,text(c,x.previous),text(c,x.replacement),text(c,item.title[lang]),x.source_document,c.editorial.evidence[x.evidence]?.url??''];});
fs.writeFileSync(path.join(dir,'editorial-corrections.csv'),csv([['item','field','previous_value','replacement_at_correction','current_value','source_document','evidence_url'],...edits]));
const displayEdits=[...c.english].filter(([,d])=>d.display_title).map(([id,d])=>[id,text(c,d.source_metadata.title),text(c,d.display_title?.en),text(c,d.source_metadata.title_ar),text(c,d.display_title?.ar),d.display_title?.evidence?c.editorial.evidence[d.display_title.evidence]?.url??'':'']);
fs.writeFileSync(path.join(dir,'document-display-overrides.csv'),csv([['document','original_english_title','display_english_title','original_arabic_title','display_arabic_title','evidence_url'],...displayEdits]));
const linked=new Set(c.relations.english_links.map(x=>x.document));
const unlinked=[...c.english.keys()].filter(x=>!linked.has(x)).sort();
fs.writeFileSync(path.join(dir,'unlinked-english.csv'),csv([['document','source_title','paragraph_count'],...unlinked.map(id=>[id,documentTitle(c,id),c.english.get(id)!.paragraphs.length] as [string,string,number])]));
const granularities:{item:string;row:string;alignment:string;ar:number;fa:number;newline:boolean}[]=[];
for(const [itemId,it] of c.items)for(const row of it.rows){const ar=text(c,row.ar),fa=text(c,row.fa);granularities.push({item:itemId,row:row.id,alignment:it.legacy_alignment??'none',ar:Array.from(ar).length,fa:Array.from(fa).length,newline:ar.includes('\n')||fa.includes('\n')});}
granularities.sort((a,b)=>Math.max(b.ar,b.fa)-Math.max(a.ar,a.fa)||a.item.localeCompare(b.item,'en')||a.row.localeCompare(b.row,'en'));
fs.writeFileSync(path.join(dir,'row-granularity.csv'),csv([['item','row','legacy_alignment','arabic_codepoints','persian_codepoints','contains_newline'],...granularities.map(x=>[x.item,x.row,x.alignment,x.ar,x.fa,String(x.newline)])]));
const manual=[...c.items.values()].filter(x=>x.legacy_alignment==='manual-v1');
const emptyDocs=[...c.english].filter(([,v])=>v.paragraphs.length===0).map(([id])=>id).sort();
const kindCounts=new Map<string,number>();for(const x of c.relations.english_links)kindCounts.set(x.kind,(kindCounts.get(x.kind)??0)+1);
let bomRows=0;for(const item of c.items.values())for(const row of item.rows)if(text(c,row.ar).includes('\uFEFF')||text(c,row.fa).includes('\uFEFF'))bomRows++;
const quranDuplicates:string[]=[];
for(const link of c.relations.english_links.filter(x=>x.kind==='proposed-quran')){
  const item=c.items.get(link.item)!;const a=item.rows[0];const b=item.rows[1];
  if(a&&b){const first=compactSearch(text(c,a.ar));const second=compactSearch(text(c,b.ar));
    if(first.length>10&&second.startsWith(first))quranDuplicates.push(link.item);}
}
const badPages:string[]=[];walkNavigation(c.nav.toc,n=>{if(n.source_page!=null&&n.source_page_end!=null&&n.source_page_end<n.source_page)badPages.push(`${text(c,n.title)}: ${n.source_page}–${n.source_page_end}`)});
let candidateNote='Candidate report not yet generated. Run the alignment-suggestion command described in README.';
const suggestionPath=path.resolve('generated/review/alignment-candidates.json');
if(fs.existsSync(suggestionPath)){
  const data=JSON.parse(fs.readFileSync(suggestionPath,'utf8')) as {summary:{total:number;manual_items:number;manual_candidates:number;quran_candidates:number;treasures_candidates:number;weak_source_links:number;partial_ar_candidates:number;partial_no_fa_candidates:number};doc_stats:{item:string;document:string;manual:boolean;source_rows:number;eligible:number;matched:number;ambiguous_ar:number;missing_ar:number;missing_en:number;weak_match:boolean}[]};
  fs.writeFileSync(path.join(dir,'source-match-summary.csv'),csv([['item','document','manual_claim','source_rows','eligible','matched','ambiguous_ar','missing_ar','missing_en','weak_match'],...data.doc_stats.map(x=>[x.item,x.document,String(x.manual),x.source_rows,x.eligible,x.matched,x.ambiguous_ar,x.missing_ar,x.missing_en,String(x.weak_match)])]));
  candidateNote=`${data.summary.total} generated candidates: ${data.summary.treasures_candidates} source-row matches and ${data.summary.quran_candidates} verse-number matches. ${data.summary.manual_candidates} involve ${data.summary.manual_items} imported manual-v1 items. ${data.summary.partial_ar_candidates} candidates cover partial Arabic rows; ${data.summary.partial_no_fa_candidates} of those have no proposed Persian span. The remaining partial-row candidates have a separately numbered Persian Quran verse, still requiring review. ${data.summary.weak_source_links} source document links have weak Arabic coverage. None is independently verified.`;
}
const lines=[
 '# Mafatih content audit',
 '',
 '**Structural validation passed. This is not a verification of religious wording, alignment, translation accuracy or rights.**',
 '',
 '## Inventory',
 `- ${c.items.size} items; ${r.stats.rows} ordered Arabic/Persian rows.`,
 `- ${[...c.items.values()].filter(x=>x.quran).length} whole-surah items have a chapter-number reference checked against Quran metadata.`,
 `- ${manual.length} items / ${manual.reduce((n,x)=>n+x.rows.length,0)} rows carry the old manual-v1 claim; ${c.items.size-manual.length} items / ${r.stats.rows!-manual.reduce((n,x)=>n+x.rows.length,0)} rows carry no manual-v1 claim.`,
 `- ${r.stats.faOnlyRows} rows have Persian only; ${r.stats.arOnlyRows} have Arabic only. These are not automatically classified as notes.`,
 `- Length heuristic: ${granularities.filter(x=>x.alignment==='manual-v1'&&x.ar>500).length} manual-v1 rows and ${granularities.filter(x=>x.alignment!=='manual-v1'&&x.ar>500).length} other rows exceed 500 Arabic code points. Row length does not prove alignment quality; see row-granularity.csv.`,
 `- ${c.english.size} English documents / ${r.stats.paragraphs} paragraph occurrences.`,
 `- ${c.texts.size} unique exact text strings in the shared pool; repeated occurrences refer to the same string.`,
 `- Relationships: ${[...kindCounts].map(([k,v])=>`${k}: ${v}`).join('; ')}. ${c.relations.english_links.filter(x=>!x.review).length} relationship(s) have no recorded review.`,
 `- ${unlinked.length} English documents have no item relationship in the current data. Do not delete them without review.`,
 `- ${emptyDocs.length} English documents have no paragraphs: ${emptyDocs.join(', ')}.`,
 `- ${r.stats.reviewedGroups} reviewed alignment groups exist in source.`,
 '',
 '## Translation and alignment',
 `- ${candidateNote}`,
 '- The old manual-v1 label is an imported claim, not a newly verified AR/FA alignment. Coarse source-paired rows may contain many sentences.',
 '- Existing English is macro-paragraph level. Source-row and verse-number candidates use references to exact original text; they are not newly written translations.',
 '- Partial upstream source-row matches have no Persian span. Partial Quran verse matches may include a separately numbered whole Persian row; all require review before use as three-way alignments.',
 '- Original per-document and per-paragraph source claims were retained, but source permissions have not been verified.',
 '',
 '## Priority checks',
 `- ${mismatches.length} imported item-English titles differ from the linked English document title after simple comparison. Many are benign spelling or scope differences; review the CSV, do not auto-correct.`,
 `- ${c.editorial.metadata_corrections.length} Arabic/English item-title fields on ${new Set(c.editorial.metadata_corrections.map(x=>x.item)).size} items have recorded corrections, including Quran and other topics; prior values are retained. ${displayEdits.length} English documents have editorial display overrides; their original titles remain in source metadata. Human review is still needed.`,
 `- ${c.editorial.row_corrections?.length??0} targeted row-text corrections, ${c.editorial.row_insertions?.length??0} instruction-row insertions and ${c.editorial.row_classifications?.length??0} audio-menu classifications are recorded in editorial history. Audio-menu rows remain in canonical data but are excluded from runtime prayer rows.`,
 `- ${c.editorial.retracted_links?.length??0} mismatched relationships were retracted and ${c.editorial.created_documents?.length??0} distinct source records were split out. ${c.editorial.paragraph_removals?.length??0} retired paragraph locations have explicit redirects to preserved destinations. New source-record links are proposals, not reviewed translations.`, 
 `- ${quranDuplicates.length} proposed Quran items appear to repeat the opening basmala in the first two Arabic rows: ${quranDuplicates.join(', ')||'none'}. Compare with the edition before editing.`,
 `- ${bomRows} current AR/FA rows contain U+FEFF; inspect any remaining occurrences.`, 
 `- Reversed source page ranges: ${badPages.length?badPages.join('; '):'none detected'}.`,
 '- Check modern edition, translator and redistribution rights; old attribution is a claim, not proof of permission.',
 '',
 '## Generated review files',
 '- title-comparison.csv: possible title/link mismatches (not automatic errors).',
 '- row-granularity.csv: code-point lengths and newline presence for every row; useful for prioritizing coarse rows.',
 '- editorial-corrections.csv and document-display-overrides.csv: current and historical title values plus evidence.',
 '- unlinked-english.csv: preserved English documents without item links.',
 '- source-match-summary.csv: matched, ambiguous and missing upstream rows per document, when candidates have been generated.',
 '- ../review/alignment-candidates.json and review.html: created by the optional alignment-suggestion/review commands.',
 '',
 'This report is generated and should not be committed as canonical content.'
];
const report=lines.join('\n')+'\n';fs.writeFileSync(path.join(dir,'audit.md'),report);console.log(report);
