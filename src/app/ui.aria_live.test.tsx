import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('アクセシビリティ: 状態変化をスクリーンリーダーへ通知（aria-live/role=status）', () => {
  const origFetch = globalThis.fetch;
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('生成完了時、「生成完了」を role="status"（polite live region）で通知する', async () => {
    let opCalls = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/generate')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ops: ['op-aria'], usedScript: ['A'] }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/op')) {
        opCalls += 1;
        if (opCalls === 1) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ done: false }),
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ done: true, handle: 'vh-aria' }),
        } as unknown as Response;
      }
      throw new Error('unexpected fetch: ' + url);
    }) as unknown as typeof fetch;

    render(<Page />);
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    // 1回目のポーリング: done:false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    // 2回目のポーリング: done:true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('生成完了');
  });
});
