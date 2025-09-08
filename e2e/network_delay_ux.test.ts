import { test, expect } from '@playwright/test';

test('ネットワーク遅延時でも「生成中…」/aria-busy/disabledが適切に表示される', async ({ page }) => {
  await page.route('**/api/generate', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ops: ['op-xyz'], usedScript: ['A'] }),
    });
  });
  await page.route('**/api/op**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ done: true, handle: 'vh-1' }),
    });
  });

  await page.goto('/');
  await page.getByLabel('セリフ').fill('遅延テスト');
  await page.getByLabel('権利同意').check();
  await page.getByRole('button', { name: '生成' }).click();

  // 生成中ラベルに変わり、aria-busy/disabled が付く
  const genBtnBusy = page.getByRole('button', { name: '生成中…' });
  await expect(genBtnBusy).toBeVisible();
  await expect(genBtnBusy).toBeDisabled();
  await expect(genBtnBusy).toHaveAttribute('aria-busy', 'true');

  // 完了後は通常の「生成」に戻る（=非busy/有効化に戻る）
  await expect(page.getByRole('button', { name: '生成' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ダウンロード' })).toBeVisible();
});
