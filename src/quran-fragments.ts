import { foldArabic } from './align-match.js';

/**
 * Conservative safety check for proposed verse-number candidates.
 * A preceding unnumbered Arabic content row can be the first part of the same
 * verse. Without a verse-aligned reference, do not align the whole English
 * verse to only the numbered last fragment. This is a flag, not a proof.
 */
export function potentiallySplitVerse(rows:{id:string;value:string;kind?:string}[],index:number):boolean {
  const previous=rows[index-1];if(!previous||!previous.value||previous.kind==='instruction'||previous.kind==='audio-reciter')return false;
  if(/﴿\s*[0-9٠-٩۰-۹]+\s*﴾/u.test(previous.value))return false;
  const folded=foldArabic([{id:previous.id,text:previous.value}]).value;
  const opening=foldArabic([{id:'basmala',text:'بسم الله الرحمن الرحيم'}]).value;
  return Boolean(folded && folded!==opening);
}
