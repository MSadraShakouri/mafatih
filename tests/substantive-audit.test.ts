import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCorpus,text,validateCorpus,linksForItem,resolveEnglishParagraph} from '../src/corpus.js';
import {potentiallySplitVerse} from '../src/quran-fragments.js';
import {currentPieces,historicalRow} from './helpers/row-split-history.js';

test('targeted corrections retain historical text references',()=>{
  const c=loadCorpus();assert.deepEqual(validateCorpus(c).errors,[]);
  // Later work may append history; do not freeze the corpus at audit-day counts.
  assert.ok((c.editorial.row_corrections?.length??0)>=45);
  assert.ok((c.editorial.row_insertions?.length??0)>=5);
  assert.ok((c.editorial.row_classifications?.length??0)>=28);
  for(const change of c.editorial.row_corrections??[]){
    if(change.previous)assert.ok(c.texts.has(change.previous));
    if(change.replacement)assert.ok(c.texts.has(change.replacement));
    assert.ok(c.editorial.evidence[change.evidence]);
  }
  const r=(id:string)=>historicalRow(c,'dua-mujir',id);
  for(const id of ['r00007','r00008','r00009','r00010','r00011','r00012'])
    for(const language of ['ar','fa'] as const)currentPieces(c,'dua-mujir',id,language);
  assert.match(text(c,r('r00008').fa),/بری از هر عیب/);
  assert.match(text(c,r('r00009').fa),/ایمن بخش/);
  assert.doesNotMatch(text(c,r('r00009').fa),/مار از آتش/);
  assert.match(text(c,r('r00010').fa),/عزّت مند/);
  assert.match(text(c,r('r00011').fa),/بزرگ‌منش/);
  assert.match(text(c,r('r00007').fa),/ای پناه دهنده/);
  assert.match(text(c,r('r00012').ar),/مُجِيرُ/);
  const instruction=historicalRow(c,'ziyarat-warith','r00131-instruction');const rec=historicalRow(c,'ziyarat-warith','r00131');
  for(const id of ['r00131-instruction','r00131'])for(const language of ['ar','fa'] as const)currentPieces(c,'ziyarat-warith',id,language);
  assert.equal(instruction.kind,'instruction');assert.equal(instruction.ar,null);assert.match(text(c,instruction.fa),/پس خود را/);
  assert.match(text(c,rec.ar),/^اَلسَّلامُ/);assert.match(text(c,rec.fa),/پسر ولی خدا/);
});

test('source-record splits preserve historical paragraph references and link origin',()=>{
  const c=loadCorpus();assert.ok((c.editorial.created_documents?.length??0)>=19);assert.ok((c.editorial.proposed_links?.length??0)>=19);
  assert.ok((c.editorial.paragraph_removals?.length??0)>=37);assert.ok((c.editorial.retracted_links?.length??0)>=7);
  for(const edit of c.editorial.paragraph_removals??[]){
    const retained=c.english.get(edit.preserved_document)!.paragraphs.find(p=>p.id===edit.preserved_paragraph);
    assert.ok(retained);assert.ok(c.texts.has(edit.text)); // historical exact text survives even if destination is later corrected
    assert.ok(!c.english.get(edit.document)!.paragraphs.some(p=>p.id===edit.paragraph));
    assert.deepEqual(resolveEnglishParagraph(c,edit.document,edit.paragraph),{
      document:edit.preserved_document,paragraph:edit.preserved_paragraph,redirected:true,originalTextId:edit.text
    });
    assert.deepEqual(resolveEnglishParagraph(c,edit.preserved_document,edit.preserved_paragraph),{
      document:edit.preserved_document,paragraph:edit.preserved_paragraph,redirected:false
    });
  }
  for(const [item,doc] of [
    ['amal-aamal-shbhay-dhh','tr54-dua-for-last-10-nights'],
    ['dua-syfy-sghyr-marvf','tr357-dua-saif-al-sagheer-al-qamoos'],
    ['ziyarat-kyfyt-rsvl-s','tr114-ziarat-1-holy-prophet']
  ]){
    const link=linksForItem(c,item!).find(x=>x.document===doc);assert.equal(link?.kind,'proposed'); // a later genuine review is allowed
    assert.ok(c.english.get(doc!)!.paragraphs.length>0);
  }
  assert.ok(linksForItem(c,'ziyarat-zkrmsajd-mazmh-mdynh').some(x=>x.document==='ziyarah-imams-baqi--part7'));
  assert.ok(!linksForItem(c,'ziyarat-zkrmsajd-mazmh-mdynh').some(x=>x.document==='tr142-rajab-daily-dua-4'));
});

test('Quran candidate generation conservatively rejects an apparent split verse',()=>{
  const split=[{id:'r1',value:'يَا قَوْمِ'},{id:'r2',value:'اتَّبِعُوا الْمُرْسَلِينَ ﴿20﴾'}];
  assert.equal(potentiallySplitVerse(split,1),true);
  const opening=[{id:'r1',value:'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ'},{id:'r2',value:'وَالْعَصْرِ ﴿1﴾'}];
  assert.equal(potentiallySplitVerse(opening,1),false);
  assert.equal(potentiallySplitVerse([{id:'r1',value:'قُلْ ﴿1﴾'},{id:'r2',value:'اللَّهُ ﴿2﴾'}],1),false);
});

test('editorial-history references and retired paragraph IDs are validated',()=>{
  const c=loadCorpus();c.editorial.row_corrections![0]!.evidence='missing-evidence';
  assert.ok(validateCorpus(c).errors.some(s=>s.includes('missing evidence missing-evidence')));
  const retired=c.editorial.paragraph_removals![0]!;
  c.editorial.paragraph_removals!.push({...retired});
  assert.ok(validateCorpus(c).errors.some(s=>s.includes('duplicate retired paragraph')));
  assert.throws(()=>resolveEnglishParagraph(c,retired.document,retired.paragraph),/Ambiguous retired paragraph/);
  c.editorial.paragraph_removals!.pop();
  c.english.get(retired.document)!.paragraphs.push({id:retired.paragraph,text:retired.text});
  assert.ok(validateCorpus(c).errors.some(s=>s.includes('retired paragraph ID reused')));
});
