import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('UI バリデーション表示', () => {
  it('同意未チェック時は「権利同意が必要です。」の注意文を表示する', () => {
    render(<Page />);
    // 初期状態は未同意
    expect(screen.getByText('権利同意が必要です。')).toBeInTheDocument();

    // 同意を入れると消える
    const consent = screen.getByLabelText('権利同意');
    fireEvent.click(consent);
    expect(screen.queryByText('権利同意が必要です。')).not.toBeInTheDocument();
  });

  it('セリフ未入力時は「セリフを入力してください。」を表示し、入力すると消える', () => {
    render(<Page />);

    // 初期は空
    expect(screen.getByText('セリフを入力してください。')).toBeInTheDocument();

    // 入力で消える
    const script = screen.getByLabelText('セリフ');
    fireEvent.change(script, { target: { value: 'こんにちは、世界' } });
    expect(screen.queryByText('セリフを入力してください。')).not.toBeInTheDocument();
  });
});
