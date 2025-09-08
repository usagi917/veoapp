import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('スマートクロップ（16:9）UI結線', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('単一顔のときは生成時に16:9クロップが行われ、メッセージを表示する', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    globalThis.fetch = spy as unknown as typeof fetch;

    render(
      <Page
        __test_faces={{
          dims: { width: 1920, height: 1280 },
          bboxes: [{ x: 900, y: 600, width: 120, height: 120 }],
        }}
      />,
    );

    // 入力を満たす
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    // 生成
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      // 1920x1280 の画像に対する最大16:9は 1920x1080
      expect(screen.getByText(/クロップ完了（16:9）/)).toBeInTheDocument();
      expect(screen.getByText(/1920x1080/)).toBeInTheDocument();
    });
  });
});
