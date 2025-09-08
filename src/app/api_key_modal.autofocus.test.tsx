import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('APIキー入力モーダル: 開いたら入力に自動フォーカス', () => {
  it('モーダルを開くと APIキー 入力がフォーカスされる', async () => {
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: 'APIキー' }));
    const input = screen.getByLabelText('APIキー') as HTMLInputElement;
    await waitFor(() => expect(input).toHaveFocus());
  });
});
