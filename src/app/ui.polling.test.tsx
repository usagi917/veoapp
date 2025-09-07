import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('ポーリング（10秒間隔、即時1回 + 間隔）', () => {
  const origFetch = globalThis.fetch;
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('生成後に /api/op をポーリングし、done:true で「生成完了」を表示する', async () => {
    let opCalls = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/generate')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ops: ['op-123'], usedScript: ['A'] }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/op')) {
        opCalls += 1;
        if (opCalls === 1) {
          return { ok: true, status: 200, json: async () => ({ done: false }) } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ done: true, handle: 'vh-1' }),
        } as unknown as Response;
      }
      throw new Error('unexpected fetch: ' + url);
    }) as unknown as typeof fetch;

    render(<Page />);
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    // 10秒進めて1回目のポーリング（done:false）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    // fetch呼び出しに /api/op が含まれる（1回以上）
    const calls1 = (globalThis.fetch as any).mock.calls.map((c: any[]) => String(c[0]));
    expect(calls1.filter((u: string) => u.startsWith('/api/op')).length).toBeGreaterThanOrEqual(1);

    // さらに10秒で2回目（done:true）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText(/生成完了/)).toBeInTheDocument();
  });
});
