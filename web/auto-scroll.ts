import { ICONS } from './icons.js';
import {
  MAX_SCROLL_SPEED, MIN_SCROLL_SPEED, nextScrollSpeed, type ScrollSettingsStore,
} from './scroll-settings.js';
import { scrollSpeedText } from './scroll-settings-ui.js';
import type { ReadingPointer } from './reader-anchor.js';

// This is the selected standalone reader's scrolling/gesture behavior, mounted
// on one real item. It does not rewrite or wrap any source text.
type Phase = 'paused' | 'auto' | 'holding';
type HoldKind = 'reader' | 'control';
interface Hold {
  kind: HoldKind;
  started: number;
  beforeError: number;
  beforeElapsed: number;
  beforeScroll: number;
  skipTraining: boolean;
  fromWheel?: boolean;
  fromKeyboard?: boolean;
}
interface Blend {
  offset: number;
  nativeStart: number;
  nativeLast: number;
  lastNativeAt: number;
  releasedAt: number;
  baseElapsed: number;
  releaseSpeed: number;
  oldSpeed: number;
  learn: boolean;
  carryError: number;
  carryElapsed: number;
}
interface Candidate {
  x: number; y: number; start: number; distance: number; multi?: boolean;
  dragScroll: number; dragY: number; lastY: number; controlled: boolean; dragging?: boolean;
}
interface TouchCandidate extends Candidate { id: number; startScroll: number }
interface MarkerDrag { id: number; startY: number; anchor: number }
interface DockTouch { button: HTMLButtonElement; x: number; y: number; distance: number }
interface State {
  playing: boolean; smart: boolean; speed: number; phase: Phase;
  expected: number; elapsed: number; target: number; commandedY: number; anchor: number;
  hold: Hold | null; blend: Blend | null; tapGuardUntil: number; flingGuardUntil: number;
  lastFrame: number | null; intersecting: boolean; appActive: boolean; suspended: boolean;
}

export interface AutoScrollSnapshot {
  playing: boolean;
  anchor: number;
  elapsed: number;
  error: number;
  settingsRevision: number;
}
export interface AutoScrollController extends ReadingPointer {
  toggle(): void;
  /** Opening search is an explicit stop; closing it does not restart scrolling. */
  setSearchOpen(open: boolean): void;
  snapshotForSettings(): AutoScrollSnapshot;
  /** Freeze this outgoing reader regardless of subsequent activity events. */
  suspendForNavigation(): void;
  setAppActive(active: boolean): void;
  dispose(): void;
}

const TAP_TIME = 260, TAP_DISTANCE = 14, DOUBLE_TIME = 360, DOUBLE_DISTANCE = 44;
const TAP_GUARD_SPEED = 16, TAP_EASE_DELAY = 150, CONTROL_TIME = 4200, BLEND_IDLE = 160;
const NATIVE_HALT_MS = 150, NATIVE_GUARD_MS = 250;
const S7_PATH = 'M24 14 H20.7 L19.1 15 H16 L11.8 18 L16 21 H19.1 L20.7 22 H24 Z';
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const digits = (value: number): string => String(value).replace(/[0-9]/g, n => '۰۱۲۳۴۵۶۷۸۹'[Number(n)]!);
const clock = (): number => performance.now();
const scrollY = (): number => window.scrollY || document.documentElement.scrollTop || 0;
const maxScroll = (): number => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
const markerBounds = (): { top: number; bottom: number } => ({ top: 62, bottom: Math.max(64, innerHeight - 18) });

/** Mount one controller after the real reader's position has been restored. */
export function attachAutoScroll(main: HTMLElement, settings: ScrollSettingsStore,
  snapshot?: AutoScrollSnapshot, resetReference = false, appActive = true): AutoScrollController {
  const content = main.querySelector<HTMLElement>('.content');
  const reader = main.querySelector<HTMLElement>('article.reader');
  const header = main.querySelector<HTMLElement>('.reader-header');
  const play = main.querySelector<HTMLButtonElement>('#play');
  if (!content || !reader || !header || !play) throw Error('Auto-scroll requires a mounted reader and header');
  const root = document.documentElement;
  const selected = settings.get(), actual = scrollY();
  const bounds = markerBounds(), initialAnchor = clamp(snapshot?.anchor ?? innerHeight * .5, bounds.top, bounds.bottom);
  const state: State = {
    playing: snapshot?.playing ?? false, smart: selected.smart, speed: selected.speed, phase: 'paused',
    expected: snapshot && !resetReference ? actual - snapshot.error : actual,
    elapsed: snapshot && !resetReference ? snapshot.elapsed : 0,
    target: actual, commandedY: actual, anchor: initialAnchor, hold: null, blend: null,
    tapGuardUntil: 0, flingGuardUntil: 0, lastFrame: clock(), intersecting: true,
    appActive, suspended: false,
  };

  const guide = document.createElement('div'); guide.id = 'guide-layer'; guide.dataset.dragging = 'false';
  guide.setAttribute('aria-hidden', 'true'); guide.hidden = true; content.prepend(guide);
  const overlays = document.createElement('div');
  overlays.innerHTML = `<div id="expected-layer" class="ghost-layer" aria-hidden="true"><div id="expected-marker" class="marker marker-expected" hidden><span class="marker-glyph"><svg viewBox="11 9 13 18" preserveAspectRatio="none" aria-hidden="true"><path d="${S7_PATH}" fill="var(--paper)" stroke="var(--ghost)" stroke-width="1.4" stroke-linejoin="round"/></svg></span></div></div>
    <div id="current-marker" class="marker marker-current" role="slider" aria-label="جایگاه نشان خواندن" aria-describedby="marker-help" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-disabled="false" tabindex="0" title="وقتی پیمایش متوقف است، نشان حاشیهٔ راست را بکشید یا با کلیدهای بالا و پایین جابه‌جا کنید." hidden><span class="marker-glyph" aria-hidden="true"><svg viewBox="11 9 13 18" preserveAspectRatio="none" aria-hidden="true"><path d="${S7_PATH}" fill="var(--live)"/></svg></span></div>
    <p id="marker-help" class="visually-hidden">وقتی پیمایش متوقف است، نشان حاشیهٔ راست را با انگشت بکشید یا با کلیدهای بالا و پایین جابه‌جا کنید.</p>
    <div id="expected-edge" class="marker marker-expected-edge" aria-hidden="true" hidden><span class="marker-glyph"><svg viewBox="11 9 13 18" preserveAspectRatio="none" aria-hidden="true"><path d="${S7_PATH}" fill="var(--paper)" stroke="var(--ghost)" stroke-width="1.4" stroke-linejoin="round"/></svg></span><span class="marker-edge"></span></div>
    <div id="speed-dock" class="speed-dock" role="group" aria-label="کنترل سرعت پیمایش" hidden>
      <button id="slower" class="speed-button" type="button" aria-label="سرعت کمتر" title="سرعت کمتر">${ICONS.minus}</button>
      <div class="speed-middle"><span class="speed-title">سرعت</span><output id="speed-output" class="speed-value"></output></div>
      <button id="faster" class="speed-button" type="button" aria-label="سرعت بیشتر" title="سرعت بیشتر">${ICONS.plus}</button>
    </div>
    <div class="visually-hidden" role="status" aria-live="polite" data-scroll-announcer></div>`;
  const currentMarker = overlays.querySelector<HTMLElement>('#current-marker')!;
  const expectedMarker = overlays.querySelector<HTMLElement>('#expected-marker')!;
  const edgeMarker = overlays.querySelector<HTMLElement>('#expected-edge')!;
  const edgeLabel = edgeMarker.querySelector<HTMLElement>('.marker-edge')!;
  const speedDock = overlays.querySelector<HTMLElement>('#speed-dock')!;
  const speedOutput = overlays.querySelector<HTMLOutputElement>('#speed-output')!;
  const slower = overlays.querySelector<HTMLButtonElement>('#slower')!;
  const faster = overlays.querySelector<HTMLButtonElement>('#faster')!;
  const announcer = overlays.querySelector<HTMLElement>('[data-scroll-announcer]')!;
  while (overlays.firstChild) main.append(overlays.firstChild);

  let touchCount = 0, totalTouchCount = 0, touchCandidate: TouchCandidate | null = null;
  let lastTap: { time: number; x: number; y: number } | null = null, lastTouchTime = -Infinity;
  let mouseDown = false, dockPointerDown = false, mouseCandidate: Candidate | null = null;
  let markerDrag: MarkerDrag | null = null, dockTimer = 0, announceTimer = 0, guideKeyTimer = 0;
  let pausedGestureEnd = -Infinity, lastPausedScrollAt = -Infinity, overflowRestore: string | null = null, overflowTimer = 0;
  const dockTouchButtons = new Map<number, DockTouch>();
  let ghostAnimation: Animation | null = null, frameId = 0, disposed = false;
  let markerRenderedY = NaN, markerRenderedBottom = NaN, markerRenderedAdjustable: boolean | null = null;
  const listeners = new AbortController(), signal = listeners.signal;
  let observer: IntersectionObserver | undefined;

  const isBodyTarget = (target: EventTarget | null): boolean => target instanceof Element && content.contains(target);
  const isDockTarget = (target: EventTarget | null): boolean => target instanceof Element && !!target.closest('#speed-dock');
  const isControl = (target: EventTarget | null): boolean => target instanceof Element && !!target.closest('button, input, select, textarea, #speed-dock, #current-marker');
  // Opening search pauses once, but an intentional body double tap can
  // restart motion without closing the search or moving the reading pointer.
  const readyForPointer = (): boolean => !disposed && !state.suspended && !document.hidden && state.intersecting && state.appActive;
  const readyForMotion = (): boolean => readyForPointer();
  const effectiveY = (): number => scrollY() + (state.blend?.offset || 0);
  function announce(message: string): void {
    window.clearTimeout(announceTimer); announcer.textContent = '';
    announceTimer = window.setTimeout(() => { announcer.textContent = message; }, 30);
  }
  function stopGuideAdjustment(): void {
    window.clearTimeout(guideKeyTimer); guideKeyTimer = 0;
    if (guide.dataset.dragging !== 'false') guide.dataset.dragging = 'false';
  }
  function setPhase(phase: Phase): void {
    state.phase = phase; main.dataset.phase = phase;
    if (phase !== 'paused') stopGuideAdjustment();
  }
  function refreshSpeed(): void {
    settings.setSpeed(state.speed); main.dataset.speed = String(state.speed); main.dataset.smart = String(state.smart);
    const text = scrollSpeedText(state.speed); speedOutput.value = text; speedOutput.textContent = text;
    speedOutput.setAttribute('aria-label', `سرعت ${text}`);
    slower.disabled = state.speed <= MIN_SCROLL_SPEED; faster.disabled = state.speed >= MAX_SCROLL_SPEED;
  }
  function refreshPlay(): void {
    play!.setAttribute('aria-pressed', String(state.playing));
    const label = state.playing ? 'مکث پیمایش خودکار' : 'شروع پیمایش خودکار';
    play!.setAttribute('aria-label', label); play!.title = label;
    const paths = state.playing ? ['M9 5v14', 'M15 5v14'] : ['m7 6 5 5 5-5', 'm7 13 5 5 5-5'];
    play!.querySelectorAll('svg path').forEach((path, index) => path.setAttribute('d', paths[index]!));
  }
  function hideGhost(): void {
    if (!expectedMarker.hidden) expectedMarker.hidden = true;
    if (!edgeMarker.hidden) edgeMarker.hidden = true;
    if (ghostAnimation) { ghostAnimation.cancel(); ghostAnimation = null; }
    currentMarker.classList.remove('together'); expectedMarker.classList.remove('together');
  }
  function hideMarkers(): void { currentMarker.hidden = true; guide.hidden = true; hideGhost(); }
  function hideDock(): void { window.clearTimeout(dockTimer); dockTouchButtons.clear(); speedDock.hidden = true; }
  function showDock(): void {
    if (state.smart || !readyForMotion()) return;
    speedDock.hidden = false; window.clearTimeout(dockTimer);
    dockTimer = window.setTimeout(() => {
      if (totalTouchCount || mouseDown || dockPointerDown) { showDock(); return; }
      speedDock.hidden = true;
    }, CONTROL_TIME);
  }
  function startGhostAnimation(): void {
    if (ghostAnimation) ghostAnimation.cancel();
    const start = state.anchor + state.expected - 9.5, duration = 120000;
    const from = `translate3d(0, ${start}px, 0)`, to = `translate3d(0, ${start + state.speed * duration / 1000}px, 0)`;
    expectedMarker.style.transform = from;
    if (typeof expectedMarker.animate === 'function') {
      const animation = expectedMarker.animate([{ transform: from }, { transform: to }], { duration, easing: 'linear', fill: 'forwards' });
      ghostAnimation = animation;
      animation.onfinish = () => {
        if (ghostAnimation === animation) {
          ghostAnimation = null;
          if (state.playing && state.phase === 'holding' && state.hold?.kind === 'reader') startGhostAnimation();
        }
      };
    }
  }
  function setMarkers(): void {
    if (!readyForPointer()) { hideMarkers(); return; }
    const { top, bottom } = markerBounds(), here = clamp(state.anchor, top, bottom);
    state.anchor = here;
    const adjustable = !state.playing;
    if (currentMarker.hidden || guide.hidden || markerRenderedY !== here || markerRenderedBottom !== bottom || markerRenderedAdjustable !== adjustable) {
      const headerBottom = header!.getBoundingClientRect().bottom;
      const clipTop = `${Math.max(0, headerBottom - (here - 32)).toFixed(2)}px`;
      const clipBottom = `${Math.max(0, here + 32 - innerHeight).toFixed(2)}px`;
      if (currentMarker.style.getPropertyValue('--grip-clip-top') !== clipTop) currentMarker.style.setProperty('--grip-clip-top', clipTop);
      if (currentMarker.style.getPropertyValue('--grip-clip-bottom') !== clipBottom) currentMarker.style.setProperty('--grip-clip-bottom', clipBottom);
      const transform = `translate3d(0, ${here - 9.5}px, 0)`;
      currentMarker.hidden = false; currentMarker.style.transform = transform; guide.hidden = false; guide.style.transform = transform;
      currentMarker.dataset.adjustable = String(adjustable); currentMarker.setAttribute('aria-disabled', String(!adjustable));
      currentMarker.tabIndex = adjustable ? 0 : -1;
      const value = Math.round(100 * (bottom - here) / (bottom - top));
      currentMarker.setAttribute('aria-valuenow', String(value));
      currentMarker.setAttribute('aria-valuetext', `${digits(100 - value)} درصد از بالای محدودهٔ خواندن`);
      markerRenderedY = here; markerRenderedBottom = bottom; markerRenderedAdjustable = adjustable;
    }
    if (!state.playing || !state.hold || state.hold.kind !== 'reader' || state.phase !== 'holding') { hideGhost(); return; }
    const expectedHere = here + state.expected - effectiveY();
    if (expectedMarker.hidden) { expectedMarker.hidden = false; startGhostAnimation(); }
    if (!ghostAnimation && typeof expectedMarker.animate !== 'function') {
      expectedMarker.style.transform = `translate3d(0, ${state.anchor + state.expected - 9.5}px, 0)`;
    }
    const edge = expectedHere < top ? 'top' : expectedHere > bottom ? 'bottom' : '';
    if (edge) {
      if (edgeMarker.hidden) edgeMarker.hidden = false;
      const place = `translate3d(0, ${(edge === 'top' ? top : bottom) - 9.5}px, 0)`;
      if (edgeMarker.style.transform !== place) edgeMarker.style.transform = place;
      if (edgeMarker.dataset.edge !== edge) { edgeMarker.dataset.edge = edge; edgeLabel.textContent = edge === 'top' ? '↑' : '↓'; }
    } else if (!edgeMarker.hidden) edgeMarker.hidden = true;
    const together = !edge && Math.abs(here - expectedHere) < 30;
    if (currentMarker.classList.contains('together') !== together) currentMarker.classList.toggle('together', together);
    if (expectedMarker.classList.contains('together') !== together) expectedMarker.classList.toggle('together', together);
  }
  function moveMarker(y: number): void {
    const { top, bottom } = markerBounds(); state.anchor = clamp(y, top, bottom); setMarkers();
  }
  function cancelMarkerDrag(): void {
    stopGuideAdjustment(); if (!markerDrag) return;
    const id = markerDrag.id; markerDrag = null;
    if (currentMarker.hasPointerCapture(id)) currentMarker.releasePointerCapture(id);
  }
  function onMarkerDown(event: PointerEvent): void {
    if (state.playing || !readyForPointer() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); event.stopPropagation(); stopGuideAdjustment(); guide.dataset.dragging = 'true';
    markerDrag = { id: event.pointerId, startY: event.clientY, anchor: state.anchor };
    currentMarker.setPointerCapture(event.pointerId);
    if (event.pointerType !== 'touch') currentMarker.focus({ preventScroll: true });
  }
  function onMarkerMove(event: PointerEvent): void {
    if (!markerDrag || markerDrag.id !== event.pointerId || state.playing) return;
    event.preventDefault(); event.stopPropagation(); moveMarker(markerDrag.anchor + event.clientY - markerDrag.startY);
  }
  function onMarkerUp(event: PointerEvent): void {
    if (!markerDrag || markerDrag.id !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation(); cancelMarkerDrag();
  }
  function onMarkerKey(event: KeyboardEvent): void {
    if (state.playing || !readyForPointer()) return;
    const { top, bottom } = markerBounds(); let y = state.anchor;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') y -= 16;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') y += 16;
    else if (event.key === 'PageUp') y -= 80;
    else if (event.key === 'PageDown') y += 80;
    else if (event.key === 'Home') y = bottom;
    else if (event.key === 'End') y = top;
    else return;
    event.preventDefault(); event.stopPropagation(); moveMarker(y);
    window.clearTimeout(guideKeyTimer); guide.dataset.dragging = 'true'; guideKeyTimer = window.setTimeout(stopGuideAdjustment, 700);
  }
  function reportSpeed(oldSpeed: number): void {
    if (Math.abs(state.speed - oldSpeed) < Math.max(.05, oldSpeed * .02)) return;
    announce(`سرعت هوشمند از ${scrollSpeedText(oldSpeed)} به ${scrollSpeedText(state.speed)} تغییر کرد.`);
  }
  function flushBlend(report = true): void {
    const b = state.blend; if (!b) return;
    const y = clamp(scrollY() + b.offset, 0, maxScroll()); state.blend = null; reader!.style.transform = '';
    window.scrollTo({ top: y, behavior: 'auto' });
    const actualY = scrollY(); state.target = actualY; state.commandedY = actualY;
    if (b.learn) { state.expected = actualY; state.elapsed = 0; }
    else { state.expected = actualY - b.carryError; state.elapsed = b.carryElapsed + Math.max(0, (clock() - b.releasedAt) / 1000); }
    state.lastFrame = clock(); refreshSpeed(); if (report && b.learn) reportSpeed(b.oldSpeed);
  }
  function syncAtCurrent(): void {
    const y = scrollY(); state.expected = y; state.target = y; state.commandedY = y; state.elapsed = 0; state.lastFrame = clock();
  }
  function clearNativeTakeover(): void {
    window.clearTimeout(overflowTimer); overflowTimer = 0;
    if (overflowRestore !== null) { root.style.overflowY = overflowRestore; overflowRestore = null; }
    state.flingGuardUntil = 0;
  }
  function takeOverNativeFling(now = clock()): void {
    if (overflowRestore === null) overflowRestore = root.style.overflowY;
    window.clearTimeout(overflowTimer); root.style.overflowY = 'hidden'; state.flingGuardUntil = now + NATIVE_GUARD_MS;
    overflowTimer = window.setTimeout(() => {
      if (overflowRestore !== null) { root.style.overflowY = overflowRestore; overflowRestore = null; }
      overflowTimer = 0;
    }, NATIVE_HALT_MS);
  }
  function setPlaying(on: boolean, why: 'user' | 'bottom' = 'user'): void {
    if (state.blend) flushBlend(false);
    if (on && !readyForMotion()) return;
    if (on && scrollY() >= maxScroll() - 1) {
      state.playing = false; state.hold = null; state.tapGuardUntil = 0; setPhase('paused'); refreshPlay(); setMarkers();
      announce('پیمایش در پایان متن متوقف شد.'); return;
    }
    if (on === state.playing && why !== 'bottom') return;
    state.tapGuardUntil = 0; cancelMarkerDrag();
    if (on) {
      const now = clock(); state.playing = true; state.hold = null; syncAtCurrent(); setPhase('auto');
      if (now - pausedGestureEnd < 3000 && now - lastPausedScrollAt < 120) takeOverNativeFling(now);
      pausedGestureEnd = -Infinity;
      if (touchCount || mouseDown) beginPress(touchCandidate || mouseCandidate ? 'reader' : 'control', now);
      announce('پیمایش خودکار شروع شد.');
    } else {
      clearNativeTakeover(); state.playing = false; state.hold = null; state.target = scrollY(); state.commandedY = scrollY(); state.lastFrame = clock();
      setPhase('paused'); announce(why === 'bottom' ? 'پیمایش در پایان متن متوقف شد.' : 'پیمایش خودکار متوقف شد.');
    }
    refreshPlay(); setMarkers();
    if (state.playing) ensureFrame(); else stopFrame();
  }
  function beginPress(kind: HoldKind, now: number): void {
    if (!state.playing || !readyForMotion()) return;
    if (state.blend) flushBlend(); if (state.phase !== 'auto') return;
    state.tapGuardUntil = 0; const current = scrollY();
    state.hold = { kind, started: now, beforeError: current - state.expected, beforeElapsed: state.elapsed, beforeScroll: current, skipTraining: false };
    state.target = current; state.commandedY = current; state.lastFrame = now; setPhase('holding'); setMarkers();
    if (kind === 'reader') announce('متن هنگام لمس متوقف است؛ نشان انتظار به حرکت ادامه می‌دهد.');
  }
  function finishPress(now: number, skipTraining = false, mayHaveMomentum = false): void {
    if (!state.playing || state.phase !== 'holding' || !state.hold) return;
    const hold = state.hold;
    if (hold.kind === 'control') {
      state.expected = scrollY() - hold.beforeError; state.elapsed = hold.beforeElapsed;
      state.target = scrollY(); state.commandedY = scrollY(); state.hold = null; state.lastFrame = now;
      setPhase('auto'); setMarkers(); return;
    }
    hold.skipTraining = hold.skipTraining || skipTraining; completeRealignment(true, mayHaveMomentum, now);
  }
  function completeRealignment(learn = true, mayHaveMomentum = false, now = clock()): void {
    const hold = state.hold;
    if (!hold) { state.target = scrollY(); state.commandedY = scrollY(); setPhase(state.playing ? 'auto' : 'paused'); setMarkers(); return; }
    const actualY = scrollY(), oldSpeed = state.speed, elapsed = Math.max(.05, state.elapsed);
    const learned = learn && state.smart && !hold.skipTraining && state.elapsed > 0;
    if (learned) {
      state.speed = clamp(state.speed + (actualY - state.expected) / elapsed, MIN_SCROLL_SPEED, MAX_SCROLL_SPEED);
      state.expected = actualY; state.elapsed = 0;
    } else if (hold.skipTraining) { state.expected = actualY - hold.beforeError; state.elapsed = hold.beforeElapsed; }
    else { state.expected = actualY; state.elapsed = 0; }
    state.target = actualY; state.commandedY = actualY; state.hold = null; state.lastFrame = now;
    setPhase(state.playing ? 'auto' : 'paused'); setMarkers(); refreshSpeed();
    if (mayHaveMomentum && state.playing) {
      state.blend = { offset: 0, nativeStart: actualY, nativeLast: actualY, lastNativeAt: now,
        releasedAt: now, baseElapsed: elapsed, releaseSpeed: state.speed, oldSpeed, learn: learned,
        carryError: actualY - state.expected, carryElapsed: state.elapsed };
    } else if (learned) reportSpeed(oldSpeed);
  }
  function stopFrame(): void {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  }
  function ensureFrame(): void {
    if (!frameId && state.playing && readyForMotion()) frameId = requestAnimationFrame(updateFrame);
  }
  function updateFrame(now: number): void {
    frameId = 0;
    if (disposed) return;
    const dt = state.lastFrame === null ? 0 : Math.max(0, (now - state.lastFrame) / 1000); state.lastFrame = now;
    if (state.playing && readyForMotion()) {
      const guarded = state.phase === 'auto' && now < state.tapGuardUntil;
      if (state.tapGuardUntil && now >= state.tapGuardUntil) state.tapGuardUntil = 0;
      const startSpeed = Math.min(state.speed, TAP_GUARD_SPEED);
      const elapsed = guarded ? DOUBLE_TIME - (state.tapGuardUntil - now) : DOUBLE_TIME;
      const progress = clamp((elapsed - TAP_EASE_DELAY) / (DOUBLE_TIME - TAP_EASE_DELAY), 0, 1);
      const eased = progress * progress * (3 - 2 * progress), motionSpeed = guarded ? startSpeed + (state.speed - startSpeed) * eased : state.speed;
      if (state.phase === 'auto' || (state.phase === 'holding' && state.hold?.kind === 'reader')) {
        state.expected += motionSpeed * dt; state.elapsed += dt;
      }
      if (state.phase === 'auto') {
        if (state.blend) {
          const b = state.blend, nativeY = scrollY();
          if (Math.abs(nativeY - b.nativeLast) > .5) { b.nativeLast = nativeY; b.lastNativeAt = now; }
          if (b.learn) {
            const extra = nativeY - b.nativeStart;
            const newSpeed = clamp(b.releaseSpeed + extra / (b.baseElapsed + Math.max(0, (now - b.releasedAt) / 1000)), MIN_SCROLL_SPEED, MAX_SCROLL_SPEED);
            if (newSpeed !== state.speed) { state.speed = newSpeed; refreshSpeed(); }
          }
          b.offset = clamp(b.offset + motionSpeed * dt, 0, Math.max(0, maxScroll() - nativeY));
          reader!.style.transform = `translate3d(0, ${-b.offset}px, 0)`;
          if (nativeY + b.offset >= maxScroll() - 1) setPlaying(false, 'bottom');
          else if (state.blend && now - b.lastNativeAt >= BLEND_IDLE) flushBlend();
        } else {
          const actualY = scrollY(), difference = actualY - state.commandedY, farJump = Math.abs(difference) > Math.max(200, innerHeight / 2);
          if (Math.abs(difference) > 2 && (now >= state.flingGuardUntil || farJump)) {
            state.target = actualY; state.expected += difference; state.commandedY = actualY;
          }
          state.target = Math.min(maxScroll(), state.target + motionSpeed * dt);
          window.scrollTo({ top: state.target, behavior: 'auto' }); state.commandedY = scrollY();
          if (state.elapsed >= 30 && Math.abs(state.target - state.expected) < .000001) { state.expected = state.target; state.elapsed = 0; }
          if (scrollY() >= maxScroll() - 1 || state.target >= maxScroll()) setPlaying(false, 'bottom');
        }
      } else if (state.phase === 'holding') {
        if (scrollY() >= maxScroll() - 1) setPlaying(false, 'bottom'); else setMarkers();
      }
    }
    ensureFrame();
  }
  function beginWheel(event: WheelEvent): void {
    if (isControl(event.target)) return;
    if (state.flingGuardUntil) clearNativeTakeover(); if (!state.smart) showDock();
    if (!state.playing || !readyForMotion() || state.blend || state.phase !== 'auto') return;
    beginPress('reader', clock()); if (state.hold) state.hold.fromWheel = true;
    requestAnimationFrame(() => { if (!disposed && state.phase === 'holding' && state.hold?.fromWheel && !touchCount && !mouseDown) finishPress(clock(), false, true); });
  }
  function recordTap(candidate: Candidate | null, x: number, y: number, now: number): boolean {
    if (!candidate || candidate.multi || now - candidate.start > TAP_TIME || candidate.distance > TAP_DISTANCE || Math.hypot(x - candidate.x, y - candidate.y) > TAP_DISTANCE) { lastTap = null; return false; }
    if (lastTap && now - lastTap.time <= DOUBLE_TIME && Math.hypot(x - lastTap.x, y - lastTap.y) <= DOUBLE_DISTANCE) {
      lastTap = null; setPlaying(!state.playing); return true;
    }
    lastTap = { time: now, x, y }; return false;
  }
  function syncTouchCounts(event: TouchEvent): Touch[] {
    totalTouchCount = event.touches.length;
    const readingTouches = Array.from(event.touches).filter(point => !isDockTarget(point.target));
    touchCount = readingTouches.length; return readingTouches;
  }
  function onTouchStart(event: TouchEvent): void {
    if (state.suspended) return;
    lastTouchTime = clock(); const before = touchCount; syncTouchCounts(event);
    const started = Array.from(event.changedTouches).filter(point => !isDockTarget(point.target));
    if (!started.length) { lastTap = null; state.tapGuardUntil = 0; if (!state.smart) showDock(); return; }
    if (before === 0 && touchCount) {
      const point = started[0]!, target = point.target, body = isBodyTarget(target) && !isControl(target), current = scrollY();
      touchCandidate = body ? { id: point.identifier, start: lastTouchTime, x: point.clientX, y: point.clientY, distance: 0,
        multi: touchCount > 1, startScroll: current, dragScroll: current, dragY: point.clientY, lastY: point.clientY, controlled: false } : null;
      if (body && !state.smart) showDock(); beginPress(body ? 'reader' : 'control', lastTouchTime);
      if (touchCandidate) touchCandidate.controlled = state.playing && state.phase === 'holding' && state.hold?.kind === 'reader';
    } else if (touchCandidate && touchCount > 1) touchCandidate.multi = true;
  }
  function onTouchMove(event: TouchEvent): void {
    if (touchCandidate) {
      let point: Touch | null = null;
      for (let i = 0; i < event.touches.length; i++) if (event.touches[i]!.identifier === touchCandidate.id) { point = event.touches[i]!; break; }
      if (point) {
        const candidate = touchCandidate;
        candidate.distance = Math.max(candidate.distance, Math.hypot(point.clientX - candidate.x, point.clientY - candidate.y)); candidate.lastY = point.clientY;
        if (candidate.controlled && state.playing && state.phase === 'holding' && state.hold?.kind === 'reader') {
          const delta = candidate.dragY - point.clientY;
          if (candidate.dragging || Math.abs(delta) > TAP_DISTANCE) {
            candidate.dragging = true; const target = candidate.dragScroll + delta;
            if (target < 0) { candidate.dragScroll = 0; candidate.dragY = point.clientY; }
            window.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
          }
        }
      }
    }
  }
  function onTouchEnd(event: TouchEvent): void {
    if (state.suspended) return;
    lastTouchTime = clock(); const readingTouches = syncTouchCounts(event);
    const changed = Array.from(event.changedTouches), ended = changed.filter(point => !isDockTarget(point.target));
    if (changed.length !== ended.length && !state.smart) showDock(); if (!ended.length) return;
    if (touchCount) {
      if (touchCandidate && !readingTouches.some(point => point.identifier === touchCandidate!.id)) {
        const next = readingTouches.find(point => isBodyTarget(point.target) && !isControl(point.target));
        if (next) {
          touchCandidate.id = next.identifier; touchCandidate.x = next.clientX; touchCandidate.y = next.clientY;
          touchCandidate.dragY = next.clientY; touchCandidate.lastY = next.clientY; touchCandidate.dragScroll = scrollY(); touchCandidate.multi = true;
        }
      }
      return;
    }
    const now = lastTouchTime, candidate = touchCandidate; touchCandidate = null;
    const point = ended.find(item => item.identifier === candidate?.id) || ended[0];
    const nativeMoved = !!candidate && Math.abs(scrollY() - candidate.startScroll) > 2;
    const tap = event.type !== 'touchcancel' && !!candidate && !candidate.multi && !nativeMoved && now - candidate.start <= TAP_TIME && candidate.distance <= TAP_DISTANCE && !!point && Math.hypot(point.clientX - candidate.x, point.clientY - candidate.y) <= TAP_DISTANCE;
    const double = tap && recordTap(candidate, point!.clientX, point!.clientY, now);
    if (!tap) lastTap = null;
    const moved = !!candidate && (candidate.distance > 5 || nativeMoved);
    if (!state.playing && !tap && moved && event.type !== 'touchcancel') pausedGestureEnd = now;
    if (!double) {
      if (state.playing && !tap && moved && !candidate?.controlled && event.type !== 'touchcancel' && state.hold?.kind === 'reader') takeOverNativeFling(now);
      finishPress(now, tap || event.type === 'touchcancel', false);
      if (tap && state.playing && state.phase === 'auto') state.tapGuardUntil = now + DOUBLE_TIME;
    }
  }
  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch' || event.button !== 0 || clock() - lastTouchTime < 800 || state.suspended) return;
    if (isDockTarget(event.target)) { dockPointerDown = true; lastTap = null; state.tapGuardUntil = 0; if (!state.smart) showDock(); return; }
    mouseDown = true; const body = isBodyTarget(event.target) && !isControl(event.target), now = clock();
    mouseCandidate = body ? { x: event.clientX, y: event.clientY, start: now, distance: 0, dragScroll: scrollY(), dragY: event.clientY, lastY: event.clientY, controlled: false } : null;
    if (body && !state.smart) showDock(); beginPress(body ? 'reader' : 'control', now);
    if (mouseCandidate && event.pointerType === 'pen' && state.playing && state.phase === 'holding' && state.hold?.kind === 'reader') mouseCandidate.controlled = true;
  }
  function onPointerMove(event: PointerEvent): void {
    if (mouseDown && mouseCandidate) {
      const candidate = mouseCandidate;
      candidate.distance = Math.max(candidate.distance, Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y)); candidate.lastY = event.clientY;
      if (candidate.controlled && state.playing && state.phase === 'holding' && state.hold?.kind === 'reader') {
        const delta = candidate.dragY - event.clientY;
        if (candidate.dragging || Math.abs(delta) > TAP_DISTANCE) {
          candidate.dragging = true; const target = candidate.dragScroll + delta;
          if (target < 0) { candidate.dragScroll = 0; candidate.dragY = event.clientY; }
          window.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
        }
      }
    }
  }
  function onPointerEnd(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    if (dockPointerDown) { dockPointerDown = false; if (!state.smart) showDock(); return; }
    if (!mouseDown) return;
    mouseDown = false; const now = clock(), candidate = mouseCandidate; mouseCandidate = null;
    const moved = Math.abs(scrollY() - (state.hold?.beforeScroll ?? scrollY())) > 2;
    const quick = !!candidate && now - candidate.start <= TAP_TIME && candidate.distance <= TAP_DISTANCE && !moved;
    if (event.pointerType === 'pen' && state.playing && moved && !candidate?.controlled && state.hold?.kind === 'reader') takeOverNativeFling(now);
    finishPress(now, quick || event.type === 'pointercancel', moved && event.pointerType !== 'pen');
    if (quick && event.type !== 'pointercancel' && state.playing && state.phase === 'auto') state.tapGuardUntil = now + DOUBLE_TIME;
  }
  function changeSpeed(direction: -1 | 1): void {
    const holdingReader = state.playing && readyForMotion() && state.phase === 'holding' && state.hold?.kind === 'reader';
    if (holdingReader) {
      const now = clock(), dt = state.lastFrame === null ? 0 : Math.max(0, (now - state.lastFrame) / 1000);
      state.expected += state.speed * dt; state.elapsed += dt; state.lastFrame = now;
    }
    const previous = state.speed; state.speed = nextScrollSpeed(previous, direction);
    if (holdingReader && !expectedMarker.hidden && state.speed !== previous) startGhostAnimation();
    lastTap = null; state.tapGuardUntil = 0; refreshSpeed(); showDock(); announce(`سرعت ${scrollSpeedText(state.speed)}`);
  }
  function onDockButtonStart(event: TouchEvent): void {
    for (const point of Array.from(event.changedTouches)) {
      const button = point.target instanceof Element ? point.target.closest<HTMLButtonElement>('#slower, #faster') : null;
      if (button && speedDock.contains(button)) dockTouchButtons.set(point.identifier, { button, x: point.clientX, y: point.clientY, distance: 0 });
    }
  }
  function onDockButtonMove(event: TouchEvent): void {
    for (const point of Array.from(event.changedTouches)) {
      const tap = dockTouchButtons.get(point.identifier);
      if (tap) tap.distance = Math.max(tap.distance, Math.hypot(point.clientX - tap.x, point.clientY - tap.y));
    }
  }
  function onDockButtonEnd(event: TouchEvent): void {
    let handled = false; const directions: (-1 | 1)[] = [];
    for (const point of Array.from(event.changedTouches)) {
      const tap = dockTouchButtons.get(point.identifier); if (!tap) continue;
      handled = true; dockTouchButtons.delete(point.identifier);
      const box = tap.button.getBoundingClientRect(), distance = Math.max(tap.distance, Math.hypot(point.clientX - tap.x, point.clientY - tap.y));
      const inside = point.clientX >= box.left && point.clientX <= box.right && point.clientY >= box.top && point.clientY <= box.bottom;
      if (event.type !== 'touchcancel' && inside && distance <= TAP_DISTANCE && !tap.button.disabled && !speedDock.hidden) directions.push(tap.button === faster ? 1 : -1);
    }
    if (handled && event.cancelable) event.preventDefault(); for (const direction of directions) changeSpeed(direction);
  }
  function suspend(): void {
    if (state.blend) flushBlend(false);
    if (state.hold) { const h = state.hold; state.expected = scrollY() - h.beforeError; state.elapsed = h.beforeElapsed; }
    clearNativeTakeover(); cancelMarkerDrag(); state.tapGuardUntil = 0; state.hold = null;
    touchCount = 0; totalTouchCount = 0; mouseDown = false; dockPointerDown = false; touchCandidate = null; mouseCandidate = null; lastTap = null;
    hideMarkers(); hideDock(); state.target = scrollY(); state.commandedY = scrollY(); state.lastFrame = clock(); setPhase(state.playing ? 'auto' : 'paused');
    stopFrame();
  }
  function resume(): void { state.target = scrollY(); state.commandedY = scrollY(); state.lastFrame = clock(); setMarkers(); ensureFrame(); }

  speedDock.addEventListener('touchstart', onDockButtonStart, { passive: true, signal });
  speedDock.addEventListener('touchmove', onDockButtonMove, { passive: true, signal });
  speedDock.addEventListener('touchend', onDockButtonEnd, { passive: false, signal });
  speedDock.addEventListener('touchcancel', onDockButtonEnd, { passive: false, signal });
  slower.addEventListener('click', () => changeSpeed(-1), { signal }); faster.addEventListener('click', () => changeSpeed(1), { signal });
  currentMarker.addEventListener('pointerdown', onMarkerDown, { signal }); currentMarker.addEventListener('pointermove', onMarkerMove, { signal });
  currentMarker.addEventListener('pointerup', onMarkerUp, { signal }); currentMarker.addEventListener('pointercancel', onMarkerUp, { signal });
  currentMarker.addEventListener('lostpointercapture', event => { if (markerDrag?.id === event.pointerId) { markerDrag = null; stopGuideAdjustment(); } }, { signal });
  currentMarker.addEventListener('keydown', onMarkerKey, { signal });
  window.addEventListener('touchstart', onTouchStart, { passive: true, signal }); window.addEventListener('touchmove', onTouchMove, { passive: true, signal });
  window.addEventListener('touchend', onTouchEnd, { passive: true, signal }); window.addEventListener('touchcancel', onTouchEnd, { passive: true, signal });
  window.addEventListener('pointerdown', onPointerDown, { passive: true, signal }); window.addEventListener('pointermove', onPointerMove, { passive: true, signal });
  window.addEventListener('pointerup', onPointerEnd, { passive: true, signal }); window.addEventListener('pointercancel', onPointerEnd, { passive: true, signal });
  window.addEventListener('wheel', beginWheel, { passive: true, signal });
  window.addEventListener('scroll', () => { const now = clock(); if (state.blend) state.blend.lastNativeAt = now; if (!state.playing) lastPausedScrollAt = now; }, { passive: true, signal });
  main.addEventListener('dblclick', event => {
    if (clock() - lastTouchTime < 800 || !isBodyTarget(event.target) || isControl(event.target)) return;
    event.preventDefault(); setPlaying(!state.playing);
  }, { signal });
  window.addEventListener('keydown', event => {
    if (state.playing && !isControl(event.target) && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) && state.phase === 'auto' && !state.blend) {
      if (state.flingGuardUntil) clearNativeTakeover(); beginPress('reader', clock()); if (state.hold) state.hold.fromKeyboard = true;
      requestAnimationFrame(() => { if (!disposed && state.phase === 'holding' && state.hold?.fromKeyboard && !touchCount && !mouseDown) finishPress(clock(), false, true); });
    }
  }, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else resume(); }, { signal });
  window.addEventListener('resize', () => {
    if (state.blend) flushBlend(false);
    state.expected = scrollY(); state.elapsed = 0; state.target = scrollY(); state.commandedY = scrollY(); state.lastFrame = clock();
    if (state.hold) { state.hold.beforeError = 0; state.hold.beforeElapsed = 0; state.hold.beforeScroll = scrollY(); state.hold.skipTraining = true; }
    if (touchCandidate?.controlled) { touchCandidate.dragScroll = scrollY(); touchCandidate.dragY = touchCandidate.lastY; }
    if (mouseCandidate?.controlled) { mouseCandidate.dragScroll = scrollY(); mouseCandidate.dragY = mouseCandidate.lastY; }
    if (ghostAnimation) { ghostAnimation.cancel(); ghostAnimation = null; expectedMarker.hidden = true; }
    setMarkers();
  }, { signal });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      const visible = !!entries[0]?.isIntersecting; if (visible === state.intersecting) return;
      state.intersecting = visible; if (!visible) suspend(); else resume();
    }, { threshold: 0 }); observer.observe(main);
  }
  refreshSpeed(); refreshPlay(); setPhase(state.playing ? 'auto' : 'paused'); setMarkers(); ensureFrame();

  return {
    readingPosition: () => state.anchor,
    setReadingPosition: y => { if (!disposed) moveMarker(y); },
    toggle: () => { setPlaying(!state.playing); if (!state.smart) showDock(); },
    setSearchOpen: open => {
      if (open) { setPlaying(false); cancelMarkerDrag(); hideDock(); setMarkers(); }
      else { syncAtCurrent(); setMarkers(); }
    },
    snapshotForSettings: () => {
      if (state.blend) flushBlend(false);
      const result: AutoScrollSnapshot = { playing: state.playing, anchor: state.anchor, elapsed: state.elapsed,
        error: scrollY() - state.expected, settingsRevision: settings.get().revision };
      state.suspended = true; suspend(); return result;
    },
    suspendForNavigation: () => { state.suspended = true; suspend(); },
    setAppActive: active => {
      if (active === state.appActive) return;
      state.appActive = active; if (active) resume(); else suspend();
    },
    dispose: () => {
      if (disposed) return;
      if (state.blend) flushBlend(false);
      disposed = true; stopFrame(); listeners.abort(); observer?.disconnect();
      clearNativeTakeover(); cancelMarkerDrag(); hideDock(); hideGhost(); window.clearTimeout(announceTimer);
    },
  };
}
