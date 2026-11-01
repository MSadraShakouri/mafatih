/** Conservative, search-only Arabic folding with a map back to original Unicode code points. */
export interface OriginalPoint { row:string; point:number }
export interface ArabicInput { id:string; text:string }
export interface FoldedArabic { value:string; map:OriginalPoint[]; rowBounds:Map<string,{start:number;end:number}> }
const arabicLetter=/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;
const anyLetter=/\p{L}/u;
function normalizeChar(ch:string):string {
  if(ch==='ک')return 'ك';
  if(ch==='ي'||ch==='ى')return 'ی';
  if(ch==='ٱ'||ch==='أ'||ch==='إ'||ch==='آ')return 'ا';
  if(ch==='ؤ')return 'و';if(ch==='ئ')return 'ی';
  return ch;
}
export function foldArabic(rows:ArabicInput[]):FoldedArabic {
  let value='';const map:OriginalPoint[]=[];const rowBounds=new Map<string,{start:number;end:number}>();
  for(const row of rows){
    const start=value.length;let point=0;
    for(const cp of row.text){
      for(const d of cp.normalize('NFKD')){
        if(/\p{M}/u.test(d))continue;
        const f=normalizeChar(d);
        if(arabicLetter.test(f)&&anyLetter.test(f)){value+=f;map.push({row:row.id,point});}
      }
      point++;
    }
    rowBounds.set(row.id,{start,end:value.length});
  }
  return {value,map,rowBounds};
}
export function uniqueOccurrence(haystack:string,needle:string):number|null {
  if(!needle)return null;const first=haystack.indexOf(needle);
  return first>=0&&haystack.indexOf(needle,first+1)<0?first:null;
}
/** Exact English substring occurs only once across all paragraphs; offsets are Unicode code points. */
export function findUniqueEnglish(paragraphs:{id:string;text:string}[],needle:string):{paragraph:string;start:number;end:number}|null {
  let found:{paragraph:string;start:number;end:number}|null=null;
  if(!needle)return null;
  for(const p of paragraphs){
    let from=0;
    while(true){const i=p.text.indexOf(needle,from);if(i<0)break;
      if(found)return null;
      const start=Array.from(p.text.slice(0,i)).length;
      found={paragraph:p.id,start,end:start+Array.from(needle).length};from=i+1;
    }
  }
  return found;
}
