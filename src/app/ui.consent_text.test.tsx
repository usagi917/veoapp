import { render, screen } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('権利同意の注意文', () => {
  it('同意チェック付近に「自分/権利保有のみ」「未成年/有名人不可」の文言を表示する', () => {
    render(<Page />);
    // 文言の存在を確認
    expect(screen.getByText(/自分\/権利保有のみ/)).toBeInTheDocument();
    expect(screen.getByText(/未成年\/有名人不可/)).toBeInTheDocument();
  });
});
