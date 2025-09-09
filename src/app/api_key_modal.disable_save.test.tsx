import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('APIキー入力モーダル: 空入力時は保存ボタンをdisabledにする', () => {
  it('入力が空の間はdisabled、入力するとenabledになる', () => {
    render(<Page />);

    // モーダルを開く
    fireEvent.click(screen.getByRole('button', { name: '🔑 APIキー設定' }));

    const saveBtn = screen.getByRole('button', { name: '保存' });
    const input = screen.getByLabelText('🔑 APIキー');

    // 初期は空なので disabled
    expect(saveBtn).toBeDisabled();

    // 入力すると enabled
    fireEvent.change(input, { target: { value: 'sk-abc' } });
    expect(saveBtn).not.toBeDisabled();

    // 空白のみは無効扱い
    fireEvent.change(input, { target: { value: '   ' } });
    expect(saveBtn).toBeDisabled();
  });
});
