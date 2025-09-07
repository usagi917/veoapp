import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('ダウンロードフロー（UI最小結線）', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('生成完了後に「ダウンロード」ボタンが表示され、クリックで issue→download→案内表示→beforeunloadでinvalidate', async () => {
    globalThis.fetch = vi.fn(async (input: unknown, init?: unknown) => {
      const url = String(input);
      if (url.startsWith('/api/generate')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ops: ['op-xyz'], usedScript: ['A'] }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/op')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ done: true, handle: 'vh-1' }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/download/issue')) {
        // bodyにhandleが含まれている
        const i = init as { body?: unknown } | undefined;
        const body = JSON.parse(String(i?.body || '{}'));
        if (body && body.handle !== 'vh-1') throw new Error('bad handle');
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'tok-1' }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/download?token=')) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => new ArrayBuffer(1),
        } as unknown as Response;
      }
      if (url.startsWith('/api/download/invalidate')) {
        return { ok: true, status: 200, json: async () => ({ ok: true }) } as unknown as Response;
      }
      throw new Error('unexpected fetch: ' + url);
    }) as unknown as typeof fetch;

    render(<Page />);
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    // ダウンロードボタンが表示されるまで待つ
    const dlBtn = await screen.findByRole('button', { name: 'ダウンロード' });
    expect(dlBtn).toBeInTheDocument();

    fireEvent.click(dlBtn);

    // 案内表示
    await waitFor(() => {
      expect(screen.getByText('ダウンロードを開始しました')).toBeInTheDocument();
    });

    // beforeunload で invalidate が呼ばれる
    window.dispatchEvent(new window.Event('beforeunload'));
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const urls = calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.startsWith('/api/download/invalidate'))).toBe(true);
  });
});
