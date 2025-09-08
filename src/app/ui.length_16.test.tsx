import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('長さ=16秒の挙動', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('16秒を選ぶと POST ボディに lengthSec:16 が入る', async () => {
    const calls: Array<{ url: string; body?: unknown }> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: { body?: unknown }) => {
      const url = String(input);
      if (url.startsWith('/api/generate')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        calls.push({ url, body });
        return {
          ok: true,
          status: 200,
          json: async () => ({ ops: ['op-A', 'op-B'], usedScript: ['A1', 'A2'] }),
        } as unknown as Response;
      }
      // 本テストでは /api/op には触れない
      if (url.startsWith('/api/download')) {
        // 本テストではDLまでは行わない
        return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
      }
      throw new Error('unexpected fetch: ' + url);
    }) as unknown as typeof fetch;

    render(<Page />);

    // 長さ=16 を選ぶ
    fireEvent.click(screen.getByLabelText('16秒'));

    // 入力を満たす
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    // /api/generate の POST ボディに lengthSec:16 が含まれる
    await waitFor(() => {
      const gen = calls.find((c) => c.url.startsWith('/api/generate'));
      const body = (gen?.body || {}) as { lengthSec?: number };
      expect(body.lengthSec).toBe(16);
    });

    // usedScript の表示は別テストで検証するため、ここでは lengthSec のみを検証
  });
});
