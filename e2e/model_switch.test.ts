import { test, expect } from '@playwright/test';

test('モデル切替（Fast→標準）で /api/generate の body.model が切り替わる', async ({ page }) => {
  const bodies: Array<{ model?: string }> = [];
  await page.route('**/api/generate', async (route) => {
    const body = route.request().postDataJSON() as { model?: string };
    bodies.push(JSON.parse(JSON.stringify(body)));
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

  // 入力を満たす
  await page.getByLabel('セリフ').fill('テスト台本');
  await page.getByLabel('権利同意').check();

  // 1回目: 既定（Fast）
  await page.getByRole('button', { name: '生成' }).click();
  await page.getByRole('button', { name: 'ダウンロード' }).waitFor();

  // 2回目: 標準モデルを選択して生成
  await page.getByLabel('品質').selectOption('veo-3.0-generate-preview');
  await page.getByRole('button', { name: '生成' }).click();
  await page.getByRole('button', { name: 'ダウンロード' }).waitFor();

  // 2回呼ばれていること
  expect(bodies.length).toBe(2);
  // Fast → 標準 の順で送られていること
  expect(bodies[0].model).toBe('veo-3.0-fast-generate-preview');
  expect(bodies[1].model).toBe('veo-3.0-generate-preview');
});
