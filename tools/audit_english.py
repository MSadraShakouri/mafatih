#!/usr/bin/env python3
"""Report potentially mixed English documents without inferring permission.

Optional --treasures compares complete paragraphs to the pinned upstream
record translations. All output is structural metadata, never copied reference
text; equality and duplication do not establish provenance, accuracy or rights.
"""
from __future__ import annotations
import argparse,collections,hashlib,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parent.parent;DATA=ROOT/'data'
PIN='e9bc183509323dd85b0a32c43901ca23eaabe660e68abe37bcb314dcba37e65f'
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def ws(s):return re.sub(r'\s+',' ',s).strip()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--treasures',type=pathlib.Path,help='optional exact pinned JSONL');ap.add_argument('--output',type=pathlib.Path,default=ROOT/'generated'/'audit'/'english-provenance.json');args=ap.parse_args()
    pool={}
    for f in sorted((DATA/'texts').glob('*.json')):pool.update(load(f))
    docs={f.stem:load(f) for f in sorted((DATA/'english').glob('*.json'))}
    relations=load(DATA/'relations.json')['english_links'];linked={r['document'] for r in relations}
    nontr=collections.defaultdict(list)
    for d,obj in docs.items():
        if re.match(r'^tr\d+-',d):continue
        for p in obj['paragraphs']:nontr[p['text']].append({'document':d,'paragraph':p['id']})
    ref_index=collections.defaultdict(list);refinfo=None
    if args.treasures:
        raw=args.treasures.read_bytes();digest=hashlib.sha256(raw).hexdigest()
        if digest!=PIN:raise SystemExit(f'Unrecognized reference SHA-256: {digest}')
        upstream=[json.loads(x) for x in raw.splitlines() if x.strip()]
        for r in upstream:
            s=ws(' '.join(row.get('translation','') for row in r['rows']))
            if len(s)>=80:ref_index[s].append(str(r['id']))
        refinfo={'records':len(upstream),'sha256':digest,'url':'https://raw.githubusercontent.com/KazTronics/AhlulBayt_Treasures/a59bd5f8fe078532622a08ea60c19d164fb425cb/duas_data.jsonl'}
    duplicates=[];source_occurrences=[];c=collections.Counter()
    for d,obj in docs.items():
        match=re.match(r'^tr(\d+)-',d)
        if not match:continue
        c['treasures_documents']+=1;origin=match.group(1)
        for p in obj['paragraphs']:
            if p['text'] in nontr:
                duplicates.append({'document':d,'paragraph':p['id'],'text_id':p['text'],'also_in':nontr[p['text']]})
            if args.treasures:
                ids=ref_index.get(ws(pool[p['text']]),[])
                status=('no-complete-record-match' if not ids else 'matches-parent' if origin in ids else 'matches-other-record' if len(ids)==1 else 'ambiguous-records')
                c[status]+=1
                if status in ('matches-other-record','ambiguous-records'):
                    source_occurrences.append({'document':d,'paragraph':p['id'],'document_record':origin,'possible_source_records':ids,'status':status})
    c['paragraphs_equal_to_nontr_occurrences']=len(duplicates)
    c['treasures_docs_with_nontr_paragraphs']=len({x['document'] for x in duplicates})
    c['empty_english_documents']=sum(not d['paragraphs'] for d in docs.values());c['unlinked_english_documents']=sum(d not in linked for d in docs)
    history=load(DATA/'editorial-history.json')
    report={'limitations':'Exact duplication is not proof of source ownership or permission. Whitespace-folded full-record matches and Arabic-clause matches are triage, not reviewed translation alignments. Other partial/mixed records may remain.',
            'reference':refinfo,'totals':dict(sorted(c.items())),'duplicate_paragraphs':duplicates,'unresolved_source_record_matches':source_occurrences,
            'empty_documents':[d for d,o in docs.items() if not o['paragraphs']],
            'created_source_documents':history.get('created_documents',[]),'retracted_links':history.get('retracted_links',[])}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['totals'],indent=2));print('Wrote',args.output)
if __name__=='__main__':main()
