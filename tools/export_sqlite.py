#!/usr/bin/env python3
"""Export the canonical data to a generated normalized SQLite database (Python 3.10+)."""
from __future__ import annotations
import json,os,pathlib,sqlite3,sys
ROOT=pathlib.Path(__file__).resolve().parent.parent
DATA=pathlib.Path(os.environ.get('MAFATIH_DATA_ROOT',ROOT/'data')).resolve()
OUT=pathlib.Path(os.environ.get('MAFATIH_SQLITE_OUT',ROOT/'generated'/'corpus.sqlite')).resolve();OUT.parent.mkdir(parents=True,exist_ok=True)
TMP=OUT.with_name(OUT.name+f'.tmp-{os.getpid()}')
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
compact=lambda x:None if x is None else json.dumps(x,ensure_ascii=False,separators=(',',':'))
if TMP.exists():TMP.unlink()
try:
 con=sqlite3.connect(TMP);con.execute('PRAGMA foreign_keys=ON');con.executescript((ROOT/'tools'/'schema.sql').read_text(encoding='utf-8'))
 with con:
  for k,v in load(DATA/'corpus.json').items():con.execute('INSERT INTO corpus_meta VALUES (?,?)',(k,compact(v)))
  con.execute('INSERT INTO corpus_meta VALUES (?,?)',('legacy_attribution_markdown',compact((DATA/'legacy-attribution.md').read_text(encoding='utf-8'))))
  for f in sorted((DATA/'texts').glob('*.json')):
   con.executemany('INSERT INTO text_value VALUES (?,?)',sorted(load(f).items()))
  con.executemany('INSERT INTO claim VALUES (?,?)',sorted(load(DATA/'claims.json').items()))
  for sid,s in sorted(load(DATA/'sources.json')['sources'].items()):
   lic=s['license'];con.execute('INSERT INTO source VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    (sid,s['name'],s.get('author'),s.get('edition'),s.get('url'),lic['status'],lic.get('name'),lic.get('url'),lic.get('evidence'),compact(lic.get('allowed_uses')),s.get('attribution'),s.get('notes')))
  split_records={f.stem:load(f) for f in sorted((DATA/'row-splits').glob('*.json'))}
  for f in sorted((DATA/'items').glob('*.json')):
   id=f.stem;it=load(f);t=it['title'];con.execute('INSERT INTO item VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    (id,it['legacy_id'],t['fa'],t['ar'],t['en'],it['category'],it.get('quran',{}).get('chapter'),it['legacy_alignment'],it.get('legacy_missing_english_reason_claim'),it.get('legacy_missing_english_title'),compact(it.get('review'))))
   split=split_records.get(id)
   identities={r['id'] for r in it['rows']}
   if split is not None:identities.update(e['original']['id'] for e in split['rows']+split.get('aliases',[]))
   con.executemany('INSERT INTO row_identity VALUES (?,?)',[(id,r) for r in sorted(identities)])
   for pos,tid in enumerate(it['tags']):con.execute('INSERT INTO item_tag VALUES (?,?,?)',(id,pos,tid))
   for lang,ss in it.get('sources',{}).items():
    for pos,s in enumerate(ss):con.execute('INSERT INTO item_source VALUES (?,?,?,?)',(id,lang,pos,s))
   for pos,r in enumerate(it['rows']):
    con.execute('INSERT INTO item_row VALUES (?,?,?,?,?,?)',(id,r['id'],pos,r['ar'],r['fa'],r.get('kind')))
    for lang,ss in r.get('sources',{}).items():
     for n,s in enumerate(ss):con.execute('INSERT INTO row_source VALUES (?,?,?,?,?)',(id,r['id'],lang,n,s))
   if split is not None:
    if split['item']!=id:raise ValueError(f'row split file/item mismatch: {id}')
    con.execute('INSERT INTO item_split_record VALUES (?,?,?,?,?,?)',(id,split['author'],split['format_version'],split['baseline_item_sha256'],split['plan_sha256'],split['layout_sha256']))
    for kind,entries in (('original',split['rows']),('alias',split.get('aliases',[]))):
     for e in entries:
      old=e['original']['id'];con.execute('INSERT INTO row_split_original VALUES (?,?,?,?)',(id,old,compact(e['original']),kind))
      for lang in ('ar','fa'):
       for pos,s in enumerate(e[lang]):
        con.execute('INSERT INTO row_split_segment VALUES (?,?,?,?,?,?,?,?,?)',(id,old,lang,pos,s['row'],s['language'],s['start'],s['end'],s.get('target_start',0)))
  for f in sorted((DATA/'english').glob('*.json')):
   id=f.stem;doc=load(f);m=doc['source_metadata'];con.execute('INSERT INTO english_document VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    (id,m['title'],m['title_ar'],m['section'],m['chapter'],m['translator_claim'],m['origin_claim'],m['method_claim'],m['note_claim'],doc['coverage'],compact(doc.get('review'))))
   for n,s in enumerate(doc.get('sources',[])):con.execute('INSERT INTO document_source VALUES (?,?,?)',(id,n,s))
   for pos,p in enumerate(doc['paragraphs']):
    con.execute('INSERT INTO english_paragraph VALUES (?,?,?,?,?)',(id,p['id'],pos,p['text'],p.get('source_claim')))
    for n,s in enumerate(p.get('sources',[])):con.execute('INSERT INTO paragraph_source VALUES (?,?,?,?)',(id,p['id'],n,s))
  for l in load(DATA/'relations.json')['english_links']:con.execute('INSERT INTO english_link VALUES (?,?,?,?)',(l['item'],l['document'],l['kind'],compact(l.get('review'))))
  editorial=load(DATA/'editorial-history.json')
  if editorial.get('quran_number_evidence'):con.execute('INSERT INTO corpus_meta VALUES (?,?)',('quran_number_evidence',compact(editorial['quran_number_evidence'])))
  for evid,e in sorted(editorial['evidence'].items()):con.execute('INSERT INTO editorial_evidence VALUES (?,?,?)',(evid,e['url'],e['description']))
  for f in sorted((DATA/'english').glob('*.json')):
   d=load(f);title=d.get('display_title')
   if title is not None:con.execute('INSERT INTO english_display_title VALUES (?,?,?,?)',(f.stem,title['en'],title['ar'],title.get('evidence')))
  for pos,e in enumerate(editorial['metadata_corrections']):con.execute('INSERT INTO metadata_correction VALUES (?,?,?,?,?,?,?)',(pos,e['item'],e['field'],e['previous'],e['replacement'],e['source_document'],e['evidence']))
  for pos,e in enumerate(editorial.get('row_corrections',[])):con.execute('INSERT INTO row_correction VALUES (?,?,?,?,?,?,?,?)',(pos,e['item'],e['row'],e['language'],e['previous'],e['replacement'],e['evidence'],e['reason']))
  for pos,e in enumerate(editorial.get('line_break_marker_moves',[])):
   con.execute('INSERT INTO line_break_marker_move VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    (pos,e['item'],e['language'],e['source_row'],e['destination_row'],e['marker'],e['source_previous'],e['source_replacement'],e['destination_previous'],e['destination_replacement'],e['evidence'],e['reason']))
  for pos,e in enumerate(editorial.get('row_insertions',[])):con.execute('INSERT INTO row_insertion VALUES (?,?,?,?,?,?)',(pos,e['item'],e['row'],e['before'],e['evidence'],e['reason']))
  for pos,e in enumerate(editorial.get('row_classifications',[])):con.execute('INSERT INTO row_classification VALUES (?,?,?,?,?,?,?)',(pos,e['item'],e['row'],e['previous_kind'],e['replacement_kind'],e['evidence'],e['reason']))
  for pos,e in enumerate(editorial.get('paragraph_removals',[])):con.execute('INSERT INTO paragraph_removal VALUES (?,?,?,?,?,?,?,?)',(pos,e['document'],e['paragraph'],e['text'],e['preserved_document'],e['preserved_paragraph'],e['evidence'],e['reason']))
  for pos,e in enumerate(editorial.get('retracted_links',[])):con.execute('INSERT INTO retracted_link VALUES (?,?,?,?,?,?)',(pos,e['item'],e['document'],e['kind'],e['evidence'],e['reason']))
  for pos,e in enumerate(editorial.get('created_documents',[])):con.execute('INSERT INTO created_document VALUES (?,?,?,?,?,?,?)',(pos,e['document'],e['based_on_document'],e['based_on_paragraph'],e['source_record'],e['evidence'],e['reason']))
  for pos,e in enumerate(editorial.get('proposed_links',[])):con.execute('INSERT INTO proposed_link_history VALUES (?,?,?,?,?)',(pos,e['item'],e['document'],e['evidence'],e['reason']))
  for batch_pos,batch in enumerate(editorial.get('punctuation_normalizations',[])):
   con.execute('INSERT INTO punctuation_normalization VALUES (?,?,?)',(batch_pos,batch['rule'],batch['date']))
   for pos,e in enumerate(batch['changes']):con.execute('INSERT INTO punctuation_correction VALUES (?,?,?,?,?)',
    (batch_pos,pos,compact(e['location']),e['previous'],e['replacement']))
  for batch_pos,batch in enumerate(editorial.get('navigation_page_corrections',[])):
   con.execute('INSERT INTO navigation_page_batch VALUES (?,?,?,?,?)',
    (batch_pos,batch['method'],batch['date'],batch['evidence'],batch['source_sha256']))
   for pos,e in enumerate(batch['changes']):
    before=e['previous'];after=e['replacement'];o=e['observation']
    con.execute('INSERT INTO navigation_page_correction VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
     (batch_pos,pos,compact(e['path']),e['title'],e['item'],e['source_level'],
      before['start'],before.get('end'),int('end' in before),before.get('series'),int('series' in before),
      after['start'],after.get('end'),int('end' in after),after['series'],o['kind'],o['heading'],
      o['previous_footer'],o['next_footer'],o['last_text_footer'],o['subtree_footer'],o['descendant_max_end']))
  nav=load(DATA/'navigation.json')
  for pos,id in enumerate(nav['default_order']):con.execute('INSERT INTO default_order VALUES (?,?)',(pos,id))
  for pos,id in enumerate(nav['featured']):con.execute('INSERT INTO featured VALUES (?,?)',(pos,id))
  next_id=0
  def add_nodes(nodes,parent=None):
   global next_id
   for pos,n in enumerate(nodes):
    next_id+=1;id=next_id;con.execute('INSERT INTO navigation_node VALUES (?,?,?,?,?,?,?,?,?,?)',
      (id,parent,pos,n['title'],n['item'],n['source_level'],n['source_page'],n.get('source_page_end'),
       n['source_page_series'],int('source_page_end' in n)))
    add_nodes(n['children'],id)
  add_nodes(nav['toc'])
  for f in sorted((DATA/'alignments').glob('*.json')):
   af=load(f);item=af['item']
   for g in af['groups']:
    rev=g['review'];con.execute('INSERT INTO alignment_group VALUES (?,?,?,?,?,?,?)',
      (item,g['id'],g['method'],rev['reviewer'],rev['date'],rev.get('note'),compact(g['evidence'])))
    for lang in ('ar','fa','en'):
     for pos,s in enumerate(g[lang]):con.execute('INSERT INTO alignment_span VALUES (?,?,?,?,?,?,?,?,?,?)',
      (item,g['id'],lang,pos,s.get('row'),s.get('document'),s.get('paragraph'),s['start'],s['end'],s['sha256']))
 violations=con.execute('PRAGMA foreign_key_check').fetchall()
 if violations:raise RuntimeError(f'foreign key violations: {violations[:10]}')
 if con.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('SQLite integrity check failed')
 counts={table:con.execute(f'SELECT count(*) FROM {table}').fetchone()[0] for table in ('item','item_row','english_document','english_paragraph','text_value','english_link','alignment_group')}
 con.close();os.replace(TMP,OUT)
 print(f'Built {OUT}');print(json.dumps(counts,indent=2));print('SQLite is generated and is not a content/rights approval.')
except Exception:
 if TMP.exists():TMP.unlink()
 raise
