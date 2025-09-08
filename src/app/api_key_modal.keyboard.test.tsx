import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('APIキー登録モーダルのキーボード操作', () => {
  it('Escキーでモーダルを閉じ、フォーカスをトリガーへ戻す（入力はクリアされる）', async () => {
    render(<Page />);

    // モーダルを開く
    const openBtn = screen.getByRole('button', { name: 'APIキー' });
    fireEvent.click(openBtn);

    const dialog = screen.getByRole('dialog', { name: 'APIキー登録' });
    const input = screen.getByLabelText('APIキー');

    // 入力しておく（閉じる際にクリアされることを確認するため）
    fireEvent.change(input, { target: { value: 'sk-test-123' } });
    expect((input as HTMLInputElement).value).toBe('sk-test-123');

    // Esc キーで閉じる（フォーカスは開ボタンに戻る）
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'APIキー登録' })).not.toBeInTheDocument();
    await waitFor(() => expect(openBtn).toHaveFocus());

    // 再度開くと入力欄は空になっている
    fireEvent.click(openBtn);
    const input2 = screen.getByLabelText('APIキー') as HTMLInputElement;
    expect(input2.value).toBe('');
  });
});
