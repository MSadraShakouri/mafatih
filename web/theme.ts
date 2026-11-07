import type { PreferenceStorage } from './reader-preferences.js';

export type ThemeMode = 'auto' | 'light' | 'dark';
const KEY = 'mafatih.theme.v1';
function valid(value: unknown): value is ThemeMode { return value === 'auto' || value === 'light' || value === 'dark'; }

export function createThemeStore(storage?: PreferenceStorage): {
  get(): ThemeMode; set(mode: ThemeMode): void; dispose(): void;
} {
  let mode: ThemeMode = 'auto';
  try { const value = storage?.getItem(KEY); if (valid(value)) mode = value; } catch { /* storage is optional */ }
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (): void => {
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.theme = mode === 'auto' ? (media.matches ? 'dark' : 'light') : mode;
  };
  const onSystemChange = (): void => { if (mode === 'auto') apply(); };
  media.addEventListener('change', onSystemChange);
  apply();
  return {
    get: () => mode,
    set: next => {
      if (!valid(next)) return;
      mode = next;
      try { storage?.setItem(KEY, mode); } catch { /* in-memory fallback */ }
      apply();
    },
    dispose: () => media.removeEventListener('change', onSystemChange),
  };
}
export type ThemeStore = ReturnType<typeof createThemeStore>;
