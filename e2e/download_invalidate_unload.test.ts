import { test, expect } from '@playwright/test';

test('ページ離脱（beforeunload）でダウンロードトークンを無効化する', async ({ page }) => {
  // 先に invalidate をフックして呼び出しを検証
  const invalidateBodies: Array<unknown> = [];
  await page.route('**/api/download/invalidate', async (route) => {
    invalidateBodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route('**/api/generate', async (route) => {
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
  await page.route('**/api/download/issue', async (route) => {
    const postData = route.request().postDataJSON() as { handle?: string };
    if (postData?.handle !== 'vh-1') {
      return route.fulfill({ status: 400, contentType: 'application/json', body: '{}' });
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'tok-1' }),
    });
  });
  await page.route('**/api/download?token=tok-1', async (route) => {
    await route.fulfill({ status: 200, headers: { 'content-type': 'video/mp4' }, body: '' });
  });

  await page.goto('/');
  await page.getByLabel('セリフ').fill('テスト台本');
  await page.getByLabel('権利同意').check();
  await page.getByRole('button', { name: '生成' }).click();
  await page.getByRole('button', { name: 'ダウンロード' }).click();
  await expect(page.getByText('ダウンロードを開始しました')).toBeVisible();

  // beforeunload を明示的に発火（ハンドラで invalidate が呼ばれる想定）
  await page.evaluate(() => window.dispatchEvent(new window.Event('beforeunload')));

  expect(invalidateBodies.length).toBeGreaterThanOrEqual(1);
  const last = (invalidateBodies.at(-1) || {}) as { token?: string };
  expect(last.token).toBe('tok-1');
});
