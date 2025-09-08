import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

// ffmpeg.wasm をテスト用にモック
type MockFfmpegModule = {
  createFFmpeg: () => import('../lib/concat').FFmpegLike & { load: () => Promise<void> };
};

describe('16秒（8秒×2本）ダウンロード時の結合挙動', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    // 簡易なメモリFS
    const store = new Map<string, Uint8Array>();
    (globalThis as unknown as { __mockFfmpegModule?: MockFfmpegModule }).__mockFfmpegModule = {
      createFFmpeg: () => {
        return {
          async load() {},
          FS: (op, path, data) => {
            if (op === 'writeFile') store.set(path, data as Uint8Array);
            if (op === 'readFile') {
              const d = store.get(path);
              if (!d) throw new Error('ENOENT: ' + path);
              return d;
            }
          },
          run: vi.fn(async (...args: string[]) => {
            // copyモード時に出力を生成
            if (args.includes('-c') && args.includes('copy')) {
              store.set('pictalk_16s.mp4', new Uint8Array([7, 7, 7]));
            }
          }),
        } as import('../lib/concat').FFmpegLike & { load: () => Promise<void> };
      },
    };
  });

  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
    delete (globalThis as unknown as { __mockFfmpegModule?: MockFfmpegModule }).__mockFfmpegModule;
  });

  it('2本を download→結合し、両トークンが失効対象に登録される', async () => {
    const spy = vi.fn(async (input: RequestInfo | URL, init?: { body?: unknown }) => {
      const url = String(input);
      // 生成
      if (url.startsWith('/api/generate')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ops: ['op-A', 'op-B'], usedScript: ['S1', 'S2'] }),
        } as unknown as Response;
      }
      // ポーリング（即時完了）
      if (url.startsWith('/api/op')) {
        if (url.includes('op-A'))
          return {
            ok: true,
            status: 200,
            json: async () => ({ done: true, handle: 'vh-A' }),
          } as unknown as Response;
        if (url.includes('op-B'))
          return {
            ok: true,
            status: 200,
            json: async () => ({ done: true, handle: 'vh-B' }),
          } as unknown as Response;
      }
      // トークン発行
      if (url.startsWith('/api/download/issue')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const handle = body.handle as string;
        const token = handle === 'vh-A' ? 'tok-A' : handle === 'vh-B' ? 'tok-B' : 'tok-X';
        return { ok: true, status: 200, json: async () => ({ token }) } as unknown as Response;
      }
      // ダウンロード（バイト列を返す）
      if (url.startsWith('/api/download?token=')) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array([1]).buffer,
        } as unknown as Response;
      }
      if (url.startsWith('/api/download/invalidate')) {
        return { ok: true, status: 200, json: async () => ({ ok: true }) } as unknown as Response;
      }
      throw new Error('unexpected fetch: ' + url);
    }) as unknown as typeof fetch;
    globalThis.fetch = spy;

    render(<Page />);

    // 16秒を選択
    fireEvent.click(screen.getByLabelText('16秒'));
    // 入力
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本16秒' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    // ダウンロードボタンが表示されるまで待つ
    const dlBtn = await screen.findByRole('button', { name: 'ダウンロード' });
    expect(dlBtn).toBeInTheDocument();

    fireEvent.click(dlBtn);

    await waitFor(() => {
      expect(screen.getByText('ダウンロードを開始しました')).toBeInTheDocument();
    });

    // 2つ分のダウンロードが行われている
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const urls = calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.startsWith('/api/download?token='))).toHaveLength(2);

    // beforeunloadで両トークンを失効（API呼び出し有無だけ検証）
    window.dispatchEvent(new window.Event('beforeunload'));
    const calls2 = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const urls2 = calls2.map((c) => String(c[0]));
    const invalidateUrls = urls2.filter((u) => u.startsWith('/api/download/invalidate'));
    expect(invalidateUrls.length).toBeGreaterThanOrEqual(1);
  });
});
