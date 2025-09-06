import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('UI エラーハンドリング', () => {
  it('APIエラー時にバナー(aria role=alert)を表示する', async () => {
    const oldFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;

    try {
      render(<Page />);
      // 入力を満たしてボタンを有効化
      fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト台本' } });
      fireEvent.click(screen.getByLabelText('権利同意'));

      const btn = screen.getByRole('button', { name: '生成' });
      expect(btn).toBeEnabled();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/エラー|失敗/);
      });
    } finally {
      globalThis.fetch = oldFetch as unknown as typeof fetch;
    }
  });
});
