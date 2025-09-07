import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';

describe('Vite dev entry mount', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mount() で Pictalk の見出しが描画される', async () => {
    const mod = await import('./main');
    expect(typeof mod.mount).toBe('function');
    const root = document.getElementById('root')!;
    mod.mount(root);
    // ページコンポーネントの h1 を確認（非同期待ち）
    expect(await screen.findByRole('heading', { name: 'Pictalk' })).toBeInTheDocument();
  });
});
