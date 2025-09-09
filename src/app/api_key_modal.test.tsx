import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('APIキー登録モーダル', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('ボタン→モーダル表示→保存成功メッセージ', async () => {
    const spy = vi.fn(async (_input: unknown, init?: unknown) => {
      // bodyの検査（apiKeyとcsrfが含まれること）
      const initObj = (init as { body?: string } | undefined) ?? {};
      const parsed = initObj.body ? JSON.parse(initObj.body) : {};
      expect(parsed.apiKey).toBe('G-xxxx');
      expect(typeof parsed.csrf).toBe('string');
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as unknown as Response;
    });
    globalThis.fetch = spy as unknown as typeof fetch;

    render(<Page />);

    // 右上の「APIキー」ボタン
    const openBtn = screen.getByRole('button', { name: '🔑 APIキー設定' });
    fireEvent.click(openBtn);

    // モーダルが開く
    const dialog = screen.getByRole('dialog', { name: 'APIキー登録' });
    expect(dialog).toBeInTheDocument();

    // 入力して保存
    fireEvent.change(screen.getByLabelText('🔑 APIキー'), { target: { value: 'G-xxxx' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByText(/APIキーを登録しました/)).toBeInTheDocument();
    });

    // fetch呼び出しが行われる
    expect(spy).toHaveBeenCalledWith('/api/key', expect.any(Object));
  });

  it('保存成功後、入力値はクリアされる（フロントでキーを保持しない）', async () => {
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: '🔑 APIキー設定' }));

    const input = screen.getByLabelText('🔑 APIキー') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'G-keep-no' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByText(/APIキーを登録しました/)).toBeInTheDocument();
    });

    // 入力値がクリアされている
    expect((screen.getByLabelText('🔑 APIキー') as HTMLInputElement).value).toBe('');
  });

  it('保存失敗でエラーメッセージを表示', async () => {
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_csrf' }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: '🔑 APIキー設定' }));
    fireEvent.change(screen.getByLabelText('🔑 APIキー'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByText(/APIキーの登録に失敗/)).toBeInTheDocument();
    });
  });
});
