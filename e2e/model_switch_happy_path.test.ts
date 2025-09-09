import { test, expect } from '@playwright/test';

test('E2E: モデル切替（Fast/標準）のハッピーパス - Fastモデル', async ({ page }) => {
  // APIルートをモック
  await page.route('/api/key', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { ok: true } });
    }
  });

  await page.route('/api/generate', async (route) => {
    const requestBody = await route.request().postDataJSON();
    // Fastモデルが選択されていることを検証
    expect(requestBody.model).toBe('veo-3.0-fast-generate-preview');

    await route.fulfill({
      json: {
        ops: ['op123'],
        usedScript: ['テスト台本'],
      },
    });
  });

  await page.route('/api/op', async (route) => {
    const url = new URL(route.request().url());
    const opId = url.searchParams.get('id');
    expect(opId).toBe('op123');

    await route.fulfill({
      json: {
        done: true,
        video: 'video-handle-123',
      },
    });
  });

  await page.route('/api/download/issue', async (route) => {
    await route.fulfill({
      json: {
        token: 'test-token-123',
      },
    });
  });

  await page.route('/api/download', async (route) => {
    // MP4ファイルのモックレスポンス
    const mockVideoBuffer = Buffer.from('mock-video-data');
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="pictalk_test.mp4"',
      },
      body: mockVideoBuffer,
    });
  });

  await page.goto('/');

  // APIキー登録
  await page.click('button:has-text("APIキー")');
  await page.fill('input[type="password"]', 'test-api-key');
  await page.click('text=保存');
  await page.waitForSelector('text=APIキーを登録しました');
  await page.click('text=閉じる');

  // モデル選択でFastを選択（既定値のはず）
  const modelSelect = page.locator('select[name="model"]');
  await expect(modelSelect).toHaveValue('veo-3.0-fast-generate-preview');

  // 画像アップロード（テスト用のbase64データ）
  const testImageData =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await page.evaluate((imageData) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const dt = new DataTransfer();
    const file = new File([atob(imageData.split(',')[1])], 'test.png', { type: 'image/png' });
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, testImageData);

  // セリフ入力
  await page.fill('textarea[name="script"]', 'こんにちは、テストです。');

  // 同意チェック
  await page.check('input[name="consent"]');

  // 生成ボタンをクリック
  await page.click('button:has-text("生成")');

  // 生成完了まで待機
  await page.waitForSelector('text=生成完了', { timeout: 30000 });

  // ダウンロードボタンが表示されることを確認
  await expect(page.locator('button:has-text("ダウンロード")')).toBeVisible();
});

test('E2E: モデル切替（Fast/標準）のハッピーパス - 標準モデル', async ({ page }) => {
  // APIルートをモック
  await page.route('/api/key', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { ok: true } });
    }
  });

  await page.route('/api/generate', async (route) => {
    const requestBody = await route.request().postDataJSON();
    // 標準モデルが選択されていることを検証
    expect(requestBody.model).toBe('veo-3.0-generate-preview');

    await route.fulfill({
      json: {
        ops: ['op456'],
        usedScript: ['標準モデル台本'],
      },
    });
  });

  await page.route('/api/op', async (route) => {
    const url = new URL(route.request().url());
    const opId = url.searchParams.get('id');
    expect(opId).toBe('op456');

    await route.fulfill({
      json: {
        done: true,
        video: 'video-handle-456',
      },
    });
  });

  await page.route('/api/download/issue', async (route) => {
    await route.fulfill({
      json: {
        token: 'test-token-456',
      },
    });
  });

  await page.route('/api/download', async (route) => {
    // MP4ファイルのモックレスポンス
    const mockVideoBuffer = Buffer.from('mock-video-data-standard');
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="pictalk_standard.mp4"',
      },
      body: mockVideoBuffer,
    });
  });

  await page.goto('/');

  // APIキー登録
  await page.click('button:has-text("APIキー")');
  await page.fill('input[type="password"]', 'test-api-key-standard');
  await page.click('text=保存');
  await page.waitForSelector('text=APIキーを登録しました');
  await page.click('text=閉じる');

  // モデル選択で標準を選択
  await page.selectOption('select[name="model"]', 'veo-3.0-generate-preview');

  // 画像アップロード（テスト用のbase64データ）
  const testImageData =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await page.evaluate((imageData) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const dt = new DataTransfer();
    const file = new File([atob(imageData.split(',')[1])], 'test.png', { type: 'image/png' });
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, testImageData);

  // セリフ入力
  await page.fill('textarea[name="script"]', '標準品質でのテストセリフです。');

  // 同意チェック
  await page.check('input[name="consent"]');

  // 生成ボタンをクリック
  await page.click('button:has-text("生成")');

  // 生成完了まで待機
  await page.waitForSelector('text=生成完了', { timeout: 30000 });

  // ダウンロードボタンが表示されることを確認
  await expect(page.locator('button:has-text("ダウンロード")')).toBeVisible();
});
