import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SimplePage from './simple';

describe('SimplePage (APIキー手入力仕様)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ops: ['op_1'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response,
    ) as any;
    // /api/op はすぐdone
    (global.fetch as any).mockImplementationOnce(async () =>
      new Response(JSON.stringify({ ops: ['op_1'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response,
    ).mockImplementationOnce(async () =>
      new Response(JSON.stringify({ done: true, handle: 'h_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response,
    );
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('APIキー入力欄が表示される', () => {
    render(<SimplePage />);
    expect(screen.getByLabelText('APIキー')).toBeInTheDocument();
  });

  it('APIキー未入力のときは生成ボタンが無効', () => {
    render(<SimplePage />);
    const idea = screen.getByLabelText('イメージ');
    fireEvent.change(idea, { target: { value: 'こんにちは' } });
    const btn = screen.getByRole('button', { name: '生成' });
    expect(btn).toBeDisabled();
  });

  it('APIキーを入れると生成ボタンが有効になり、送信時にapiKeyが含まれる', async () => {
    render(<SimplePage />);
    const idea = screen.getByLabelText('イメージ');
    const keyInput = screen.getByLabelText('APIキー');
    const btn = screen.getByRole('button', { name: '生成' });

    fireEvent.change(idea, { target: { value: 'こんにちは' } });
    expect(btn).toBeDisabled();

    fireEvent.change(keyInput, { target: { value: 'sk-test-abc' } });
    expect(btn).not.toBeDisabled();

    fireEvent.click(btn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('/api/generate');
      const sent = JSON.parse(init.body);
      expect(sent.apiKey).toBe('sk-test-abc');
      expect(sent.script).toBe('こんにちは');
    });
  });
});

