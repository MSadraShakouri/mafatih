import type { PreferenceStorage } from './reader-preferences.js';

/** Only the Smart switch survives an app reload. Speed belongs to this session. */
export const SMART_SCROLL_KEY = 'mafatih.reader.smart-scroll.v1';
export const DEFAULT_SCROLL_SPEED = 16;
export const MIN_SCROLL_SPEED = 0.2;
export const MAX_SCROLL_SPEED = 500;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const validSpeed = (value: number): number => Number.isFinite(value)
  ? clamp(value, MIN_SCROLL_SPEED, MAX_SCROLL_SPEED) : DEFAULT_SCROLL_SPEED;

// These are the same fine, reversible stops approved in the standalone reader.
const speedStops: number[] = [];
for (let n = 2; n <= 10; n++) speedStops.push(n / 10);
for (let n = 15; n <= 100; n += 5) speedStops.push(n / 10);
for (let n = 12; n <= 20; n += 2) speedStops.push(n);
for (let n = 23; n <= 80; n += 3) speedStops.push(n);
for (let n = 85; n <= 150; n += 5) speedStops.push(n);
for (let n = 160; n <= 300; n += 10) speedStops.push(n);
for (let n = 320; n <= 500; n += 20) speedStops.push(n);
export const SCROLL_SPEED_STOPS: readonly number[] = Object.freeze(speedStops);

export function nextScrollSpeed(current: number, direction: -1 | 1): number {
  const previous = validSpeed(current), epsilon = .000001;
  let upper = SCROLL_SPEED_STOPS.findIndex(value => value >= previous - epsilon);
  if (upper < 0) upper = SCROLL_SPEED_STOPS.length - 1;
  const exact = Math.abs(SCROLL_SPEED_STOPS[upper]! - previous) <= epsilon;
  let index = exact ? upper + direction : direction > 0 ? upper : Math.max(0, upper - 1);
  if (!exact && upper > 0) {
    const interval = SCROLL_SPEED_STOPS[upper]! - SCROLL_SPEED_STOPS[upper - 1]!, next = index + direction;
    if (Math.abs(SCROLL_SPEED_STOPS[index]! - previous) < interval / 2 - epsilon && next >= 0 && next < SCROLL_SPEED_STOPS.length) index = next;
  }
  return SCROLL_SPEED_STOPS[clamp(index, 0, SCROLL_SPEED_STOPS.length - 1)]!;
}

export interface ScrollSettings {
  smart: boolean;
  speed: number;
  /** Identifies a settings change while the reader is suspended. */
  revision: number;
}
export interface ScrollSettingsStore {
  get(): ScrollSettings;
  setSmart(value: boolean): void;
  setSpeed(value: number): void;
}

export function createScrollSettings(storage?: PreferenceStorage): ScrollSettingsStore {
  let smart = true, speed = DEFAULT_SCROLL_SPEED, revision = 0;
  try {
    const stored = storage?.getItem(SMART_SCROLL_KEY);
    if (stored === 'true' || stored === 'false') smart = stored === 'true';
  } catch { /* Storage is optional; continue in memory. */ }
  return {
    get: () => ({ smart, speed, revision }),
    setSmart: value => {
      if (value === smart) return;
      smart = value; revision++;
      try { storage?.setItem(SMART_SCROLL_KEY, String(value)); } catch { /* In-memory fallback. */ }
    },
    setSpeed: value => {
      const next = validSpeed(value);
      if (next !== speed) { speed = next; revision++; }
    },
  };
}
