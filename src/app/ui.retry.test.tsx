import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('UI 自動再試行（1回）', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('最初の失敗後に1回だけ自動再試行し、2回目が成功ならエラーバナーは表示されない', async () => {
    const spy = vi
      .fn()
      // 1回目は失敗（ネットワークエラー想定）
      .mockRejectedValueOnce(new Error('boom'))
      // 2回目は成功
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    globalThis.fetch = spy as unknown as typeof fetch;

    render(<Page />);

    // 入力を満たしてボタンを有効化
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    const btn = screen.getByRole('button', { name: '生成' });
    fireEvent.click(btn);

    // 自動再試行により最終的に成功 → エラーバナーは出ない
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });

    // fetch は2回呼ばれる
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('2回とも失敗した場合はエラーバナーと「同じ設定で再生成」ボタンを表示', async () => {
    const spy = vi
      .fn()
      // 1回目: ネットワークエラー
      .mockRejectedValueOnce(new Error('boom'))
      // 2回目: HTTP 400
      .mockResolvedValueOnce({ ok: false, status: 400 } as Response);

    globalThis.fetch = spy as unknown as typeof fetch;

    render(<Page />);

    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '再試行テスト' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      // エラーバナー
      expect(screen.getByRole('alert')).toHaveTextContent(/エラー/);
      // 再生成ボタン
      expect(screen.getByRole('button', { name: '同じ設定で再生成' })).toBeInTheDocument();
    });
  });
});
