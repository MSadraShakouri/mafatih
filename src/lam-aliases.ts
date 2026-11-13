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
// Each approved pair differs by exactly one lam. Record where it is inserted
// or removed so an explicitly typed ة survives alias expansion unchanged.
type Alternative = { index: number; insert: boolean };
const alternatives = new Map<string, Alternative>();
// Index the shared ambiguous shape so a typed form can find a possible alias
// through source ة without scanning every pair. The typed spelling is retained
// in the alternative; the normal directional matcher is still authoritative.
const ambiguousAlternatives = new Map<string, { key: string; change: Alternative }[]>();
const aliasShape = (word: string): string => word.replace(/[تهة]/gu, '#');
for (const { one, two } of approvedLamPairs) {
  if (!one || !two || one === two || one === 'اله' || two === 'الله') throw new Error('Invalid protected lam pair');
  if (alternatives.has(one) || alternatives.has(two)) throw new Error('Ambiguous lam pair');
  const index = two.split('').findIndex((letter, i) => letter === 'ل' && two.slice(0, i) + two.slice(i + 1) === one);
  if (index < 0) throw new Error('Approved lam pair must differ by one lam');
  for (const [key, insert] of [[one, true], [two, false]] as const) {
    const change = { index, insert };
    alternatives.set(key, change);
    const shape = aliasShape(key), entries = ambiguousAlternatives.get(shape) ?? [];
    entries.push({ key, change }); ambiguousAlternatives.set(shape, entries);
  }
}

const variantCache = new Map<string, readonly string[]>();
/** `word` is already query-normalized, with typed ة preserved. */
export function wordVariants(word: string): readonly string[] {
  const cached = variantCache.get(word);
  if (cached) return cached;
  const variants = [word];
  const add = ({ index, insert }: Alternative): void => {
    const alternate = word.slice(0, index) + (insert ? 'ل' : '') + word.slice(index + (insert ? 0 : 1));
    if (!variants.includes(alternate)) variants.push(alternate);
  };
  const exact = alternatives.get(word);
  if (exact) add(exact);
  if (/[تهة]/u.test(word)) {
    // Every pairing here can describe a source ة. The alternative retains
    // the typed characters, so final matching still never equates ordinary
    // source ت and ه, even when the approved key uses the other character.
    for (const { key, change } of ambiguousAlternatives.get(aliasShape(word)) ?? []) {
      let matches = true;
      for (let i = 0; i < key.length; i += 1) {
        if (word[i] !== key[i] && !(word[i] === 'ة' && (key[i] === 'ت' || key[i] === 'ه')) &&
            !(word[i] === 'ت' && key[i] === 'ه') && !(word[i] === 'ه' && key[i] === 'ت')) {
          matches = false; break;
        }
      }
      if (matches) add(change);
    }
  }
  if (variantCache.size >= 128) variantCache.delete(variantCache.keys().next().value!);
  variantCache.set(word, variants);
  return variants;
}

/** All source spellings needed for highlighting / original-text jumps. */
export function expandedWords(words: readonly string[]): string[] {
  return [...new Set(words.flatMap(word => [...wordVariants(word)]))];
}

/** Reuse a prior prefix only if it is conservative for EVERY alternative. */
export function safeAliasPrefix(prefix: string, word: string): boolean {
  return wordVariants(word).every(variant => wordVariants(prefix).some(previous => variant.startsWith(previous)));
}
