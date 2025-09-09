import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('APIキー入力モーダル: 閉じるとトリガーボタンへフォーカスを戻す', () => {
  it('「閉じる」押下後に「APIキー」ボタンへフォーカスが戻る', async () => {
    render(<Page />);
    const trigger = screen.getByRole('button', { name: '🔑 APIキー設定' });
    fireEvent.click(trigger);

    // モーダルが開いていることを確認
    expect(screen.getByRole('dialog', { name: 'APIキー登録' })).toBeInTheDocument();

    // 閉じる
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));

    // 非同期でフォーカスが戻るのを待つ
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
