/** Touch gestures are observational: never consume an Android Back/cancel or a control tap. */
const TAP_TIME = 260, TAP_SLOP = 14, DOUBLE_TIME = 360, DOUBLE_SLOP = 44;
const LONG_PRESS_TIME = 550, HOME_PULL = 72;
const interactive = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest('button, input, textarea, select, form, [role="button"], [role="slider"]'));
const headerInteractive = (target: EventTarget | null): boolean => interactive(target) ||
  (target instanceof Element && Boolean(target.closest('a')));
const touchById = (touches: TouchList, id: number): Touch | undefined =>
  Array.from(touches).find(touch => touch.identifier === id);

/** On home, pull down at the top to focus the existing search field. */
export function attachHomePullSearch(main: HTMLElement, input: HTMLInputElement): () => void {
  let start: { id: number; x: number; y: number; dx: number; dy: number; multi: boolean } | undefined;
  const listeners = new AbortController(), signal = listeners.signal;
  window.addEventListener('touchstart', event => {
    if (start) { if (event.touches.length > 1) start.multi = true; return; }
    const point = event.changedTouches[0];
    if (event.touches.length !== 1 || !point || window.scrollY > 1 || !(point.target instanceof Node) ||
        (!main.contains(point.target) && point.target !== main.parentElement) || interactive(point.target)) return;
    start = { id: point.identifier, x: point.clientX, y: point.clientY, dx: 0, dy: 0, multi: false };
  }, { passive: true, signal });
  window.addEventListener('touchmove', event => {
    if (!start) return;
    if (event.touches.length > 1) start.multi = true;
    const point = touchById(event.touches, start.id);
    if (point) { start.dx = point.clientX - start.x; start.dy = point.clientY - start.y; }
  }, { passive: true, signal });
  window.addEventListener('touchend', event => {
    if (!start) return;
    const point = touchById(event.changedTouches, start.id);
    if (!point) { if (event.touches.length > 0) start.multi = true; return; }
    const before = start; start = undefined;
    const dx = point.clientX - before.x, dy = point.clientY - before.y;
    if (!before.multi && event.touches.length === 0 && window.scrollY <= 1 &&
        dy >= HOME_PULL && dy >= Math.abs(dx) * 1.5 && before.dy >= HOME_PULL &&
        before.dy >= Math.abs(before.dx) * 1.5 && main.isConnected) input.focus({ preventScroll: true });
  }, { passive: true, signal });
  window.addEventListener('touchcancel', () => { start = undefined; }, { passive: true, signal });
  return () => { start = undefined; listeners.abort(); };
}

/** Header background/title only: buttons, search controls, moved and cancelled touches stay native. */
export function attachReaderHeaderGestures(main: HTMLElement, openSearch: () => void): () => void {
  const header = main.querySelector<HTMLElement>('.reader-header');
  if (!header) return () => {};
  let press: { id: number; x: number; y: number; start: number } | undefined;
  let lastTap: { x: number; y: number; time: number } | undefined, lastTouch = -Infinity;
  const listeners = new AbortController(), signal = listeners.signal;
  const cancel = (): void => { press = undefined; };
  window.addEventListener('touchstart', event => {
    if (press) { if (event.touches.length > 1) { cancel(); lastTap = undefined; } return; }
    const point = event.changedTouches[0];
    if (event.touches.length !== 1 || !point || !(point.target instanceof Node) ||
        !header.contains(point.target) || headerInteractive(point.target)) { lastTap = undefined; return; }
    lastTouch = performance.now();
    press = { id: point.identifier, x: point.clientX, y: point.clientY, start: lastTouch };
  }, { passive: true, signal });
  window.addEventListener('touchmove', event => {
    if (!press) return;
    const point = touchById(event.touches, press.id);
    if (!point || event.touches.length > 1 || Math.hypot(point.clientX - press.x, point.clientY - press.y) > TAP_SLOP) {
      cancel(); lastTap = undefined;
    }
  }, { passive: true, signal });
  window.addEventListener('touchend', event => {
    if (!press) return;
    const point = touchById(event.changedTouches, press.id);
    if (!point) return;
    const candidate = press, now = performance.now(); lastTouch = now; cancel();
    if (event.touches.length || Math.hypot(point.clientX - candidate.x, point.clientY - candidate.y) > TAP_SLOP) {
      lastTap = undefined; return;
    }
    // Commit only on a completed touch. An OS Back gesture can still cancel a
    // long contact, and focus should happen in the user's touchend activation.
    if (now - candidate.start >= LONG_PRESS_TIME) { lastTap = undefined; if (main.isConnected) openSearch(); return; }
    if (now - candidate.start > TAP_TIME) { lastTap = undefined; return; }
    if (lastTap && now - lastTap.time <= DOUBLE_TIME && Math.hypot(point.clientX - lastTap.x, point.clientY - lastTap.y) <= DOUBLE_SLOP) {
      lastTap = undefined; window.scrollTo({ top: 0, behavior: 'auto' });
    } else lastTap = { x: point.clientX, y: point.clientY, time: now };
  }, { passive: true, signal });
  window.addEventListener('touchcancel', () => { cancel(); lastTap = undefined; }, { passive: true, signal });
  header.addEventListener('dblclick', event => {
    if (performance.now() - lastTouch < 800 || headerInteractive(event.target)) return;
    event.preventDefault(); window.scrollTo({ top: 0, behavior: 'auto' });
  }, { signal });
  return () => { cancel(); listeners.abort(); };
}
