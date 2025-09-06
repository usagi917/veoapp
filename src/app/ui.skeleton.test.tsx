import { render, screen, within } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('UIスケルトン（フォーム & 状態）', () => {
  it('左パネルの入力群と右パネルの進行/使用台本が表示される', () => {
    render(<Page />);

    // 左パネルのフォーム要素
    expect(screen.getByLabelText('画像アップロード')).toBeInTheDocument();
    expect(screen.getByLabelText('セリフ')).toBeInTheDocument();
    expect(screen.getByLabelText('性別')).toBeInTheDocument();
    expect(screen.getByLabelText('トーン')).toBeInTheDocument();
    expect(screen.getByLabelText('動き')).toBeInTheDocument();
    expect(screen.getByLabelText('微パン')).toBeInTheDocument();
    expect(screen.getByLabelText('8秒')).toBeInTheDocument();
    expect(screen.getByLabelText('16秒')).toBeInTheDocument();
    expect(screen.getByLabelText('権利同意')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成' })).toBeInTheDocument();

    // 右パネルの進行表示と使用台本（スコープ内で検証）
    const right = screen.getByRole('region', { name: '右パネル' });
    expect(right).toBeInTheDocument();
    expect(within(right).getByText('待機')).toBeInTheDocument();
    expect(within(right).getByText('生成')).toBeInTheDocument();
    expect(within(right).getByText('最終化')).toBeInTheDocument();
    expect(within(right).getByText('使用台本')).toBeInTheDocument();
  });
});
