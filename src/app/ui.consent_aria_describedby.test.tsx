import { render, screen } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('権利同意チェックの説明文（aria-describedby）', () => {
  it('チェックボックスに説明文が関連付けられている', () => {
    render(<Page />);
    const checkbox = screen.getByLabelText('権利同意') as HTMLInputElement;
    // 説明文のテキストは既存の注意文
    const desc = screen.getByText(/自分\/権利保有のみ/);
    const descId = desc.getAttribute('id');
    expect(descId).toBeTruthy();
    expect(checkbox.getAttribute('aria-describedby')?.split(' ').includes(descId!)).toBe(true);
  });
});
