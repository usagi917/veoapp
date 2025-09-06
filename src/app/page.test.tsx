import { render, screen } from '@testing-library/react';
import React from 'react';

// 実装前提のページをインポート（TDDで先にテストを書く）
import Page from './page';

describe('Page', () => {
  it('h1に Pictalk を表示する', () => {
    render(<Page />);
    // h1ロールで、文言が完全一致する要素を探す
    const heading = screen.getByRole('heading', { level: 1, name: 'Pictalk' });
    expect(heading).toBeInTheDocument();
  });
});
