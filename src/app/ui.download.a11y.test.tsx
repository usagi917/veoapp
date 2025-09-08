import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('ダウンロード開始メッセージのアクセシビリティ', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('ダウンロード開始の案内が role="status"（polite live region）で通知される', async () => {
    globalThis.fetch = vi.fn(async (input: unknown, init?: unknown) => {
      const url = String(input);
      if (url.startsWith('/api/generate')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ops: ['op-a11y'], usedScript: ['A'] }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/op')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ done: true, handle: 'vh-a11y' }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/download/issue')) {
        const i = init as { body?: unknown } | undefined;
        const body = JSON.parse(String(i?.body || '{}'));
        if (body && body.handle !== 'vh-a11y') throw new Error('bad handle');
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'tok-a11y' }),
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

    const dlBtn = await screen.findByRole('button', { name: 'ダウンロード' });
    fireEvent.click(dlBtn);

    await waitFor(() => {
      const statuses = screen.getAllByRole('status');
      expect(
        statuses.some((el) => (el.textContent || '').includes('ダウンロードを開始しました')),
      ).toBe(true);
    });
  });
});
