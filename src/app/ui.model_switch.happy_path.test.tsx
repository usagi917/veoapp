import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('モデル切替のハッピーパス（UI統合テスト・モックSDK）', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('標準→Fast の順で切り替えて生成フローが通る（POST bodyのmodelが切り替わる）', async () => {
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
        // すぐに完了を返す（UIにダウンロードボタンが出るまでの時間を短縮）
        return {
          ok: true,
          status: 200,
          json: async () => ({ done: true, handle: 'vh-1' }),
        } as unknown as Response;
      }
      if (url.startsWith('/api/download/issue')) {
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

    // 標準モデルを選択
    fireEvent.change(screen.getByLabelText('品質'), {
      target: { value: 'veo-3.0-generate-preview' },
    });
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      const gen = calls.find((c) => c.url.startsWith('/api/generate'));
      const body = (gen?.body || {}) as { model?: string };
      expect(body.model).toBe('veo-3.0-generate-preview');
    });

    // ダウンロードボタンからDL案内が出る
    const dlBtn = await screen.findByRole('button', { name: 'ダウンロード' });
    fireEvent.click(dlBtn);
    await waitFor(() => {
      expect(screen.getByText('ダウンロードを開始しました')).toBeInTheDocument();
    });

    // 次に Fast に切り替えて再度実行
    fireEvent.change(screen.getByLabelText('品質'), {
      target: { value: 'veo-3.0-fast-generate-preview' },
    });
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      const lastGen = [...calls].reverse().find((c) => c.url.startsWith('/api/generate'));
      const body = (lastGen?.body || {}) as { model?: string };
      expect(body.model).toBe('veo-3.0-fast-generate-preview');
    });
  });
});
