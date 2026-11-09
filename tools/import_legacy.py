#!/usr/bin/env python3
"""One-time import of the original mafatih-app-data repository.

Writes a NEW empty destination. Never run over curated data. The original corpus is
required as an argument and is not embedded in this script. Exact text values are
interned in content-addressed shards; references are occurrence-specific.
"""
from __future__ import annotations
import argparse, hashlib, json, pathlib, shutil, subprocess


def dump(path: pathlib.Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    ap=argparse.ArgumentParser()
    ap.add_argument('--source', required=True, type=pathlib.Path)
    ap.add_argument('--destination', required=True, type=pathlib.Path,
                    help='A new empty directory, NOT an existing data directory')
    ap.add_argument('--commit', help='Original 40-character commit SHA; inferred from Git if omitted')
    ap.add_argument('--repository', default='https://github.com/MSadraShakouri/mafatih')
    args=ap.parse_args(); src=args.source.resolve(); dest=args.destination.resolve()
    commit=args.commit
    if not commit:
        try: commit=subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True,stderr=subprocess.DEVNULL).strip()
        except Exception: ap.error('supply --commit if source is not a Git checkout')
    if len(commit)!=40 or any(c not in '0123456789abcdef' for c in commit): ap.error('--commit must be a lowercase 40-character Git SHA')
    if dest.exists() and any(dest.iterdir()):
        ap.error('destination must be empty; never overwrite curated content')
    dest.mkdir(parents=True, exist_ok=True)
    load=lambda x: json.loads(x.read_text(encoding='utf-8'))
    idx=load(src/'index.json'); prov=load(src/'EN_PROVENANCE.json'); original_manifest=load(src/'manifest.json')
    items={f.stem:load(f) for f in sorted((src/'items').glob('*.json'))}
    ens={f.stem:load(f) for f in sorted((src/'en').glob('*.json'))}
    pdocs={v['id']:v for v in prov['en_blocks']}
    if len(items)!=len(idx['items']) or len(ens)!=len(idx['en']) or set(ens)!=set(pdocs):
        raise ValueError('source inventory mismatch')
    original_order=[x['slug'] for x in idx['items']]
    if len(set(original_order))!=len(original_order) or set(original_order)!=set(items):
        raise ValueError('duplicate, missing, or extra items')
    for index_item in idx['items']:
        original=items[index_item['slug']]
        for key in ('slug','legacy_id','title','category','featured','tags','align','en_id'):
            if index_item.get(key)!=original.get(key): raise ValueError(f'index/item metadata conflict {index_item["slug"]}: {key}')
        if index_item['rows_count']!=len(original['rows']): raise ValueError('stale row count: '+index_item['slug'])
    if set(idx['stars'])!={k for k,v in items.items() if v['featured']}: raise ValueError('featured flags and stars disagree')
    for entry in idx['en']:
        original=ens[entry['id']]
        if entry['covers_item_slugs']!=original['covers_item_slugs'] or entry['translator']!=original['translator']: raise ValueError('English index/file conflict: '+entry['id'])
    textpool={}; statements={}
    def intern(text):
        if text is None: return None
        if not isinstance(text,str): raise TypeError(f'expected string, got {type(text)}')
        ident='t'+hashlib.sha256(text.encode('utf-8')).hexdigest()[:24]
        if ident in textpool and textpool[ident]!=text: raise RuntimeError('text id collision')
        textpool[ident]=text
        return ident
    def claim(text):
        if not text: return None
        ident='c'+hashlib.sha256(text.encode('utf-8')).hexdigest()[:24]
        tid=intern(text)
        if ident in statements and statements[ident]!=tid: raise RuntimeError('claim id collision')
        statements[ident]=tid
        return ident
    missing_reason={r['id']:r for r in prov.get('items_without_en',[])}
    legacy_to_slug={v['legacy_id']:k for k,v in items.items()}
    if len(legacy_to_slug)!=len(items): raise ValueError('duplicate legacy id')
    for slug in original_order:
        o=items[slug]
        if o['slug']!=slug: raise ValueError('item filename/slug mismatch: '+slug)
        record={'legacy_id':o['legacy_id'],
                'title':{lang:intern(o['title'].get(lang)) for lang in ['fa','ar','en']},
                'category':o['category'], 'tags':[intern(t) for t in o['tags']],
                'legacy_alignment':o.get('align'),
                'rows':[]}
        reason=missing_reason.get(o['legacy_id'])
        if reason:
            record['legacy_missing_english_reason_claim']=claim(reason['reason'])
            if reason['title']!=o['title'].get('fa'):
                record['legacy_missing_english_title']=intern(reason['title'])
            if reason['rows']!=len(o['rows']) or reason['ar_rows']!=sum(bool(r['ar']) for r in o['rows']):
                raise ValueError('legacy missing-English ledger count mismatch: '+slug)
        for i,r in enumerate(o['rows'],1):
            record['rows'].append({'id':f'r{i:05d}', 'ar':intern(r['ar']) if r['ar'] else None, 'fa':intern(r['fa']) if r['fa'] else None})
        dump(dest/'items'/f'{slug}.json',record)
    primary={o['slug']:o.get('en_id') for o in items.values() if o.get('en_id')}
    rel=[]
    for ident,e in ens.items():
        if e['id']!=ident: raise ValueError('English filename/id mismatch: '+ident)
        pr=pdocs[ident]
        expected=[legacy_to_slug[x] for x in pr.get('covers_item_ids',[])]
        if expected!=e['covers_item_slugs']: raise ValueError('provenance coverage mismatch: '+ident)
        para_sources=pr.get('para_sources')
        if para_sources is not None and len(para_sources)!=len(e['paras']):
            raise ValueError('per-paragraph source length mismatch: '+ident)
        meta={'title':intern(e.get('title')), 'title_ar':intern(e.get('titleAr')),
              'section':intern(e.get('section')), 'chapter':intern(e.get('chapter')),
              'translator_claim':claim(e.get('translator')),
              'origin_claim':claim(pr['origin']),
              'method_claim':claim(pr.get('method')), 'note_claim':claim(pr.get('note'))}
        doc={'source_metadata':meta,'coverage':'unknown','paragraphs':[]}
        for i,text in enumerate(e['paras'],1):
            paragraph={'id':f'p{i:05d}','text':intern(text)}
            if para_sources is not None: paragraph['source_claim']=claim(para_sources[i-1])
            doc['paragraphs'].append(paragraph)
        dump(dest/'english'/f'{ident}.json',doc)
        for slug in e['covers_item_slugs']:
            if slug not in items: raise ValueError('unknown covered item: '+slug)
            role='legacy-primary' if primary.get(slug)==ident else 'legacy-coverage'
            rel.append({'item':slug,'document':ident,'kind':role})
    pairs={(x['item'],x['document']) for x in rel}
    for slug,eid in primary.items():
        if eid not in ens: raise ValueError('missing primary English: '+eid)
        if (slug,eid) not in pairs:
            rel.append({'item':slug,'document':eid,'kind':'legacy-primary-only'})
    rel.sort(key=lambda x:(x['item'],x['document'],x['kind']))
    dump(dest/'relations.json',{'english_links':rel})
    # The old page values do not establish an edition/numbering series and can
    # be zero or reversed. Quarantine them exactly instead of inventing printed
    # page numbers. Occurrence paths are the positions at import time.
    page_changes=[]
    def nav_node(n,path):
        title=intern(n['title']); previous={'start':n.get('page')}; replacement={'start':None}
        if 'page_end' in n:previous['end']=n['page_end'];replacement['end']=None
        replacement['series']=None
        observation={'kind':'legacy-unmapped','heading':None,'previous_footer':None,'next_footer':None,
                     'last_text_footer':None,'subtree_footer':None,'descendant_max_end':None}
        page_changes.append({'path':path,'title':title,'item':n.get('item_id'),'source_level':n['level'],
                             'previous':previous,'replacement':replacement,'observation':observation})
        result={'title':title, 'source_level':n['level'], 'source_page':None, 'source_page_series':None,
                'item':n.get('item_id'), 'children':[nav_node(c,path+[i]) for i,c in enumerate(n.get('children',[]))]}
        if 'page_end' in n:result['source_page_end']=None
        return result
    navigation={'default_order':original_order,'featured':idx['stars'],
                'toc':[nav_node(n,[i]) for i,n in enumerate(idx['toc'])]}
    dump(dest/'navigation.json',navigation)
    dump(dest/'claims.json',{k:statements[k] for k in sorted(statements)})
    dump(dest/'sources.json',{'sources':{}})
    editorial={'evidence':{},'metadata_corrections':[]}
    if page_changes:
        evidence='legacy-navigation-unmapped'
        editorial['evidence'][evidence]={'url':args.repository,
          'description':f'Raw navigation page fields from legacy import commit {commit}. Their edition, numbering series and parser semantics are unverified; retained exactly in history rather than interpreted as printed page numbers.'}
        editorial['navigation_page_corrections']=[{'method':'legacy-unmapped-v1','date':None,'evidence':evidence,
                                                   'source_sha256':None,'changes':page_changes}]
    dump(dest/'editorial-history.json',editorial)
    shards={}
    for key,value in textpool.items():shards.setdefault(key[1:3],{})[key]=value
    for shard,mapping in shards.items():dump(dest/'texts'/f'{shard}.json',{k:mapping[k] for k in sorted(mapping)})
    dump(dest/'corpus.json',{'format_version':1,
        'legacy_import':{'repository':args.repository,
                         'commit':commit,
                         'original_build_date':original_manifest.get('built','unknown')},
        'review_policy':'All imported relationships, translations, alignments and rights claims require review.'})
    shutil.copyfile(src/'CREDITS.md',dest/'legacy-attribution.md')
    (dest/'alignments').mkdir(exist_ok=True)
    # Verify round-trip of every original textual field and sequence; output is not saved in source data.
    def resolve(k):return None if k is None else textpool[k]
    for slug,o in items.items():
        v=load(dest/'items'/f'{slug}.json')
        assert [(resolve(r['ar']) or '',resolve(r['fa']) or '') for r in v['rows']]==[(r['ar'],r['fa']) for r in o['rows']],slug
        assert v['legacy_id']==o['legacy_id'] and v['category']==o['category'] and v['legacy_alignment']==o['align'],slug
        assert [resolve(x) for x in v['tags']]==o['tags'],slug
        for lang in ('fa','ar','en'):
            assert (None if v['title'][lang] is None else resolve(v['title'][lang]))==o['title'].get(lang), (slug,lang)
    for ident,o in ens.items():
        v=load(dest/'english'/f'{ident}.json');m=v['source_metadata'];pr=pdocs[ident]
        assert [resolve(x['text']) for x in v['paragraphs']]==o['paras'],ident
        for target,old in [('title','title'),('title_ar','titleAr'),('section','section'),('chapter','chapter')]:
            assert resolve(m[target])==o[old],(ident,target)
        assert resolve(statements[m['origin_claim']])==pr['origin'],ident
        assert (None if m['translator_claim'] is None else resolve(statements[m['translator_claim']]))==o['translator'],ident
        for field in ('method','note'):
            c=m[field+'_claim']; assert (None if c is None else resolve(statements[c]))==pr.get(field),(ident,field)
        if pr.get('para_sources') is not None:
            assert [resolve(statements[x['source_claim']]) for x in v['paragraphs']]==pr['para_sources'],ident
    prior_pages={tuple(e['path']):e['previous'] for e in page_changes}
    def unnav(n,path):
        prior=prior_pages[tuple(path)]
        x={'title':resolve(n['title']),'level':n['source_level'],'page':prior['start'],
           'item_id':n['item'],'children':[unnav(c,path+[i]) for i,c in enumerate(n['children'])]}
        if 'end' in prior:x['page_end']=prior['end']
        return x
    assert [unnav(n,[i]) for i,n in enumerate(navigation['toc'])]==idx['toc']
    print('ROUND-TRIP PASS:')
    print(f"  {len(items)} items, {sum(len(x['rows']) for x in items.values())} ordered AR/FA rows")
    print(f"  {len(ens)} English documents, {sum(len(x['paras']) for x in ens.values())} ordered paragraphs")
    print(f"  {len(rel)} imported document-to-item relationships, {len(statements)} provenance statements")
    print(f"  {len(textpool)} unique source strings; exact repeats stored as references")
    print(f"  {len(shards)} deterministic text-pool shards; original navigation and page fields preserved in data/history")
    print('  Unqualified legacy page numbers are unknown in navigation until independently checked.')

if __name__=='__main__':main()
