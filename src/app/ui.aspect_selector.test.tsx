import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('アスペクト比セレクタ（16:9 / 9:16）', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('9:16 を選ぶと POST ボディに aspect: "9:16" が含まれる', async () => {
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

    // アスペクト比: 9:16 を選択
    const aspect = screen.getByLabelText('アスペクト比');
    fireEvent.change(aspect, { target: { value: '9:16' } });

    // 入力を満たす
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      const gen = calls.find((c) => c.url.startsWith('/api/generate'));
      const body = (gen?.body || {}) as { aspect?: string };
      expect(body.aspect).toBe('9:16');
    });
  });
});
