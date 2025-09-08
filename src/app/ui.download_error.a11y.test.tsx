import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('ダウンロード失敗メッセージのアクセシビリティ', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('ダウンロード失敗の案内が role="alert"（assertive）で通知される', async () => {
    globalThis.fetch = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.startsWith('/api/generate')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ops: ['op-err'], usedScript: ['A'] }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/op')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ done: true, handle: 'vh-err' }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/download/issue')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'tok-err' }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/download?token=')) {
        return {
          ok: false,
          status: 500,
          arrayBuffer: async () => new ArrayBuffer(0),
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

    // 生成
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    // ダウンロードボタン押下 → /api/download?token=... が 500
    const dlBtn = await screen.findByRole('button', { name: 'ダウンロード' });
    fireEvent.click(dlBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('ダウンロードに失敗しました');
    });
  });
});
