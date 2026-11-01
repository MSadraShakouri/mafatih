import fs from 'node:fs';
import path from 'node:path';
import { loadCorpus, text, validateCorpus } from '../src/corpus.js';
import { foldArabic, findUniqueEnglish, uniqueOccurrence } from '../src/align-match.js';
import { codePoints, sha256, slicePoints } from '../src/text-ids.js';
import { potentiallySplitVerse } from '../src/quran-fragments.js';
import type { AlignmentGroup } from '../src/schema.js';

const args=process.argv.slice(2);const pos=args.indexOf('--treasures');const input=pos>=0?args[pos+1]:undefined;
const expectedHash='e9bc183509323dd85b0a32c43901ca23eaabe660e68abe37bcb314dcba37e65f';
const sourceUrl='https://raw.githubusercontent.com/KazTronics/AhlulBayt_Treasures/a59bd5f8fe078532622a08ea60c19d164fb425cb/duas_data.jsonl';
if(!input){console.error('Usage: npm run suggest:alignments -- --treasures /path/to/duas_data.jsonl ');process.exit(2);}
const raw=fs.readFileSync(input,'utf8');const digest=sha256(raw);
if(digest!==expectedHash)throw new Error(`Unexpected upstream SHA-256 ${digest}; inspect and explicitly update the pinned source URL and hash in this script before using a different dataset.`);
type UpRow={index:number;arabic:string;translation:string};type UpDoc={id:string;name:string;rows:UpRow[]};
const upstream=new Map<string,UpDoc>();
for(const line of raw.split(/\r?\n/)){if(!line.trim())continue;const d=JSON.parse(line) as UpDoc;if(upstream.has(String(d.id)))throw new Error(`duplicate upstream id ${d.id}`);upstream.set(String(d.id),d);}
const c=loadCorpus();const valid=validateCorpus(c);if(valid.errors.length)throw new Error(valid.errors.join('\n'));
type Bounds={row:string;start:number;end:number;sha256:string};
type Candidate={item:string;document:string;id:string;method:AlignmentGroup['method'];evidence:AlignmentGroup['evidence'];ar:Bounds[];fa:Bounds[];en:{document:string;paragraph:string;start:number;end:number;sha256:string}[];full_ar_rows:boolean;warning:string};
type DocSummary={item:string;document:string;manual:boolean;source_rows:number;eligible:number;matched:number;ambiguous_ar:number;missing_ar:number;missing_en:number;weak_match:boolean};
const candidates:Candidate[]=[];const docStats:DocSummary[]=[];
const makeBound=(row:string,value:string,start:number,end:number):Bounds=>({row,start,end,sha256:sha256(slicePoints(value,start,end))});
const makeId=(item:string,doc:string,label:string)=>'g-'+sha256(`${item}\0${doc}\0${label}`).slice(0,18);
for(const l of c.relations.english_links){
  const m=/^tr(\d+)-/.exec(l.document);if(!m||!m[1])continue;
  const source=upstream.get(m[1]);if(!source)continue;
  const item=c.items.get(l.item)!;const doc=c.english.get(l.document)!;
  const rows=item.rows.map(r=>({id:r.id,text:text(c,r.ar)}));const byId=new Map(rows.map(r=>[r.id,r.text]));
  const rowRecords=new Map(item.rows.map(r=>[r.id,r]));
  const folded=foldArabic(rows);const pars=doc.paragraphs.map(p=>({id:p.id,text:text(c,p.text)}));
  let eligible=0,matched=0,ambiguous_ar=0,missing_ar=0,missing_en=0;
  for(const sr of source.rows){
    const ar=foldArabic([{id:'s',text:sr.arabic??''}]).value;const en=sr.translation??'';
    if(ar.length<12||Array.from(en).length<8)continue;eligible++;
    const first=folded.value.indexOf(ar);if(first<0){missing_ar++;continue;}
    const at=uniqueOccurrence(folded.value,ar);if(at===null){ambiguous_ar++;continue;}
    const enRef=findUniqueEnglish(pars,en);if(!enRef){missing_en++;continue;}
    const entries=folded.map.slice(at,at+ar.length);const spans:Bounds[]=[];
    for(let k=0;k<entries.length;){
      const begin=entries[k]!;let j=k+1;while(j<entries.length&&entries[j]!.row===begin.row)j++;
      const last=entries[j-1]!;const value=byId.get(begin.row)!;const cps=codePoints(value);
      let end=last.point+1;while(end<cps.length && /\p{M}/u.test(cps[end]!))end++;
      spans.push(makeBound(begin.row,value,begin.point,end));k=j;
    }
    const allRowsFull=spans.every(s=>{const b=folded.rowBounds.get(s.row)!;return at<=b.start && at+ar.length>=b.end;});
    const fa:Bounds[]=[];
    if(allRowsFull)for(const s of spans){const row=rowRecords.get(s.row)!;const v=text(c,row.fa);if(v)fa.push(makeBound(s.row,v,0,codePoints(v).length));}
    const evalue=pars.find(p=>p.id===enRef.paragraph)!.text;
    candidates.push({item:l.item,document:l.document,id:makeId(l.item,l.document,`upstream-${sr.index}`),method:'source-row-match',
      evidence:{source_url:sourceUrl,source_record:String(source.id),source_row:sr.index,
        note:'Arabic matched after conservative folding and English text matched exactly; verify wording, Persian, context, and rights.'},
      ar:spans,fa,en:[{document:l.document,paragraph:enRef.paragraph,start:enRef.start,end:enRef.end,sha256:sha256(slicePoints(evalue,enRef.start,enRef.end))}],
      full_ar_rows:allRowsFull,warning:allRowsFull?'':'Arabic match covers only part of one or more rows; no Persian sub-span was inferred.'});
    matched++;
  }
  docStats.push({item:l.item,document:l.document,manual:item.legacy_alignment==='manual-v1',source_rows:source.rows.length,
    eligible,matched,ambiguous_ar,missing_ar,missing_en,weak_match:eligible>0&&matched<5&&matched/eligible<0.25});
}
const weakPairs=new Set(docStats.filter(x=>x.weak_match).map(x=>x.item+'\0'+x.document));
for(const candidate of candidates)if(weakPairs.has(candidate.item+'\0'+candidate.document))
  candidate.warning=[candidate.warning,'Weak overall source-document match; check the item relationship before accepting even a shared phrase.'].filter(Boolean).join(' ');
const treasuresCount=candidates.length;
const skippedQuranSplit:{item:string;verse:number;row:string;preceding_row:string}[]=[];
// The chapter relationships are explicitly proposals. Pair only unique numbered
// verses; no assumption is made that a translation or edition has been reviewed.
for(const l of c.relations.english_links.filter(x=>x.kind==='proposed-quran')){
  const item=c.items.get(l.item)!;const doc=c.english.get(l.document)!;
  const arNumbers=new Map<number,{row:typeof item.rows[number];value:string}[]>();
  for(const row of item.rows){const value=text(c,row.ar);const numbers=[...value.matchAll(/﴿\s*(\d+)\s*﴾/gu)].map(m=>Number(m[1]));
    if(numbers.length===1){const n=numbers[0]!;const list=arNumbers.get(n)??[];list.push({row,value});arNumbers.set(n,list);}}
  const enNumbers=new Map<number,{id:string;value:string}[]>();
  for(const para of doc.paragraphs){const value=text(c,para.text);const m=/\((\d+)\)\s*$/u.exec(value);if(m?.[1]){const n=Number(m[1]);const list=enNumbers.get(n)??[];list.push({id:para.id,value});enNumbers.set(n,list);}}
  for(const [n,ars] of arNumbers){const ens=enNumbers.get(n);if(ars.length!==1||ens?.length!==1)continue;
    const a=ars[0]!;const e=ens[0]!;let start=0;let note='Matched unique verse numbers in the proposed Quran chapter relationship; verify the text, translation and edition.';
    const rowIndex=item.rows.findIndex(r=>r.id===a.row.id);
    const safetyRows=item.rows.map(r=>({id:r.id,value:text(c,r.ar),kind:r.kind}));
    if(potentiallySplitVerse(safetyRows,rowIndex)){
      skippedQuranSplit.push({item:l.item,verse:n,row:a.row.id,preceding_row:item.rows[rowIndex-1]!.id});continue;
    }
    const first=item.rows[0];
    if(n===1&&first&&first.id!==a.row.id){
      const opening=foldArabic([{id:'opening',text:text(c,first.ar)}]).value;
      const verseFold=foldArabic([{id:'verse',text:a.value}]);
      if(opening.length>10&&verseFold.value.startsWith(opening)&&verseFold.map[opening.length]){
        start=verseFold.map[opening.length]!.point;note+=' The repeated opening phrase was excluded from this Arabic span; review the duplicate separately.';
      }
    }
    const faValue=text(c,a.row.fa);const normalizedDigits=faValue.replace(/[۰-۹٠-٩]/g,d=>String(Math.max('۰۱۲۳۴۵۶۷۸۹'.indexOf(d),'٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
    const faHasNumber=new RegExp(`\\(${n}\\)\\s*$`,'u').test(normalizedDigits);
    const ar=[makeBound(a.row.id,a.value,start,codePoints(a.value).length)];
    const fa=faValue&&faHasNumber?[makeBound(a.row.id,faValue,0,codePoints(faValue).length)]:[];
    candidates.push({item:l.item,document:l.document,id:makeId(l.item,l.document,`verse-${n}`),method:'quran-verse-number',
      evidence:{source_url:'https://api.alquran.cloud/v1/meta',source_record:l.document,source_row:n,note},ar,fa,
      en:[{document:l.document,paragraph:e.id,start:0,end:codePoints(e.value).length,sha256:sha256(e.value)}],
      full_ar_rows:start===0,warning:fa.length?'':'Persian verse number not confirmed; no Persian span proposed.'});
  }
  // A separate unnumbered basmala exists in all but chapter 1 in this import.
  const first=item.rows[0],para=doc.paragraphs[0];
  if(first&&para&&!/\(\d+\)\s*$/u.test(text(c,para.text))){
    const ar=text(c,first.ar),fa=text(c,first.fa),en=text(c,para.text);
    if(foldArabic([{id:'a',text:ar}]).value.startsWith('بسم')&&ar&&fa&&en){
      candidates.push({item:l.item,document:l.document,id:makeId(l.item,l.document,'opening'),method:'quran-verse-number',
        evidence:{source_url:'https://api.alquran.cloud/v1/meta',source_record:l.document,source_row:0,note:'Unnumbered opening matched by chapter context; review repeated opening and wording.'},
        ar:[makeBound(first.id,ar,0,codePoints(ar).length)],fa:[makeBound(first.id,fa,0,codePoints(fa).length)],
        en:[{document:l.document,paragraph:para.id,start:0,end:codePoints(en).length,sha256:sha256(en)}],full_ar_rows:true,warning:''});
    }
  }
}
const quranCount=candidates.length-treasuresCount;
candidates.sort((a,b)=>a.item.localeCompare(b.item,'en')||a.document.localeCompare(b.document,'en')||(a.evidence.source_row??0)-(b.evidence.source_row??0));
const manualCandidates=candidates.filter(x=>c.items.get(x.item)?.legacy_alignment==='manual-v1');
const summary={total:candidates.length,treasures_candidates:treasuresCount,quran_candidates:quranCount,
  manual_candidates:manualCandidates.length,manual_items:new Set(manualCandidates.map(x=>x.item)).size,
  partial_ar_candidates:candidates.filter(x=>!x.full_ar_rows).length,partial_no_fa_candidates:candidates.filter(x=>!x.full_ar_rows&&!x.fa.length).length,weak_source_links:docStats.filter(x=>x.weak_match).length,
  skipped_possible_split_verses:skippedQuranSplit.length};
const output={format_version:1,warning:'Machine-generated candidate links only. They are NOT reviewed alignments or verified translations.',
  upstream:{url:sourceUrl,sha256:digest},summary,doc_stats:docStats,skipped_possible_split_verses:skippedQuranSplit,candidates};
const out=path.resolve('generated/review');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'alignment-candidates.json'),JSON.stringify(output)+'\n');
console.log(JSON.stringify(summary,null,2));
console.log(`Wrote ${path.join(out,'alignment-candidates.json')} (all need review).`);
