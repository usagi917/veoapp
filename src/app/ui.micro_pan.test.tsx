import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('微パンフラグの結線（UI→APIボディ）', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('チェックONで microPan: true がPOSTボディに含まれる', async () => {
    const spy = vi.fn(async (_url: string, init?: { body?: unknown }) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      expect(body.microPan).toBe(true);
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });
    globalThis.fetch = spy as unknown as typeof fetch;

    render(<Page />);

    // 入力を満たす
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));
    fireEvent.click(screen.getByLabelText('微パン'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });

  it('チェックOFFのときは microPan が未定義（またはfalse）で送られる', async () => {
    const spy = vi.fn(async (_url: string, init?: { body?: unknown }) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      // 実装上は未定義でOK（API側はoptional）。falseでも可。
      expect(body.microPan === undefined || body.microPan === false).toBe(true);
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });
    globalThis.fetch = spy as unknown as typeof fetch;

    render(<Page />);

    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));
    // 微パンは触らずOFFのまま

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
});
