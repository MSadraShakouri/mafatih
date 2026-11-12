import { expect, test } from '@playwright/test';

test('selected famous introductions and instructions use their own adjustable size, not a blanket Persian-only rule', async ({ page }) => {
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

  await page.goto('./#/item/ziyarat-warith');
  await expect(page.locator('[data-row-id="r00004"] p[lang="fa"]')).toHaveAttribute('data-text-role', 'explanation');
  await expect(page.locator('[data-row-id="r00148"] p[lang="ar"]')).toHaveAttribute('data-text-role', 'explanation');
  await page.goto('./#/item/item-abvhmzh-smaly');
  await expect(page.locator('[data-row-id="r00220"] p[lang="fa"]')).toHaveAttribute('data-text-role', 'translation');
  await expect(page.locator('[data-row-id="r00221"] p[lang="fa"]')).toHaveAttribute('data-text-role', 'translation');
});
