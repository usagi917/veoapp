import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Page from './page';

describe('APIキー登録モーダル: aria-labelledby による見出しへの関連付け', () => {
  it('role="dialog" 要素が aria-labelledby で h2 見出しを参照し、アクセシブルネームが維持される', () => {
    render(<Page />);

    // モーダルを開く
    const openBtn = screen.getByRole('button', { name: '🔑 APIキー設定' });
    fireEvent.click(openBtn);

    // アクセシブルネームは「🔐 APIキー登録」で取得できること
    const dialog = screen.getByRole('dialog', { name: '🔐 APIキー登録' });
    expect(dialog).toBeInTheDocument();

    // aria-labelledby が設定されており、そのIDの要素が h2 見出しであること
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const heading = labelledBy ? document.getElementById(labelledBy) : null;
    expect(heading).toBeTruthy();
    expect(heading?.tagName.toLowerCase()).toBe('h2');
    // 見出しのテキストは「🔐 APIキー登録」
    expect(heading).toHaveTextContent('🔐 APIキー登録');
  });
});
