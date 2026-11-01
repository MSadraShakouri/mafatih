#!/usr/bin/env python3
"""Triage Arabic/Persian pairs against a separately obtained reference corpus.

This is an evidence-finding aid, not an independent translation review. The
reference repository has no stated license; its contents are NOT redistributed.
For deterministic results pass the documented pinned checkout. Never accept a
match or mismatch solely on this report; the source has indexing/title errors,
text variants and overlapping paragraphs, and relative positions are heuristic.
"""
from __future__ import annotations
import argparse,collections,json,pathlib,subprocess,unicodedata

ROOT=pathlib.Path(__file__).resolve().parent.parent
DATA=ROOT/'data'
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def norm(s):
    s=unicodedata.normalize('NFKD',s).translate(str.maketrans({'ك':'ک','ي':'ی','ى':'ی','ة':'ه','ؤ':'و','ئ':'ی'}))
    return ''.join(c.lower() for c in s if c.isalnum() and c!='ـ' and not unicodedata.category(c).startswith('M'))
def occurrences(s,needle,limit=3):
    found=[];start=0
    while len(found)<limit:
        p=s.find(needle,start)
        if p<0:break
        found.append(p);start=p+1
    return found
def locate(ref,lang,pos,length):
    return [seg for start,end,seg in ref[lang+'B'] if start<pos+length and end>pos]

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--reference-dir',required=True,type=pathlib.Path,help='path to type 4/Babs in the separate pinned reference checkout')
    ap.add_argument('--all',action='store_true',help='scan all items, not only the 54 manual-v1 items')
    ap.add_argument('--output',type=pathlib.Path,default=ROOT/'generated'/'audit'/'parallel-comparison.json');args=ap.parse_args()
    pool={}
    for f in sorted((DATA/'texts').glob('*.json')):pool.update(load(f))
    items={}
    for f in sorted((DATA/'items').glob('*.json')):
        o=load(f)
        if not args.all and o.get('legacy_alignment')!='manual-v1':continue
        rows=[]
        for r in o['rows']:
            if r.get('kind')=='audio-reciter':continue
            rows.append({'id':r['id'],'ar':norm(pool.get(r['ar'],'')),'fa':norm(pool.get(r['fa'],''))})
        items[f.stem]={'rows':rows,'manual':o.get('legacy_alignment')=='manual-v1'}
    refs={};skipped=0
    for f in sorted(args.reference_dir.glob('*/*.json')):
        raw=load(f);v=next(iter(raw.values()),{});ars=v.get('arabic',{});fas=v.get('farsi',{})
        if not isinstance(ars,dict) or not isinstance(fas,dict) or not ars or not fas:skipped+=1;continue
        rid=str(f.relative_to(args.reference_dir));ref={'title':v.get('title',''),'ar':'','fa':'','arB':[],'faB':[]}
        for key in sorted(ars,key=lambda x:(len(x),x)):
            for lang,words in [('ar',ars),('fa',fas)]:
                value=norm(words.get(key,''));start=len(ref[lang]);ref[lang]+=value;ref[lang+'B'].append((start,start+len(value),key))
        refs[rid]=ref
    if not refs:raise SystemExit('No reference documents found. Supply the checkout path ending in type 4/Babs.')
    # Anchor long Arabic rows across the entire reference library. No title or
    # positional matching; a full normalized row must occur in a reference doc.
    anchor=collections.defaultdict(list)
    for item,v in items.items():
        for r in v['rows']:
            if len(r['ar'])>=24:anchor[r['ar'][:16]].append((item,r['id'],r['ar']))
    hits=collections.defaultdict(collections.Counter)
    for rid,ref in refs.items():
        haystack=ref['ar'];found=set()
        for pos in range(max(0,len(haystack)-15)):
            for item,row,needle in anchor.get(haystack[pos:pos+16],()):
                if (item,row) not in found and haystack.startswith(needle,pos):
                    found.add((item,row));hits[item][rid]+=1
    summaries=[];findings=[];totals=collections.Counter()
    for item,obj in sorted(items.items()):
        ranked=hits[item].most_common(3);eligible=sum(len(r['ar'])>=24 for r in obj['rows'])
        if not ranked:
            summaries.append({'item':item,'manual':obj['manual'],'eligible_ar_rows':eligible,'reference':None,'status':'no-reference-match','pairs':{}});totals['no-reference-match']+=1;continue
        rid,matched_count=ranked[0];next_count=ranked[1][1] if len(ranked)>1 else 0
        status='candidate' if matched_count>=3 and matched_count>next_count else 'ambiguous-or-weak'
        ref=refs[rid];counts=collections.Counter()
        for r in obj['rows']:
            A,F=r['ar'],r['fa']
            if len(A)<16 or len(F)<16:continue
            aa=occurrences(ref['ar'],A);ff=occurrences(ref['fa'],F)
            if len(aa)!=1 or len(ff)!=1:
                key='ar-multiple' if len(aa)>1 else 'ar-not-found' if not aa else 'fa-multiple' if len(ff)>1 else 'fa-not-found'
                counts[key]+=1;continue
            ac=locate(ref,'ar',aa[0],len(A));fc=locate(ref,'fa',ff[0],len(F))
            if set(ac)&set(fc):
                counts['same-source-paragraph']+=1
                if len(ac)==len(fc)==1:
                    k=ac[0];ab=next((a,b) for a,b,n in ref['arB'] if n==k);fb=next((a,b) for a,b,n in ref['faB'] if n==k)
                    if ab[1]>ab[0] and fb[1]>fb[0]:
                        arx=(aa[0]-ab[0]+len(A)/2)/(ab[1]-ab[0]);fax=(ff[0]-fb[0]+len(F)/2)/(fb[1]-fb[0]);delta=abs(arx-fax)
                        if delta>.18:
                            findings.append({'type':'relative-offset','item':item,'row':r['id'],'reference':rid,'reference_paragraph':k,'delta':round(delta,3),'reference_status':status})
            else:
                counts['different-source-paragraphs']+=1
                findings.append({'type':'different-source-paragraphs','item':item,'row':r['id'],'reference':rid,'ar_paragraphs':ac,'fa_paragraphs':fc,'reference_status':status})
        totals[status]+=1;totals.update(counts)
        summaries.append({'item':item,'manual':obj['manual'],'eligible_ar_rows':eligible,'reference':rid,'reference_title':ref['title'],
                          'matched_ar_rows':matched_count,'next_best_count':next_count,'status':status,'pairs':dict(sorted(counts.items()))})
    expected_commit='881c6edcc7efaf5f3975cd6aa4e9c7771426995d'
    try:
        actual_commit=subprocess.check_output(['git','-C',str(args.reference_dir),'rev-parse','HEAD'],text=True,stderr=subprocess.DEVNULL).strip()
    except (subprocess.CalledProcessError,FileNotFoundError):actual_commit=None
    result={'limitations':'Lossy text matching and coarse paragraph positions, not verification. Reference titles/indexes can be wrong; ambiguous candidates, differences, and absences require human review.',
            'reference':{'url':'https://github.com/kazemcodes/mafatih_db','expected_commit':expected_commit,'actual_commit':actual_commit,'commit_matches':actual_commit==expected_commit,'note':'No license found; reference text not bundled.'},
            'mode':'all' if args.all else 'manual-v1','reference_documents':len(refs),'skipped_reference_documents':skipped,
            'totals':dict(sorted(totals.items())),'summaries':summaries,'findings':findings}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Items:',len(items),'references:',len(refs),'totals:',dict(sorted(totals.items())))
    print('Findings requiring review:',dict(collections.Counter(x['type'] for x in findings)))
    print('Wrote',args.output)
if __name__=='__main__':main()
