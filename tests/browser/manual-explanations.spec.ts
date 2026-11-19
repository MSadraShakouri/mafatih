import { expect, test } from '@playwright/test';
import { runtimeItem, sourceTarget } from './row-source-fixture.js';

test('selected famous introductions and instructions use their own adjustable size, not a blanket Persian-only rule', async ({ page, request }) => {
  await page.goto('./#/item/dua-kumayl');
  const intro = page.locator('[data-row-id="r00009"] p[lang="fa"]');
  const arabic = page.locator('[data-row-id="r00012"] p[lang="ar"]');
  const translation = page.locator('[data-row-id="r00012"] p[lang="fa"]');
  await expect(intro).toHaveAttribute('data-text-role', 'explanation');
  await expect(intro).toContainText('از دعاهای بسیار معروف است');
  await expect(arabic).toHaveAttribute('data-text-role', 'arabic');
  await expect(translation).toHaveAttribute('data-text-role', 'translation');
  const size = async (selector: typeof intro) => selector.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  const before = await Promise.all([intro, arabic, translation].map(size));
  await page.getByRole('button', { name: 'تنظیمات متن' }).click();
  await page.getByRole('button', { name: 'دیدن نمونهٔ توضیحات' }).click();
  await page.getByRole('button', { name: 'بزرگ‌تر کردن توضیحات' }).evaluate(button => {
    for (let n = 0; n < 10; n++) (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: 'بازگشت به دعا' }).click();
  const after = await Promise.all([intro, arabic, translation].map(size));
  expect(after[0]).toBeGreaterThan(before[0]!);
  expect(after.slice(1)).toEqual(before.slice(1));

  const warith = await runtimeItem(request, 'ziyarat-warith');
  const instruction = sourceTarget(warith, 'r00148', 'ar');
  await page.goto('./#/item/ziyarat-warith');
  await expect(page.locator('[data-row-id="r00004"] p[lang="fa"]')).toHaveAttribute('data-text-role', 'explanation');
  await expect(page.locator(`[data-row-id="${instruction.row}"] p[lang="${instruction.language}"]`)).toHaveAttribute('data-text-role', 'explanation');
  const abu = await runtimeItem(request, 'item-abvhmzh-smaly');
  await page.goto('./#/item/item-abvhmzh-smaly');
  for (const old of ['r00220', 'r00221']) {
    const target = sourceTarget(abu, old, 'fa');
    await expect(page.locator(`[data-row-id="${target.row}"] p[lang="${target.language}"]`))
      .toHaveAttribute('data-text-role', target.language === 'ar' ? 'arabic' : 'translation');
  }
});
