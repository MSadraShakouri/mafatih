import { expect, test } from '@playwright/test';

for (const item of ['dua-kumayl', 'item-mqdmh', 'ziyarat-warith']) {
  test(`reader keeps every runtime row and source order with display-only digit localization: ${item}`, async ({ page, request }) => {
    const response = await request.get(`./data/items/${item}.json`);
    expect(response.ok()).toBe(true);
    const data = await response.json() as { rows: { id: string; ar: string; fa: string; kind?: string }[] };
    await page.goto(`./#/item/${item}`);
    await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-item-id', item);
    const rendered = await page.locator('article [data-row-id]').evaluateAll(elements => elements.map(element => ({
      id: (element as HTMLElement).dataset.rowId!,
      ar: element.querySelector('p[lang="ar"]')?.textContent ?? '',
      fa: element.querySelector('p[lang="fa"]')?.textContent ?? '',
      kind: (element as HTMLElement).dataset.kind,
    })));
    const display = (text: string) => text.replace(/[0-9٠-٩]/gu, digit => '۰۱۲۳۴۵۶۷۸۹'['٠١٢٣٤٥٦٧٨٩'.includes(digit) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : Number(digit)]!);
    expect(rendered).toEqual(data.rows.map(({ id, ar, fa, kind }) => ({ id, ar: display(ar), fa: display(fa), kind })));
    // Runtime/canonical strings are not rewritten by display.
    expect(await response.json()).toEqual(data);
  });
}
