/** The 47 approved A pairs and 11 short-B pairs, in folded search spelling. */
export const approvedLamPairs: readonly { one: string; two: string }[] = [
  { one: "الهم", two: "اللهم" },
  { one: "الیل", two: "اللیل" },
  { one: "الیله", two: "اللیله" },
  { one: "الیالی", two: "اللیالی" },
  { one: "الطیف", two: "اللطیف" },
  { one: "العنه", two: "اللعنه" },
  { one: "العین", two: "اللعین" },
  { one: "السان", two: "اللسان" },
  { one: "الطف", two: "اللطف" },
  { one: "الاجین", two: "اللاجین" },
  { one: "الایح", two: "اللایح" },
  { one: "الهو", two: "اللهو" },
  { one: "الواء", two: "اللواء" },
  { one: "الات", two: "اللات" },
  { one: "الایذین", two: "اللایذین" },
  { one: "الجج", two: "اللجج" },
  { one: "الحم", two: "اللحم" },
  { one: "الذات", two: "اللذات" },
  { one: "الذین", two: "اللذین" },
  { one: "الهای", two: "اللهای" },
  { one: "الهف", two: "اللهف" },
  { one: "الوح", two: "اللوح" },
  { one: "الولو", two: "اللولو" },
  { one: "الاتی", two: "اللاتی" },
  { one: "الاحقین", two: "اللاحقین" },
  { one: "الازم", two: "اللازم" },
  { one: "الامه", two: "اللامه" },
  { one: "الاهوتیه", two: "اللاهوتیه" },
  { one: "الاواء", two: "اللاواء" },
  { one: "الایحه", two: "اللایحه" },
  { one: "الایذ", two: "اللایذ" },
  { one: "البن", two: "اللبن" },
  { one: "الحاق", two: "اللحاق" },
  { one: "الحد", two: "اللحد" },
  { one: "الزبه", two: "اللزبه" },
  { one: "الصوق", two: "اللصوق" },
  { one: "الصیق", two: "اللصیق" },
  { one: "العب", two: "اللعب" },
  { one: "العن", two: "اللعن" },
  { one: "العناء", two: "اللعناء" },
  { one: "الغات", two: "اللغات" },
  { one: "الغو", two: "اللغو" },
  { one: "الهیف", two: "اللهیف" },
  { one: "الواقح", two: "اللواقح" },
  { one: "الیام", two: "اللیام" },
  { one: "الیلتین", two: "اللیلتین" },
  { one: "الییم", two: "اللییم" },
  { one: "بالیل", two: "باللیل" },
  { one: "بالطف", two: "باللطف" },
  { one: "والیل", two: "واللیل" },
  { one: "بالعن", two: "باللعن" },
  { one: "االهم", two: "االلهم" },
  { one: "بالطیف", two: "باللطیف" },
  { one: "بالعب", two: "باللعب" },
  { one: "بالعنه", two: "باللعنه" },
  { one: "بالوح", two: "باللوح" },
  { one: "والازم", two: "واللازم" },
  { one: "والایذ", two: "واللایذ" },
];

/**
 * The 47 list-A pairs and 11 approved short-list-B pairs, normalized and frozen
 * for search only. These are search alternatives, not source corrections.
 * Allah/ilah is deliberately NOT a pair. The 24 protected B pairs and list C
 * are not included.
 */
const alternatives = new Map<string,string>();
for (const { one, two } of approvedLamPairs) {
  if (!one || !two || one === two || one === 'اله' || two === 'الله') throw new Error('Invalid protected lam pair');
  if (alternatives.has(one) || alternatives.has(two)) throw new Error('Ambiguous lam pair');
  alternatives.set(one,two); alternatives.set(two,one);
}

/** `word` is already folded by the app's normal search normalization. */
export function wordVariants(word: string): readonly string[] {
  const alternate = alternatives.get(word);
  return alternate ? [word, alternate] : [word];
}

/** All source spellings needed for highlighting / original-text jumps. */
export function expandedWords(words: readonly string[]): string[] {
  return [...new Set(words.flatMap(word => [...wordVariants(word)]))];
}

/** Reuse a prior prefix only if it is conservative for EVERY alternative. */
export function safeAliasPrefix(prefix: string, word: string): boolean {
  return wordVariants(word).every(variant => wordVariants(prefix).some(previous => variant.startsWith(previous)));
}
