import { claim, documentTitle, itemTitle, linksForItem, loadCorpus, text } from '../src/corpus.js';
const id=process.argv[2];if(!id){console.error('Usage: npm run show:item -- <item-slug>');process.exit(2);}
const c=loadCorpus();const item=c.items.get(id);if(!item)throw new Error(`No item ${id}`);
const links=linksForItem(c,id);
console.log(JSON.stringify({id,legacy_id:item.legacy_id,title:itemTitle(c,id),category:item.category,
  tags:item.tags.map(x=>text(c,x)),legacy_alignment:item.legacy_alignment,
  note:claim(c,item.legacy_missing_english_reason_claim),
  rows:item.rows.map(r=>({id:r.id,ar:text(c,r.ar),fa:text(c,r.fa),kind:r.kind??'unknown'})),
  english:links.map(l=>({id:l.document,link_kind:l.kind,title:documentTitle(c,l.document),coverage:c.english.get(l.document)?.coverage,
    paragraphs:c.english.get(l.document)?.paragraphs.map(p=>({id:p.id,text:text(c,p.text)}))}))},null,2));
