import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

test('生成→DL ハッピーパス（モックルート）', async ({ page }) => {
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
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'video/mp4' },
      body: Buffer.from([0x00, 0x01, 0x02]),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Pictalk' })).toBeVisible();

  await page.getByLabel('セリフ').fill('テスト台本');
  await page.getByLabel('権利同意').check();
  await page.getByRole('button', { name: '生成' }).click();

  await page.getByRole('button', { name: 'ダウンロード' }).click();

  await expect(page.getByText('ダウンロードを開始しました')).toBeVisible();
});
