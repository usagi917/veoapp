import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('生成ボタンのスピナーと無効化', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('生成クリック中はボタンがdisabledになり、ラベルが「生成中…」になる', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ ops: ['op-1'], usedScript: ['A'] }),
              } as unknown as Response),
            50,
          ),
        ),
    ) as unknown as typeof fetch;

    render(<Page />);

    // 入力を満たしてボタンを有効化
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    const btn = screen.getByRole('button', { name: '生成' });
    expect(btn).toBeEnabled();

    fireEvent.click(btn);

    // リクエスト中は disabled ＋ ラベルが「生成中…」相当
    await waitFor(() => {
      expect(btn).toBeDisabled();
      expect(btn.textContent).toMatch(/生成中/);
    });

    // レスポンスが返るとボタンは有効に戻る
    await waitFor(() => {
      expect(btn).toBeEnabled();
      expect(btn.textContent).toBe('生成');
    });

    // リクエスト完了後はラベルが戻り、かつ再度クリック可能
    await waitFor(() => {
      expect(btn).toBeEnabled();
      expect(btn.textContent).toBe('生成');
    });
  });
});
