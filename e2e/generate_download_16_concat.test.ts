import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

test('16秒: 2本DL→ffmpeg.wasmで結合→保存（モック）', async ({ page }) => {
  // ffmpeg.wasm をE2Eでモック（UIは globalThis.__mockFfmpegModule を参照）
  await page.addInitScript(() => {
    const store = new Map<string, Uint8Array>();
    (window as unknown as { __mockFfmpegModule?: unknown }).__mockFfmpegModule = {
      createFFmpeg: () => {
        return {
          async load() {},
          FS(op: 'writeFile' | 'readFile', path: string, data?: Uint8Array) {
            if (op === 'writeFile') store.set(path, data as Uint8Array);
            if (op === 'readFile') {
              const d = store.get(path);
              if (!d) throw new Error('ENOENT: ' + path);
              return d;
            }
          },
          async run(...args: string[]) {
            // copyモードのコマンドが来たときに出力を生成
            if (args.includes('-c') && args.includes('copy')) {
              store.set('pictalk_16s.mp4', new Uint8Array([9, 9, 9]));
            }
          },
        };
      },
    };
  });

  // APIモック
  await page.route('**/api/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ops: ['op-A', 'op-B'], usedScript: ['S1', 'S2'] }),
    });
  });
  await page.route('**/api/op**', async (route) => {
    const url = route.request().url();
    if (url.includes('op-A')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ done: true, handle: 'vh-A' }),
      });
    }
    if (url.includes('op-B')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ done: true, handle: 'vh-B' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ done: false }),
    });
  });
  await page.route('**/api/download/issue', async (route) => {
    const postData = route.request().postDataJSON() as { handle?: string };
    const token =
      postData?.handle === 'vh-A' ? 'tok-A' : postData?.handle === 'vh-B' ? 'tok-B' : 'tok-X';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token }),
    });
  });
  await page.route('**/api/download?token=tok-A', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'video/mp4' },
      body: Buffer.from([0x00]),
    });
  });
  await page.route('**/api/download?token=tok-B', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'video/mp4' },
      body: Buffer.from([0x01]),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Pictalk' })).toBeVisible();

  // 16秒を選択
  await page.getByLabel('16秒').check();
  await page.getByLabel('セリフ').fill('テスト台本 16s');
  await page.getByLabel('権利同意').check();
  await page.getByRole('button', { name: '生成' }).click();

  await page.getByRole('button', { name: 'ダウンロード' }).click();

  await expect(page.getByText('ダウンロードを開始しました')).toBeVisible();
});
