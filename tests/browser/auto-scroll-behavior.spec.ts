import { expect, test, type Page } from '@playwright/test';

// These cover the integrated app and use Chromium touch emulation, not a device.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const reader = (page: Page) => page.locator('main[data-screen="reader"]');
const open = async (page: Page): Promise<void> => {
  await page.goto('./#/item/dua-kumayl');
  await expect(reader(page)).toHaveAttribute('data-item-id', 'dua-kumayl');
  await expect(page.locator('#current-marker')).toBeVisible();
};
const manual = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.locator('#smart-toggle').click();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(reader(page)).toHaveAttribute('data-smart', 'false');
};
const scroll = (page: Page): Promise<number> => page.evaluate(() => window.scrollY);


test('selected S7, the fading band and Comfort hit area stay aligned across widths and dark theme', async ({ page }) => {
  await open(page);
  const marker = page.locator('#current-marker'), guide = page.locator('#guide-layer');
  // The path and painted (not SVG-frame) geometry match the selected S7 preview.
  const selectedPath = 'M24 14 H20.7 L19.1 15 H16 L11.8 18 L16 21 H19.1 L20.7 22 H24 Z';
  for (const id of ['#current-marker', '#expected-marker', '#expected-edge']) {
    await expect(page.locator(`${id} path`)).toHaveAttribute('d', selectedPath);
    await expect(page.locator(`${id} svg`)).toHaveAttribute('viewBox', '11 9 13 18');
    await expect(page.locator(`${id} svg`)).toHaveAttribute('preserveAspectRatio', 'none');
  }
  const widths: number[] = [];
  for (const width of [320, 390, 1200]) {
    await page.setViewportSize({ width, height: 844 });
    widths.push(await marker.evaluate(element => {
      const box = element.getBoundingClientRect(), y = box.top + box.height / 2, edge = box.right;
      let reach = 0;
      for (let x = edge - .5; x >= Math.max(0, edge - 100); x--) {
        if (document.elementFromPoint(x, y)?.closest('#current-marker')) reach = edge - x;
      }
      return reach;
    }));
    const geometry = await marker.locator('svg').evaluate(svg => {
      const box = svg.getBoundingClientRect(); return { width: box.width, height: box.height };
    });
    expect(geometry.width).toBeCloseTo(16.79, 1); expect(geometry.height).toBeCloseTo(23.25, 1);
    const ink = await marker.locator('path').evaluate((path: SVGPathElement) => {
      const box = path.getBBox(), transform = path.getScreenCTM()!, rect = path.getBoundingClientRect();
      return { width: box.width * transform.a, height: box.height * transform.d, right: rect.right };
    });
    expect(ink.width).toBeCloseTo(15.758333, 1); expect(ink.height).toBeCloseTo(10.333333, 1);
    expect(ink.right).toBeCloseTo(width <= 760 ? width : (width + 760) / 2, 1);
  }
  console.log(`Comfort effective inward reach at 320/390/1200: ${widths.map(n => n.toFixed(1)).join('/')}px`);
  for (const width of widths) expect(width).toBeGreaterThanOrEqual(71);
  await expect(guide).toHaveCSS('pointer-events', 'none');
  await marker.focus(); const before = (await marker.boundingBox())!.y;
  await page.keyboard.press('ArrowDown'); expect((await marker.boundingBox())!.y - before).toBeCloseTo(16, 0);
  await expect(guide).toHaveAttribute('data-dragging', 'true');
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByRole('button', { name: 'تیره', exact: true }).click();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.locator('html').evaluate(e => getComputedStyle(e).getPropertyValue('--guide-ink').trim())).toBe('179,229,200');
  await page.waitForTimeout(150);
  expect(Number(await guide.evaluate(e => getComputedStyle(e, '::before').opacity))).toBeGreaterThan(.7);
  await page.locator('#play').click();
  const target = await marker.evaluate(element => {
    const box = element.getBoundingClientRect();
    return !!document.elementFromPoint(box.right - 60, box.top + box.height / 2)?.closest('#current-marker');
  });
  expect(target).toBe(false);
});


test('manual speed dock remains usable while scrolling and changes speed once per touch', async ({ page }) => {
  await open(page); await manual(page);
  await page.locator('#play').click(); await expect(page.locator('#speed-dock')).toBeVisible();
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  const before = await scroll(page);
  await page.locator('#faster').tap();
  await expect(reader(page)).toHaveAttribute('data-speed', '18');
  await expect(page.locator('#speed-output')).toHaveText('۱۸');
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await page.waitForTimeout(450); expect((await scroll(page)) - before).toBeGreaterThan(5);
  await page.locator('#slower').tap(); await expect(reader(page)).toHaveAttribute('data-speed', '16');
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.locator('#smart-toggle').click();
  await expect(page.locator('#settings-faster')).toBeDisabled();
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  await expect(reader(page)).toHaveAttribute('data-smart', 'true');
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await expect(page.locator('#speed-dock')).toBeHidden();
});


test('a second finger can adjust the manual dock while the first holds the reader', async ({ page, context }) => {
  await open(page); await manual(page); await page.locator('#play').click();
  await expect(page.locator('#speed-dock')).toBeVisible();
  const box = (await page.locator('#faster').boundingBox())!;
  const finger = { x: 200, y: 400, id: 1, radiusX: 1, radiusY: 1, force: 1 };
  const button = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 2, radiusX: 1, radiusY: 1, force: 1 };
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
  await expect(reader(page)).toHaveAttribute('data-phase', 'holding');
  const before = await scroll(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger, button] });
  await page.waitForTimeout(80);
  // CDP touchEnd names the finger being lifted, not the one left down.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [button] });
  await expect(reader(page)).toHaveAttribute('data-speed', '18');
  await expect(reader(page)).toHaveAttribute('data-phase', 'holding');
  await page.waitForTimeout(200); expect(Math.abs((await scroll(page)) - before)).toBeLessThan(2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto'); await cdp.detach();
});


test('play has the same temporary pressed highlight as other header controls in both themes', async ({ page }) => {
  await open(page);
  const color = (selector: string) => page.locator(selector).evaluate(node => getComputedStyle(node).backgroundColor);
  const pressWithoutClick = async (selector: string) => {
    const box = (await page.locator(selector).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    const pressed = await color(selector); await page.mouse.move(190, 300); await page.mouse.up(); return pressed;
  };
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'تنظیمات متن' }).click();
      await page.getByRole('button', { name: 'تیره', exact: true }).click();
      await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
    }
    const other = '[data-reader-search]', idle = await color(other);
    expect(await color('#play')).toBe(idle);
    const otherPressed = await pressWithoutClick(other), playPressed = await pressWithoutClick('#play');
    expect(otherPressed).not.toBe(idle); expect(playPressed).toBe(otherPressed);
    await page.locator('#play').click(); await page.waitForTimeout(100);
    expect(await color('#play')).toBe(idle); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
    await page.locator('#play').click(); await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  }
});


test('double tap toggles playback, and the real reader stops at the bottom', async ({ page }) => {
  await open(page);
  const doubleTap = async () => { await page.touchscreen.tap(190, 300); await page.waitForTimeout(60); await page.touchscreen.tap(190, 300); };
  await doubleTap(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(400); await doubleTap(); await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await page.waitForTimeout(400); await doubleTap(); await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#play').click();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
});


test('active swipes follow the finger without a fling tail; paused swipes retain native momentum', async ({ page, context }) => {
  await open(page); await manual(page); await page.evaluate(() => window.scrollTo(0, 4000));
  await page.locator('#play').click(); await page.waitForTimeout(200);
  const cdp = await context.newCDPSession(page);
  const point = (y: number) => [{ x: 190, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  const swipe = async (from: number, to: number): Promise<{ held: number; tail: number }> => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from) });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(from + (to - from) * i / 12) });
      await page.waitForTimeout(10);
    }
    const held = await scroll(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const released = await scroll(page); await page.waitForTimeout(300);
    return { held, tail: (await scroll(page)) - released };
  };
  const start = await scroll(page), forward = await swipe(700, 150);
  expect(forward.held - start).toBeGreaterThan(450); expect(forward.tail).toBeGreaterThanOrEqual(0); expect(forward.tail).toBeLessThan(15);
  const middle = await scroll(page), backward = await swipe(150, 700);
  expect(middle - backward.held).toBeGreaterThan(450); expect(backward.tail).toBeGreaterThanOrEqual(0); expect(backward.tail).toBeLessThan(15);
  await page.locator('#play').click(); await page.waitForTimeout(100);
  const paused = await swipe(700, 150);
  console.log(`Active post-release movement: ${forward.tail}/${backward.tail}px; paused native tail: ${paused.tail}px`);
  expect(paused.tail).toBeGreaterThan(20);
  await cdp.detach();
});


test('Smart learns an ordinary forward correction and retains the requested resize rollback', async ({ page, context }) => {
  await open(page); await page.evaluate(() => window.scrollTo(0, 3000));
  const cdp = await context.newCDPSession(page);
  const point = (y: number) => [{ x: 190, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  await page.locator('#play').click(); await page.waitForTimeout(800);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(650) });
  await page.waitForTimeout(350);
  for (let i = 1; i <= 4; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(650 - i * 30) }); await page.waitForTimeout(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => Number(await reader(page).getAttribute('data-speed'))).toBeGreaterThan(30);
  await page.reload(); await expect(reader(page)).toHaveAttribute('data-speed', '16');
  await page.evaluate(() => window.scrollTo(0, 3000)); await page.locator('#play').click(); await page.waitForTimeout(800);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(600) });
  await page.waitForTimeout(200); await page.setViewportSize({ width: 375, height: 844 }); await page.waitForTimeout(120);
  for (let i = 1; i <= 4; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(600 - i * 30) }); await page.waitForTimeout(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await expect(reader(page)).toHaveAttribute('data-speed', '16');
  await cdp.detach();
});


for (const delay of [0, 5]) {
  test(`the requested Smart rollback keeps the pre-frame correction unchanged at ${delay}ms`, async ({ page, context }) => {
    const origin = new Date('2024-01-01T00:00:00Z');
    await page.clock.install({ time: origin }); await page.clock.pauseAt(origin);
    await open(page); await page.evaluate(() => window.scrollTo(0, 3000));
    await page.locator('#play').evaluate((button: HTMLButtonElement) => button.click());
    const cdp = await context.newCDPSession(page);
    const point = (y: number) => [{ x: 190, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(600) });
    if (delay) await page.clock.runFor(delay);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(480) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(reader(page)).toHaveAttribute('data-speed', '16');
    await cdp.detach();
  });
}


test('a forward correction that is still behind the ghost learns slower', async ({ page, context }) => {
  await open(page); await page.evaluate(() => window.scrollTo(0, 3000));
  await page.locator('#play').click(); await page.waitForTimeout(800);
  const cdp = await context.newCDPSession(page);
  const point = (y: number) => [{ x: 190, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(600) });
  await page.waitForTimeout(2200);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(580) }); await page.waitForTimeout(60);
  const gap = await page.evaluate(() => {
    const live = document.querySelector('#current-marker')!.getBoundingClientRect();
    const ghost = document.querySelector('#expected-marker')!.getBoundingClientRect();
    return ghost.top + ghost.height / 2 - live.top - live.height / 2;
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const speed = Number(await reader(page).getAttribute('data-speed'));
  console.log(`Forward correction still behind ghost: ${gap.toFixed(1)}px, speed ${speed.toFixed(2)}px/s`);
  expect(gap).toBeGreaterThan(5); expect(speed).toBeLessThan(16); await cdp.detach();
});


test('browser visibility suspends playback without a catch-up jump and resumes the same play choice', async ({ page }) => {
  await open(page); await page.locator('#play').click(); await page.waitForTimeout(200);
  const visibility = (hidden: boolean) => page.evaluate(value => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await visibility(true); const suspended = await scroll(page); await page.waitForTimeout(600);
  expect(Math.abs((await scroll(page)) - suspended)).toBeLessThan(2);
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#current-marker')).toBeHidden();
  await visibility(false); const before = await scroll(page); await page.waitForTimeout(450);
  const resumed = (await scroll(page)) - before;
  expect(resumed).toBeGreaterThan(4); expect(resumed).toBeLessThan(30);
  await expect(page.locator('#current-marker')).toBeVisible();
});


test('mocked native activity background and foreground suspend without losing playback', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { androidBridge: object; Capacitor: object;
      __appState?: (state: { isActive: boolean }) => void };
    w.androidBridge = {};
    w.Capacitor = {
      PluginHeaders: [{ name: 'App', methods: [
        { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' },
      ] }],
      nativeCallback: (_plugin: string, method: string, options: { eventName?: string }, callback: (state: { isActive: boolean }) => void) => {
        if (method === 'addListener' && options.eventName === 'appStateChange') w.__appState = callback;
        return 'mock-listener-id';
      },
      nativePromise: () => Promise.resolve(),
    };
  });
  await open(page);
  await page.waitForFunction(() => typeof (window as unknown as { __appState?: unknown }).__appState === 'function');
  const state = (isActive: boolean) => page.evaluate(value => (window as unknown as { __appState: (s: { isActive: boolean }) => void }).__appState({ isActive: value }), isActive);
  await page.locator('#play').click(); await page.waitForTimeout(200); await state(false);
  const before = await scroll(page); await page.waitForTimeout(550);
  expect(Math.abs((await scroll(page)) - before)).toBeLessThan(2);
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'true');
  await state(true); const resumed = await scroll(page); await page.waitForTimeout(450);
  expect((await scroll(page)) - resumed).toBeGreaterThan(4);
  expect((await scroll(page)) - resumed).toBeLessThan(30);
});


test('restoring in-text search with browser Forward stops playback again', async ({ page }) => {
  await open(page); await page.locator('#play').click();
  await page.getByRole('button', { name: 'جست‌وجو در متن' }).click();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await page.evaluate(() => history.back());
  await expect(page.getByRole('button', { name: 'جست‌وجو در متن' })).toBeVisible();
  // Preserve the Forward entry while restarting without generating a pointer guard.
  await page.locator('#play').evaluate((button: HTMLButtonElement) => button.click());
  await expect(reader(page)).toHaveAttribute('data-phase', 'auto');
  await page.evaluate(() => history.forward());
  await expect(page.getByRole('searchbox', { name: 'جست‌وجو در این متن' })).toBeVisible();
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
  await page.getByRole('button', { name: 'بستن جست‌وجو' }).click();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'false');
});


test('a native foreground event cannot restart a reader while its next route is loading', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { androidBridge: object; Capacitor: object;
      __appState?: (state: { isActive: boolean }) => void };
    w.androidBridge = {};
    w.Capacitor = {
      PluginHeaders: [{ name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }] }],
      nativeCallback: (_plugin: string, method: string, options: { eventName?: string }, callback: (state: { isActive: boolean }) => void) => {
        if (method === 'addListener' && options.eventName === 'appStateChange') w.__appState = callback;
        return 'mock-listener-id';
      },
      nativePromise: () => Promise.resolve(),
    };
  });
  await open(page); await page.waitForFunction(() => typeof (window as unknown as { __appState?: unknown }).__appState === 'function');
  let release!: () => void, requested!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const pending = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/data/items/sura-yasin.json', async route => { requested(); await gate; await route.continue(); });
  try {
    await page.locator('#play').click(); await page.waitForTimeout(200);
    await page.evaluate(() => { location.hash = '#/item/sura-yasin'; }); await pending;
    await page.evaluate(() => (window as unknown as { __appState: (s: { isActive: boolean }) => void }).__appState({ isActive: true }));
    const before = await scroll(page); await page.waitForTimeout(500);
    expect(Math.abs((await scroll(page)) - before)).toBeLessThan(2);
    await expect(page.locator('#current-marker')).toBeHidden();
  } finally { release(); }
  await expect(reader(page)).toHaveAttribute('data-item-id', 'sura-yasin');
});


test('navigation suspends the old reader even while the next item is loading', async ({ page }) => {
  await open(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requested!: () => void;
  const pending = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/data/items/sura-yasin.json', async route => { requested(); await gate; await route.continue(); });
  await page.locator('#play').click(); await page.waitForTimeout(200);
  await page.evaluate(() => { location.hash = '#/item/sura-yasin'; }); await pending;
  const before = await scroll(page); await page.waitForTimeout(500);
  expect(Math.abs((await scroll(page)) - before)).toBeLessThan(2);
  await expect(page.locator('#current-marker')).toBeHidden();
  release();
  await expect(reader(page)).toHaveAttribute('data-item-id', 'sura-yasin');
  await expect(reader(page)).toHaveAttribute('data-phase', 'paused');
});
