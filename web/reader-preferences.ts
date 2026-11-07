export const READER_PREFERENCES_KEY = 'mafatih.reader.preferences.v1';
export const FONT_IDS = ['scheherazade', 'amiri', 'noto-naskh'] as const;
export type ReaderFont = typeof FONT_IDS[number];

export interface ReaderPreferences {
  font: ReaderFont;
  arabicSize: number;
  translationSize: number;
  explanationSize: number;
}

/** 32 reversible proportional steps on either side of 100%, from 25% to 400%. */
export const SIZE_LEVELS: readonly number[] = Object.freeze(
  Array.from({ length: 65 }, (_, index) => Math.round(100 * Math.pow(2, (index - 32) / 16))),
);
export const MIN_SIZE = SIZE_LEVELS[0]!;
export const MAX_SIZE = SIZE_LEVELS[SIZE_LEVELS.length - 1]!;
export const DEFAULT_READER_PREFERENCES: Readonly<ReaderPreferences> = Object.freeze({
  font: 'scheherazade', arabicSize: 100, translationSize: 100, explanationSize: 100,
});

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isReaderFont(value: unknown): value is ReaderFont {
  return typeof value === 'string' && (FONT_IDS as readonly string[]).includes(value);
}

function validSize(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 100;
  // Preserve old valid 5%-step choices until the user adjusts them, rather
  // than silently rounding a saved preference to a new geometric step.
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(value)));
}

export function nextSize(current: number, direction: -1 | 1): number {
  const value = validSize(current);
  return direction > 0 ? SIZE_LEVELS.find(level => level > value) ?? MAX_SIZE
    : [...SIZE_LEVELS].reverse().find(level => level < value) ?? MIN_SIZE;
}

/** Never allow stored values to inject CSS or produce out-of-range sizes. */
export function normalizeReaderPreferences(value: unknown): ReaderPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_READER_PREFERENCES };
  const input = value as Record<string, unknown>;
  return {
    font: isReaderFont(input.font) ? input.font : DEFAULT_READER_PREFERENCES.font,
    arabicSize: validSize(input.arabicSize),
    translationSize: validSize(input.translationSize),
    explanationSize: validSize(input.explanationSize),
  };
}

export function readReaderPreferences(storage?: PreferenceStorage): ReaderPreferences {
  try {
    const raw = storage?.getItem(READER_PREFERENCES_KEY);
    return raw ? normalizeReaderPreferences(JSON.parse(raw) as unknown) : { ...DEFAULT_READER_PREFERENCES };
  } catch {
    return { ...DEFAULT_READER_PREFERENCES };
  }
}

export interface ReaderPreferencesStore {
  get(): ReaderPreferences;
  update(changes: Partial<ReaderPreferences>): ReaderPreferences;
  /** Internal API retained for migration/tests; no reset control is shown. */
  reset(): ReaderPreferences;
}

export function createReaderPreferencesStore(storage?: PreferenceStorage): ReaderPreferencesStore {
  let current = readReaderPreferences(storage);
  const save = (): ReaderPreferences => {
    try { storage?.setItem(READER_PREFERENCES_KEY, JSON.stringify(current)); } catch { /* private mode, quota, etc. */ }
    return { ...current };
  };
  return {
    get: () => ({ ...current }),
    update: changes => { current = normalizeReaderPreferences({ ...current, ...changes }); return save(); },
    reset: () => { current = { ...DEFAULT_READER_PREFERENCES }; return save(); },
  };
}
