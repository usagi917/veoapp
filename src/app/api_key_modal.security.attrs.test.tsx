import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('APIキー入力欄の追加セキュリティ属性', () => {
  it('autocomplete=off, autocapitalize=off が設定されている', () => {
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: '🔑 APIキー設定' }));

    const input = screen.getByLabelText('🔑 APIキー') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');
    // ReactはDOM属性に小文字で反映される
    expect(input.getAttribute('autocapitalize')).toBe('off');
  });
});
