import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('BYOK未登録時の誘導', () => {
  it('生成APIが401のとき、エラーバナーにAPIキー案内を出し、APIキー登録モーダルを自動で開く', async () => {
    const oldFetch = globalThis.fetch;
    const res401 = new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
    // 自動再試行（2回）とも401にする
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(res401)
      .mockResolvedValueOnce(res401) as unknown as typeof fetch;

    try {
      render(<Page />);
      fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト台本' } });
      fireEvent.click(screen.getByLabelText('権利同意'));

      fireEvent.click(screen.getByRole('button', { name: '生成' }));

      await waitFor(() => {
        // エラーバナーにAPIキー案内が含まれる
        expect(screen.getByRole('alert')).toHaveTextContent(/APIキー/);
        // APIキー登録モーダルが開いている
        expect(screen.getByRole('dialog', { name: 'APIキー登録' })).toBeInTheDocument();
      });
    } finally {
      globalThis.fetch = oldFetch as unknown as typeof fetch;
    }
  });
});
