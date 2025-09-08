import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// テスト対象（実装前は存在せずに失敗する想定）
import { useGenerateMutation, useOpQuery } from './queries';

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: 0 },
    },
  });
}

describe('React Query フック', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  describe('useGenerateMutation', () => {
    it('成功時に usedScript/ops を返し、pending→success の状態遷移を行う', async () => {
      globalThis.fetch = (async () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ ops: ['op-1'], usedScript: ['A'] }),
              } as unknown as Response),
            30,
          ),
        )) as unknown as typeof fetch;

      function Comp() {
        const { mutate, isPending, isSuccess, data } = useGenerateMutation();
        return (
          <div>
            <div data-testid="state">{isPending ? 'pending' : isSuccess ? 'success' : 'idle'}</div>
            <button
              onClick={() =>
                mutate({
                  image: 'data:image/png;base64,aGVsbG8=',
                  script: 'テスト',
                  voice: { gender: 'female', tone: 'normal' },
                  motion: 'neutral',
                  microPan: false,
                  lengthSec: 8,
                  consent: true,
                  csrf: 'test.csrf',
                })
              }
            >
              run
            </button>
            <div data-testid="data">{data ? JSON.stringify(data) : ''}</div>
          </div>
        );
      }

      const qc = createClient();
      render(
        <QueryClientProvider client={qc}>
          <Comp />
        </QueryClientProvider>,
      );

      fireEvent.click(screen.getByText('run'));

      // pending に遷移
      await waitFor(() => {
        expect(screen.getByTestId('state').textContent).toBe('pending');
      });

      // success に遷移し、dataを保持
      await waitFor(() => {
        expect(screen.getByTestId('state').textContent).toBe('success');
        expect(screen.getByTestId('data').textContent).toContain('op-1');
        expect(screen.getByTestId('data').textContent).toContain('A');
      });
    });

    it('401 のときはエラーになる（statusを持つErrorをthrow）', async () => {
      globalThis.fetch = (async () =>
        ({
          ok: false,
          status: 401,
          json: async () => ({ error: 'unauthorized' }),
        }) as unknown as Response) as unknown as typeof fetch;

      function Comp() {
        const { mutateAsync, isError, error } = useGenerateMutation();
        return (
          <div>
            <button
              onClick={async () => {
                try {
                  await mutateAsync({
                    image: 'data:image/png;base64,aGVsbG8=',
                    script: 'テスト',
                    voice: { gender: 'female', tone: 'normal' },
                    motion: 'neutral',
                    microPan: false,
                    lengthSec: 8,
                    consent: true,
                    csrf: 'test.csrf',
                  });
                } catch {
                  // noop
                }
              }}
            >
              run401
            </button>
            <div data-testid="err">
              {isError ? String((error as { status?: number } | undefined)?.status || 'err') : ''}
            </div>
          </div>
        );
      }

      const qc = createClient();
      render(
        <QueryClientProvider client={qc}>
          <Comp />
        </QueryClientProvider>,
      );

      fireEvent.click(screen.getByText('run401'));
      await waitFor(() => {
        expect(screen.getByTestId('err').textContent).toBe('401');
      });
    });
  });

  describe('useOpQuery', () => {
    it('refetchで done:false → done:true に更新される', async () => {
      let count = 0;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/op')) {
          count += 1;
          if (count === 1) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ done: false }),
            } as unknown as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ done: true, handle: 'vh-1' }),
          } as unknown as Response;
        }
        throw new Error('unexpected ' + url);
      }) as unknown as typeof fetch;

      function Comp() {
        const q = useOpQuery('op-1');
        return (
          <div>
            <div data-testid="status">{q.data?.done ? 'done' : 'pending'}</div>
            <button onClick={() => q.refetch()}>kick</button>
          </div>
        );
      }

      const qc = createClient();
      render(
        <QueryClientProvider client={qc}>
          <Comp />
        </QueryClientProvider>,
      );

      // 初回: done:false（pending）
      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('pending');
      });
      // 手動refetchで done:true
      fireEvent.click(screen.getByText('kick'));
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('done'));
    });
  });
});
