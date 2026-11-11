import { appendDisplayText, displayDigits } from './display-text.js';
import type { ReaderItem } from './data.js';
import { ICONS } from './icons.js';
import { makeHeader, type RenderActions } from './render.js';
import { itemHref } from './routes.js';
import {
  MAX_SIZE, MIN_SIZE, nextSize, type ReaderFont, type ReaderPreferences, type ReaderPreferencesStore,
} from './reader-preferences.js';
import type { ThemeMode, ThemeStore } from './theme.js';
import type { ScrollSettingsStore } from './scroll-settings.js';
import { renderScrollSettings } from './scroll-settings-ui.js';

const FONT_FAMILIES: Record<ReaderFont, string> = {
  amiri: 'Mafatih Amiri',
  'noto-naskh': 'Mafatih Noto Naskh',
  scheherazade: 'Mafatih Scheherazade',
};
const FONT_NAMES: Record<ReaderFont, string> = {
  amiri: 'امیری', 'noto-naskh': 'نوتو نسخ عربی', scheherazade: 'شهرزاد نو',
};
const digits = (n: number): string => displayDigits(String(n), 'ui');
type SizeKey = 'arabicSize' | 'translationSize' | 'explanationSize';
const labels: Record<SizeKey, string> = { arabicSize: 'متن عربی', translationSize: 'ترجمهٔ فارسی', explanationSize: 'توضیحات' };

export async function prepareReaderFont(font: ReaderFont): Promise<void> {
  try { if (document.fonts) await document.fonts.load(`400 1rem "${FONT_FAMILIES[font]}"`); }
  catch { /* system serif is still usable if a bundled file cannot load */ }
}

export function applyReaderPreferences(main: HTMLElement, preferences: ReaderPreferences): void {
  main.dataset.readerFont = preferences.font;
  main.style.setProperty('--reader-arabic-family', `"${FONT_FAMILIES[preferences.font]}"`);
  main.style.setProperty('--reader-arabic-scale', String(preferences.arabicSize / 100));
  main.style.setProperty('--reader-translation-scale', String(preferences.translationSize / 100));
  main.style.setProperty('--reader-explanation-scale', String(preferences.explanationSize / 100));
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag); if (className) result.className = className;
  if (text) result.textContent = text; return result;
}

/** Samples come from the existing loaded corpus, never invented devotional text. */
export function renderReaderSettings(item: ReaderItem, example: ReaderItem | undefined, instruction: ReaderItem | undefined,
  store: ReaderPreferencesStore, theme: ThemeStore, actions: RenderActions, scroll: ScrollSettingsStore): HTMLElement {
  const main = el('main'); main.dataset.screen = 'settings'; main.dataset.itemId = item.id;
  applyReaderPreferences(main, store.get());
  main.append(makeHeader('تنظیمات خواندن', 'settings', actions, { backFallback: itemHref(item.id) }));
  const content = el('div', 'content settings');
  const sizeSection = el('section', 'settings-section');
  sizeSection.append(el('h2', 'section-title', 'اندازهٔ متن'));
  const controls = el('div', 'size-controls');
  const sampleRow = example?.rows.find(row => row.id === 'r00012') ?? item.rows.find(row => row.ar || row.fa);
  const fontExample = example?.rows.find(row => row.id === 'r00014')?.ar || sampleRow?.ar || '';
  const instructionExample = instruction?.rows.find(row => row.kind === 'instruction' && row.fa)?.fa || 'نمونهٔ توضیحات';
  let selected: SizeKey | undefined;
  type Control = { name: HTMLButtonElement; minus: HTMLButtonElement; plus: HTMLButtonElement; output: HTMLOutputElement; preview: HTMLElement; group: HTMLElement };
  const all = new Map<SizeKey, Control>();
  const refresh = (): void => {
    const preferences = store.get();
    for (const [key, control] of all) {
      const active = selected === key;
      const value = preferences[key];
      control.output.value = `${digits(value)}٪`;
      control.output.setAttribute('aria-label', `${labels[key]}، ${digits(value)} درصد`);
      control.name.setAttribute('aria-expanded', String(active));
      control.minus.disabled = !active || value <= MIN_SIZE;
      control.plus.disabled = !active || value >= MAX_SIZE;
      control.preview.hidden = !active;
      control.group.dataset.focused = String(active);
    }
  };
  for (const key of ['arabicSize', 'translationSize', 'explanationSize'] as const) {
    const group = el('div', 'size-group');
    const line = el('div', 'size-line');
    const name = el('button', 'size-name', labels[key]); name.type = 'button';
    name.setAttribute('aria-label', `دیدن نمونهٔ ${labels[key]}`);
    name.setAttribute('aria-controls', `size-preview-${key}`);
    const chevron = el('span', 'size-chevron'); chevron.innerHTML = ICONS.back; name.append(chevron);
    name.addEventListener('click', () => { selected = selected === key ? undefined : key; refresh(); });
    line.addEventListener('click', event => {
      if (!(event.target as Element).closest('button') && selected !== key) { selected = key; refresh(); }
    });
    const stepper = el('div', 'stepper'); stepper.dir = 'ltr';
    stepper.setAttribute('role', 'group'); stepper.setAttribute('aria-label', `اندازهٔ ${labels[key]}`);
    const minus = el('button', 'step-button'); minus.type = 'button'; minus.innerHTML = ICONS.minus;
    minus.setAttribute('aria-label', `کوچک‌تر کردن ${labels[key]}`);
    const output = el('output', 'step-value'); output.setAttribute('aria-live', 'polite');
    const plus = el('button', 'step-button'); plus.type = 'button'; plus.innerHTML = ICONS.plus;
    plus.setAttribute('aria-label', `بزرگ‌تر کردن ${labels[key]}`);
    for (const [button, direction] of [[minus, -1], [plus, 1]] as const) {
      button.addEventListener('click', () => {
        if (selected !== key) return;
        const next = store.update({ [key]: nextSize(store.get()[key], direction) });
        applyReaderPreferences(main, next); refresh();
      });
    }
    const preview = el('div', 'size-preview'); preview.id = `size-preview-${key}`; preview.hidden = true;
    preview.append(el('span', 'preview-caption', `پیش‌نمایش ${labels[key]}`));
    const text = key === 'arabicSize' ? sampleRow?.ar || '' : key === 'translationSize' ? sampleRow?.fa || '' : instructionExample;
    const paragraph = el('p', key === 'arabicSize' ? 'ar' : key === 'translationSize' ? 'fa' : 'explanation');
    paragraph.dir = 'rtl'; paragraph.lang = key === 'arabicSize' ? 'ar' : 'fa';
    appendDisplayText(paragraph, text, paragraph.lang as 'ar' | 'fa'); preview.append(paragraph);
    stepper.append(minus, output, plus); line.append(name, stepper); group.append(line, preview); controls.append(group);
    all.set(key, { name, minus, plus, output, preview, group });
  }
  sizeSection.append(controls); content.append(sizeSection); refresh();

  const fontSection = el('section', 'settings-section'); fontSection.append(el('h2', 'section-title', 'قلم متن عربی'));
  const options = el('div', 'font-options'); options.setAttribute('role', 'radiogroup'); options.setAttribute('aria-label', 'قلم متن عربی');
  for (const font of ['scheherazade', 'amiri', 'noto-naskh'] as const) {
    const label = el('label', 'font-option');
    const input = el('input'); input.type = 'radio'; input.name = 'reader-font'; input.value = font; input.checked = store.get().font === font;
    input.setAttribute('aria-label', FONT_NAMES[font]);
    const mark = el('span', 'radio-mark'); mark.setAttribute('aria-hidden', 'true');
    const fontName = el('span', 'font-name', FONT_NAMES[font]);
    const sample = el('span', 'font-example'); appendDisplayText(sample, fontExample, 'ar'); sample.lang = 'ar'; sample.dir = 'rtl'; sample.style.fontFamily = `"${FONT_FAMILIES[font]}"`;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const next = store.update({ font });
      applyReaderPreferences(main, next);
      // A return to the reader awaits the selected font before restoring the anchor.
      void prepareReaderFont(font);
    });
    label.append(input, mark, fontName, sample); options.append(label);
  }
  fontSection.append(options); content.append(fontSection);
  content.append(renderScrollSettings(scroll));

  const themeSection = el('section', 'settings-section');
  const wrap = el('div', 'theme-wrap'); wrap.append(el('span', 'theme-label', 'رنگ صفحه'));
  const choices = el('div', 'theme-options'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', 'رنگ صفحه');
  const buttons = new Map<ThemeMode, HTMLButtonElement>();
  const refreshTheme = (): void => { for (const [value, button] of buttons) button.setAttribute('aria-pressed', String(theme.get() === value)); };
  for (const [value, label] of [['auto', 'خودکار'], ['light', 'روشن'], ['dark', 'تیره']] as const) {
    const button = el('button', 'theme-choice', label); button.type = 'button';
    button.addEventListener('click', () => { theme.set(value); refreshTheme(); });
    buttons.set(value, button); choices.append(button);
  }
  refreshTheme(); wrap.append(choices); themeSection.append(wrap); content.append(themeSection);
  main.append(content); return main;
}
