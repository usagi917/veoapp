import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('声（性別×トーン）と動きプリセットの結線', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('性別=男性、トーン=energetic、動き=smile を選ぶと POST ボディに反映', async () => {
    const spy = vi.fn(async (_url: string, init?: { body?: unknown }) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      expect(body.voice).toEqual({ gender: 'male', tone: 'energetic' });
      expect(body.motion).toBe('smile');
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });
    globalThis.fetch = spy as unknown as typeof fetch;

    render(<Page />);

    // 入力を満たす
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト台本' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    // セレクトを切り替える
    fireEvent.change(screen.getByLabelText('性別'), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText('トーン'), { target: { value: 'energetic' } });
    fireEvent.change(screen.getByLabelText('動き'), { target: { value: 'smile' } });

    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
});
