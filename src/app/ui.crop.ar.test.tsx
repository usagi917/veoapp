import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import Page from './page';

describe('スマートクロップ（9:16）UI結線', () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch as typeof fetch;
  });

  it('単一顔のとき 9:16 選択で9:16クロップが行われ、メッセージを表示する', async () => {
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

    // アスペクト比: 9:16 を選択
    const aspect = screen.getByLabelText('アスペクト比');
    fireEvent.change(aspect, { target: { value: '9:16' } });

    // 入力を満たす
    fireEvent.change(screen.getByLabelText('セリフ'), { target: { value: 'テスト' } });
    fireEvent.click(screen.getByLabelText('権利同意'));

    // 生成
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    await waitFor(() => {
      // 1920x1280 に対する最大9:16は 720x1280
      expect(screen.getByText(/クロップ完了（9:16）/)).toBeInTheDocument();
      expect(screen.getByText(/720x1280/)).toBeInTheDocument();
    });
  });
});
