import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('使用台本の表示', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('生成成功時、サーバーの usedScript を「使用台本」に表示する', async () => {
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ops: ['op1'], usedScript: ['これは要約された台本です。'] }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    render(<Page />);
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      const region = screen.getByRole('region', { name: '右パネル' });
      expect(region).toHaveTextContent('これは要約された台本です。');
    });
  });
});
