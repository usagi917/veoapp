import { test, expect } from '@playwright/test';

test('生成APIが最初失敗→自動リトライで成功し、エラーUIは出ない', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/generate', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      // 初回は 503 で失敗させる
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    }
    // 2回目は成功
    return route.fulfill({
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
  await page.getByLabel('セリフ').fill('自動再試行テスト');
  await page.getByLabel('権利同意').check();
  await page.getByRole('button', { name: '生成' }).click();

  // 自動再試行の結果、DLボタンが表示される（=成功）
  await page.getByRole('button', { name: 'ダウンロード' }).waitFor();
  // エラーバナーは出ていない
  await expect(page.getByRole('alert')).toHaveCount(0);

  // 生成呼び出しは2回行われている
  expect(attempts).toBe(2);
});
