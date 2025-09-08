import { test, expect } from '@playwright/test';

test('動きプリセット5種 × 微パンON/OFF のボディ送信を検証', async ({ page }) => {
  const bodies: Array<{ motion?: string; microPan?: boolean }> = [];

  await page.route('**/api/generate', async (route) => {
    const data = route.request().postDataJSON() as { motion?: string; microPan?: boolean };
    bodies.push(JSON.parse(JSON.stringify(data)));
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

  const script = page.getByLabel('セリフ');
  const consent = page.getByLabel('権利同意');
  const motionSel = page.getByLabel('動き');
  const microPan = page.getByLabel('微パン');

  await script.fill('台本');
  await consent.check();

  const motions: Array<'neutral' | 'smile' | 'energetic' | 'serene' | 'nod'> = [
    'neutral',
    'smile',
    'energetic',
    'serene',
    'nod',
  ];

  for (const m of motions) {
    // OFF
    await motionSel.selectOption(m);
    if (await microPan.isChecked()) await microPan.uncheck();
    await page.getByRole('button', { name: '生成' }).click();
    // ON
    await motionSel.selectOption(m);
    if (!(await microPan.isChecked())) await microPan.check();
    await page.getByRole('button', { name: '生成' }).click();
  }

  expect(bodies.length).toBe(10);
  // 送信された (motion, microPan) のペアを収集
  const got = bodies.map((b) => `${b.motion}:${!!b.microPan}`).sort();
  const exp = motions.flatMap((m) => [`${m}:false`, `${m}:true`]).sort();
  expect(got).toEqual(exp);
});
