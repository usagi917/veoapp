import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('レート/外部エラーのUI案内', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('生成APIが429のとき「数分後に再試行」案内を表示', async () => {
    const res429 = new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(res429)
      .mockResolvedValueOnce(res429) as unknown as typeof fetch;

    render(<Page />);
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/数分後に再試行/);
    });
  });

  it('生成APIが503のときも「数分後に再試行」案内を表示', async () => {
    const res503 = new Response(JSON.stringify({ error: 'service_unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(res503)
      .mockResolvedValueOnce(res503) as unknown as typeof fetch;

    render(<Page />);
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: '台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/数分後に再試行/);
    });
  });
});
