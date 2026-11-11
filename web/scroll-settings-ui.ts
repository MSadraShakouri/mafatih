import { displayDigits } from './display-text.js';
import { ICONS } from './icons.js';
import { MAX_SCROLL_SPEED, MIN_SCROLL_SPEED, nextScrollSpeed, type ScrollSettingsStore } from './scroll-settings.js';

export function scrollSpeedText(value: number): string {
  const rounded = value >= 100 ? Math.round(value) : value >= 1 ? Number(value.toFixed(1)) : Number(value.toFixed(2));
  return displayDigits(String(rounded), 'ui').replace('.', '٫');
}

/** The same Smart switch and manual speed stepper shown in the reader preview. */
export function renderScrollSettings(store: ScrollSettingsStore): HTMLElement {
  const section = document.createElement('section'); section.className = 'settings-section scroll-settings';
  section.setAttribute('aria-labelledby', 'scroll-settings-label');
  section.innerHTML = `<h2 class="section-title" id="scroll-settings-label">پیمایش خودکار</h2>
    <div class="setting-line">
      <div class="setting-copy"><div class="setting-name" id="smart-label">سرعت هوشمند</div><p class="setting-note" id="smart-note">با نگه داشتن یا جابه‌جا کردن متن، سرعت با خواندن شما هماهنگ می‌شود. در حالت خاموش، کنترل سرعت با لمس متن نمایش داده می‌شود.</p></div>
      <button id="smart-toggle" class="switch-button" type="button" role="switch" aria-labelledby="smart-label" aria-describedby="smart-note"><span class="switch-track" aria-hidden="true"></span></button>
    </div>
    <div class="setting-line settings-speed-line">
      <div class="setting-copy"><div class="setting-name">سرعت پیمایش</div><p class="setting-note">تنظیم سرعت بدون نیاز به حرکت دست</p></div>
      <div class="settings-stepper" role="group" aria-label="تنظیم سرعت پیمایش">
        <button id="settings-slower" class="settings-step-button" type="button" aria-label="سرعت کمتر">${ICONS.minus}</button>
        <output id="settings-speed-output" class="settings-speed-value" aria-live="polite"></output>
        <button id="settings-faster" class="settings-step-button" type="button" aria-label="سرعت بیشتر">${ICONS.plus}</button>
      </div>
    </div>`;
  const smart = section.querySelector<HTMLButtonElement>('#smart-toggle')!;
  const slower = section.querySelector<HTMLButtonElement>('#settings-slower')!;
  const faster = section.querySelector<HTMLButtonElement>('#settings-faster')!;
  const output = section.querySelector<HTMLOutputElement>('#settings-speed-output')!;
  const group = section.querySelector<HTMLElement>('.settings-stepper')!;
  const refresh = (): void => {
    const state = store.get(), text = scrollSpeedText(state.speed);
    section.dataset.scrollSmart = String(state.smart);
    smart.setAttribute('aria-checked', String(state.smart));
    group.setAttribute('aria-disabled', String(state.smart));
    slower.disabled = state.smart || state.speed <= MIN_SCROLL_SPEED;
    faster.disabled = state.smart || state.speed >= MAX_SCROLL_SPEED;
    output.value = text; output.textContent = text; output.setAttribute('aria-label', `سرعت ${text}`);
  };
  smart.addEventListener('click', () => { store.setSmart(!store.get().smart); refresh(); });
  for (const [button, direction] of [[slower, -1], [faster, 1]] as const) {
    button.addEventListener('click', () => {
      if (store.get().smart) return;
      store.setSpeed(nextScrollSpeed(store.get().speed, direction)); refresh();
    });
  }
  refresh(); return section;
}
