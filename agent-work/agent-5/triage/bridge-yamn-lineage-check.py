import json,glob,subprocess
p=json.load(open('agent-work/agent-4/proposals/dua-yamn-provisional-lineage-recheck.json'));item=p['item'];pool={k:v for f in glob.glob('data/texts/*.json') for k,v in json.load(open(f)).items()}
def show(c,path):return json.loads(subprocess.check_output(['git','show',c+':'+path],text=True))
current=show('d265151bd911aff5d1756abf77b082f41b67414e','data/items/'+item+'.json'); live={x['id']:x for x in current['rows']}; mapping=show('d265151bd911aff5d1756abf77b082f41b67414e','data/row-splits/'+item+'.json'); old=show('7ab2cc3c5642acefa9ed04f7377b35ce25690cf2','data/row-splits/'+item+'.json');currows={x['original']['id']:x for x in mapping['rows']};oldrows={x['original']['id']:x for x in old['rows']};errors=[];obs=0
for e in p['entries']:
 for snap in e['snapshots']:
  x=show(snap,'data/items/'+item+'.json');row=next((r for r in x['rows'] if r['id']==e['id']),None)
  if row!=e['original']:errors.append(('observation',e['id'],snap,row,e['original']))
  obs+=1
 for lang in ['ar','fa']:
  ref=e['original'].get(lang)
  if not ref:continue
  orig=pool[ref];position=0
  for dest in e[lang]:
   value=pool[live[dest['row']][dest.get('language',lang)]];chunk=orig[dest['start']:dest['end']];off=dest.get('target_start',0)
   if dest['start']!=position or value[off:off+len(chunk)]!=chunk:errors.append(('text',e['id'],lang,dest))
   position=dest['end']
  if position!=len(orig):errors.append(('incomplete',e['id'],lang,position,len(orig)))
  # Locate the historical child by its original source-run(s), and independently transport each character through current source-run coordinates.
  source_runs=[]
  for rid,rec in oldrows.items():
   for run in rec[lang]:
    if run['row']==e['id'] and run.get('language',lang)==lang:source_runs.append((rid,run))
  if not source_runs:errors.append(('missing source lineage',e['id'],lang));continue
  derived=[]
  for rid,run in source_runs:
   for currentrun in currows[rid][lang]:
    start=max(run['start'],currentrun['start']);end=min(run['end'],currentrun['end'])
    if start<end:
     derived.append((run.get('target_start',0)+start-run['start'],run.get('target_start',0)+end-run['start'],currentrun['row'],currentrun.get('language',lang),currentrun.get('target_start',0)+start-currentrun['start']))
  proposed=[(v['start'],v['end'],v['row'],v.get('language',lang),v.get('target_start',0)) for v in e[lang]]
  if sorted(derived)!=proposed:errors.append(('lineage',e['id'],lang,derived,proposed))
print('entries',len(p['entries']),'observations',obs,'errors',len(errors));print(*errors[:15],sep='\n')
if errors:
 raise SystemExit(1)
