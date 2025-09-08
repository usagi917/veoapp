import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('APIキー入力欄のセキュリティ', () => {
  it('APIキー入力は type=password である', () => {
    render(<Page />);
    // 右上の「APIキー」ボタンを押してモーダルを開く
    fireEvent.click(screen.getByRole('button', { name: 'APIキー' }));

    const input = screen.getByLabelText('APIキー') as HTMLInputElement;
    // セキュリティ上、プレーンテキストではなく password 型であるべき
    expect(input.type).toBe('password');
  });
});
