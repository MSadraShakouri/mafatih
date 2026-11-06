import { normalizeSearch } from '../../src/normalize.js';
import type { SearchLanguage, SearchRecord } from '../../src/search.js';

export interface ParityCase { query: string; item?: string; languages?: SearchLanguage[] }
export function parityRecords(): SearchRecord[] {
  let seed = 0x4719ab83;
  const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const tokens = ['یا', 'رب', 'الهی', 'عظم', 'البلاء', 'اهل', 'بیتش', 'و', 'می', 'روم',
    'alpha', 'beta', 'gamma', 'اللّٰه', 'متن', 'چیزهای', 'دیگر', 'صل', 'محمد'];
  const result: SearchRecord[] = [];
  const add = (key: string, value: string, item: string, language: 'ar' | 'fa' | 'toc', next?: string) => {
    result.push({ key, section: language === 'toc' ? 'toc' : 'text', item,
      ...(language === 'toc' ? {} : { row: key }), language, text: value, normalized: normalizeSearch(value),
      featured: random(4) === 0, order: Math.floor(result.length / 2), ...(next ? { next } : {}) });
  };
  for (let n = 0; n < 55; n += 1) {
    const value = Array.from({ length: 1 + random(5) }, () => tokens[random(tokens.length)]!).join(' ');
    add(`toc${n}`, value, `item${n}`, 'toc');
  }
  for (let n = 0; n < 240; n += 1) {
    const item = `item${n}`, language = n % 2 ? 'ar' : 'fa';
    const first = Array.from({ length: 1 + random(7) }, () => tokens[random(tokens.length)]!).join(n % 5 ? ' ' : '، ');
    const second = Array.from({ length: 1 + random(7) }, () => tokens[random(tokens.length)]!).join(' ');
    add(`${item}:a`, first, item, language, n % 5 ? `${item}:b` : undefined);
    add(`${item}:b`, second, item, language);
  }
  add('fixed:a', 'یا اهل بیتش و می روم', 'fixed', 'ar', 'fixed:b');
  add('fixed:b', 'و برح الخفاء و اللّٰه', 'fixed', 'ar');
  add('fixed:fa', 'اهل‌بیت و الهی عظم البلاء', 'fixed', 'fa');
  return result;
}

export const parityCases: ParityCase[] = [
  { query: 'اهلبی' }, { query: 'اهلبیت' }, { query: 'یا اهلبیت و میروم' },
  { query: 'یا رب' }, { query: 'alpha beta gamma' }, { query: 'alpha غلط gamma' },
  { query: 'الله الله' }, { query: 'الله' }, { query: 'ا' }, { query: 'الهی عظم البلا' },
  { query: 'عظم البلاء و برح الخفاء' }, { query: 'اهل بیت' }, { query: 'اهل‌بیت' },
  { query: 'یا اهلبیت و میروم', item: 'fixed' }, { query: 'و الله', item: 'fixed', languages: ['ar'] },
  { query: 'یا رب', languages: ['fa'] }, { query: 'beta alpha', item: 'item33' },
  { query: 'اهلبی' }, { query: 'اهلبیت' }, { query: 'ناموجود' },
];
