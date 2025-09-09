import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('モデル/品質セレクタ（Fast/標準）', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('標準モデルを選ぶと POST ボディに model: "veo-3.0-generate-preview" が含まれる', async () => {
    const calls: Array<{ url: string; body?: unknown }> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: { body?: unknown }) => {
      const url = String(input);
      if (url.startsWith('/api/generate')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        calls.push({ url, body });
        return {
          ok: true,
          status: 200,
          json: async () => ({ ops: ['op-1'], usedScript: ['A'] }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/op')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ done: false }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/download')) {
        return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
      }
      throw new Error('unexpected fetch: ' + url);
    }) as unknown as typeof fetch;

    render(<Page />);

    // モデル品質: 標準 を選択
    // ラベルは「品質」とする
    const quality = screen.getByLabelText('品質');
    fireEvent.change(quality, { target: { value: 'veo-3.0-generate-preview' } });

    // 入力を満たす
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      const gen = calls.find((c) => c.url.startsWith('/api/generate'));
      const body = (gen?.body || {}) as { model?: string };
      expect(body.model).toBe('veo-3.0-generate-preview');
    });
  });
});
