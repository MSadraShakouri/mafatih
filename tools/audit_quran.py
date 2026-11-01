#!/usr/bin/env python3
"""Compare whole-chapter rows with separately supplied AlQuran Cloud editions.

The output is a TRIAGE REPORT, not translation or copyright approval.  The
reference files are not bundled: API availability is not a redistribution
license. See docs/substantive-audit.md for the endpoint and limitations.
"""
from __future__ import annotations
import argparse,collections,difflib,hashlib,json,pathlib,re,unicodedata,urllib.request

ROOT=pathlib.Path(__file__).resolve().parent.parent
DATA=ROOT/'data'
ENDPOINTS={'ar':('quran-quran-simple.json','quran-simple'),
           'fa':('quran-fa.ansarian.json','fa.ansarian'),
           'en':('quran-en-pickthall.json','en.pickthall')}
NUM_AR=re.compile(r'﴿\s*([0-9٠-٩۰-۹]+)\s*﴾')
NUM_FA=re.compile(r'[\(（]([0-9٠-٩۰-۹]+)[\)）]\s*$')
NUM_EN=re.compile(r'\((\d+)\)\s*$')

def load(p):return json.loads(p.read_text(encoding='utf-8'))
def number(s):return int(''.join(str(unicodedata.digit(x)) for x in s))
def fold(s):
    # Comparing after this lossy normalization finds gross discrepancies only.
    # It deliberately ignores diacritics, punctuation, spacing, Persian/Arabic
    # yeh/kaf variants, and some orthographic differences. It is not a proof.
    s=unicodedata.normalize('NFKD',s).translate(str.maketrans({'ك':'ک','ي':'ی','ى':'ی','ة':'ه','ؤ':'و','ئ':'ی'}))
    return ''.join(c.lower() for c in s if c.isalnum() and c!='ـ' and not unicodedata.category(c).startswith('M'))

def classify(actual,expected):
    return 'exact' if actual==expected else ('folded' if fold(actual)==fold(expected) else 'different')

def without_basmala(s):
    # Only strip from a first verse when it is prefixed to another verse,
    # never remove chapter 1 verse 1.  The basmala is still compared elsewhere.
    # U+0653 and other marks vary across editions; identify the source span by
    # the first four normalized words, not by replacing every occurrence.
    # Here we retain code-point boundaries for a prefix match.
    target=fold('بسم الله الرحمن الرحيم')
    for end in range(1,min(len(s),100)+1):
        if fold(s[:end])==target:
            while end<len(s) and unicodedata.category(s[end]).startswith('M'):
                end+=1
            return s[end:].lstrip(' ،,;؛\u200c\u200f')
    return s

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--source-dir',type=pathlib.Path,default=ROOT/'generated'/'quran-reference')
    ap.add_argument('--download',action='store_true',help='download comparison files locally, not as a license grant')
    ap.add_argument('--output',type=pathlib.Path,default=ROOT/'generated'/'audit'/'quran-comparison.json')
    args=ap.parse_args();args.source_dir.mkdir(parents=True,exist_ok=True)
    if args.download:
        for fname,edition in ENDPOINTS.values():
            target=args.source_dir/fname
            if not target.exists():
                with urllib.request.urlopen('https://api.alquran.cloud/v1/quran/'+edition,timeout=120) as response:
                    target.write_bytes(response.read())
    refs={}
    for lang,(fname,_) in ENDPOINTS.items():
        p=args.source_dir/fname
        if not p.exists():raise SystemExit(f'Missing {p}; supply --source-dir or use --download.')
        payload=load(p)
        if payload.get('code')!=200:raise SystemExit(f'Invalid API response: {p}')
        refs[lang]={surah['number']:{v['numberInSurah']:v['text'] for v in surah['ayahs']} for surah in payload['data']['surahs']}
    pool={}
    for f in sorted((DATA/'texts').glob('*.json')):pool.update(load(f))
    items=[];totals=collections.Counter();issues=[]
    for f in sorted((DATA/'items').glob('*.json')):
        item=load(f);chapter=item.get('quran',{}).get('chapter')
        if chapter is None:continue
        rows=item['rows'];current=[];seen=set();verse_results=[]
        for row in rows:
            a=pool.get(row['ar'],'');fa=pool.get(row['fa'],'')
            if row.get('kind')=='audio-reciter':continue
            if a:current.append(row)
            am=NUM_AR.findall(a);fm=NUM_FA.search(fa)
            if len(am)>1:
                issues.append({'item':f.stem,'row':row['id'],'type':'multiple-arabic-verse-labels'});continue
            if not am:
                if fm:issues.append({'item':f.stem,'row':row['id'],'type':'persian-label-without-arabic-label','verse':number(fm.group(1))})
                continue
            v=number(am[0]);seen.add(v)
            if v not in refs['ar'][chapter]:
                issues.append({'item':f.stem,'row':row['id'],'type':'verse-number-out-of-range','verse':v});current=[];continue
            if fm and number(fm.group(1))!=v:
                issues.append({'item':f.stem,'row':row['id'],'type':'arabic-persian-number-mismatch','ar':v,'fa':number(fm.group(1))})
            if not fm:issues.append({'item':f.stem,'row':row['id'],'type':'missing-persian-verse-label','verse':v})
            expected=refs['ar'][chapter][v];expected=without_basmala(expected) if v==1 and chapter not in (1,9) else expected
            candidates=[]
            # The pending window is bounded because an unrelated long introduction
            # should never be swallowed into a verse. Exact matches take priority.
            for k in range(min(len(current),9)):
                selected=current[-(k+1):]
                text=' '.join(NUM_AR.sub('',pool.get(x['ar'],'')).strip() for x in selected).strip()
                cmp=without_basmala(text) if v==1 and chapter not in (1,9) else text
                result=classify(cmp,expected)
                ratio=difflib.SequenceMatcher(None,fold(cmp),fold(expected),autojunk=False).ratio()
                candidates.append((result!='different',ratio,-k,selected,cmp,result))
            _,score,_,selected,actual,status=max(candidates,key=lambda x:(x[0],x[1],x[2]))
            # For an imperfect match the chosen range is a suggestion only.
            if status=='different':issues.append({'item':f.stem,'verse':v,'rows':[x['id'] for x in selected],'type':'arabic-comparison-different','similarity':round(score,4)})
            if len(selected)>1:issues.append({'item':f.stem,'verse':v,'rows':[x['id'] for x in selected],'type':'verse-spans-multiple-rows','match':status})
            totals['arabic_'+status]+=1
            fa_actual=' '.join(NUM_FA.sub('',pool.get(x['fa'],'')).strip() for x in selected if x['fa']).strip()
            fa_status=classify(fa_actual,refs['fa'][chapter][v]) if fa_actual else 'missing'
            totals['persian_'+fa_status]+=1
            verse_results.append({'verse':v,'rows':[x['id'] for x in selected], 'ar':status,'fa_ansarian':fa_status,'ar_similarity':round(score,4)})
            current=[]
        missing=sorted(set(refs['ar'][chapter])-seen)
        if missing:issues.append({'item':f.stem,'type':'verses-without-arabic-number','verses':missing})
        doc=DATA/'english'/f'surah-{chapter}.json';english=[]
        if doc.exists():
            for p in load(doc)['paragraphs']:
                value=pool[p['text']];m=NUM_EN.search(value)
                if not m:continue
                v=int(m.group(1))
                if v not in refs['en'][chapter]:issues.append({'item':f.stem,'paragraph':p['id'],'type':'english-verse-out-of-range','verse':v});continue
                status=classify(value[:m.start()].strip(),refs['en'][chapter][v]);totals['english_'+status]+=1
                if status!='exact':issues.append({'item':f.stem,'paragraph':p['id'],'verse':v,'type':'english-pickthall-'+status})
                english.append({'paragraph':p['id'],'verse':v,'status':status})
        items.append({'item':f.stem,'chapter':chapter,'expected_verses':len(refs['ar'][chapter]),'numbered_verses_seen':len(seen),'verses':verse_results,'english':english})
    output={'limitations':'Automated normalized comparison only; not scholarly alignment or rights verification. Group selection for mismatches is a suggestion. Source text is not bundled.',
            'editions':{lang:{'endpoint':'https://api.alquran.cloud/v1/quran/'+edition,'local_file':fname,
                              'sha256':hashlib.sha256((args.source_dir/fname).read_bytes()).hexdigest()} for lang,(fname,edition) in ENDPOINTS.items()},
            'totals':dict(sorted(totals.items())),'items':items,'issues':issues}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Whole chapters:',len(items),'comparison totals:',dict(sorted(totals.items())))
    print('Review issues:',dict(collections.Counter(x['type'] for x in issues)))
    print('Wrote',args.output)
if __name__=='__main__':main()
