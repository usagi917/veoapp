import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('APIキー入力モーダル: 閉じるで入力値を消去', () => {
  it('一度入力して閉じる→再度開くと空になっている', () => {
    render(<Page />);

    // 開く
    fireEvent.click(screen.getByRole('button', { name: 'APIキー' }));
    const input = screen.getByLabelText('APIキー') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'G-should-be-cleared' } });
    expect(input.value).toBe('G-should-be-cleared');

    // 閉じる
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));

    // もう一度開く
    fireEvent.click(screen.getByRole('button', { name: 'APIキー' }));
    const input2 = screen.getByLabelText('APIキー') as HTMLInputElement;
    expect(input2.value).toBe('');
  });
});
