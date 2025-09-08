import { test, expect } from '@playwright/test';

test('声の組合せ（男女×トーン3種）で /api/generate に期待のvoiceが送られる', async ({ page }) => {
  const bodies: Array<{ voice?: { gender?: string; tone?: string } }> = [];
  await page.route('**/api/generate', async (route) => {
    const data = route.request().postDataJSON() as { voice?: { gender?: string; tone?: string } };
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
  const genderSel = page.getByLabel('性別');
  const toneSel = page.getByLabel('トーン');

  // ベース入力
  await script.fill('台本');
  await consent.check();

  const combos: Array<[gender: 'female' | 'male', tone: 'slow' | 'normal' | 'energetic']> = [
    ['female', 'slow'],
    ['female', 'normal'],
    ['female', 'energetic'],
    ['male', 'slow'],
    ['male', 'normal'],
    ['male', 'energetic'],
  ];

  for (const [gender, tone] of combos) {
    await genderSel.selectOption(gender);
    await toneSel.selectOption(tone);
    await page.getByRole('button', { name: '生成' }).click();
    // 生成ボタンのクリックで /api/generate が呼ばれること（ダウンロードボタンが出れば一連完了）
    await page.getByRole('button', { name: 'ダウンロード' }).waitFor();
  }

  // 6回分呼ばれていること
  expect(bodies.length).toBe(6);

  // 送信された voice の組を検証
  const sent = bodies.map((b) => `${b.voice?.gender}:${b.voice?.tone}`).sort();
  const expected = combos.map(([g, t]) => `${g}:${t}`).sort();
  expect(sent).toEqual(expected);
});
