import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

// Page で画像検証/EXIF除去フローを呼ぶため、該当モジュールをモック
vi.mock('../lib/image', async (orig) => {
  // デフォルトは成功にしておき、各テストで上書き
  return {
    ...(await orig),
    validateImageFile: vi.fn(async (_file: File) => ({
      ok: true,
      meta: { mime: 'image/jpeg', sizeBytes: 100, width: 2000, height: 1500 },
    })),
    stripExifToPng: vi.fn(async (_file: File) => new Blob([], { type: 'image/png' })),
  };
});

import Page from './page';
import * as imageMod from '../lib/image';

function makeFile(name: string, type: string, sizeBytes: number) {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('画像アップロードの検証とEXIF除去フロー', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('非対応形式を選択すると「画像ファイル（JPG/PNG/WebP）を選択してください。」エラーを表示', async () => {
    vi.mocked(imageMod.validateImageFile).mockResolvedValueOnce({
      ok: false,
      reason: 'mime',
      message: '画像ファイル（JPG/PNG/WebP）を選択してください。',
    });

    render(<Page />);
    const input = screen.getByLabelText('画像アップロード');
    const bad = makeFile('doc.pdf', 'application/pdf', 1000);
    fireEvent.change(input, { target: { files: [bad] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '画像ファイル（JPG/PNG/WebP）を選択してください。',
      );
    });
  });

  it('10MB超過で「ファイルサイズが大きすぎます（最大10MB）」エラーを表示', async () => {
    vi.mocked(imageMod.validateImageFile).mockResolvedValueOnce({
      ok: false,
      reason: 'size',
      message: 'ファイルサイズが大きすぎます（最大10MB）。',
    });

    render(<Page />);
    const input = screen.getByLabelText('画像アップロード');
    const big = makeFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [big] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'ファイルサイズが大きすぎます（最大10MB）。',
      );
    });
  });

  it('短辺<1080pxで「画像の短辺が1080px以上必要です」エラーを表示', async () => {
    vi.mocked(imageMod.validateImageFile).mockResolvedValueOnce({
      ok: false,
      reason: 'resolution',
      message: '画像の短辺が1080px以上必要です。',
    });

    render(<Page />);
    const input = screen.getByLabelText('画像アップロード');
    const small = makeFile('small.png', 'image/png', 1000);
    fireEvent.change(input, { target: { files: [small] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('画像の短辺が1080px以上必要です。');
    });
  });

  it('検証OK時は stripExifToPng が呼ばれ、エラーは表示しない', async () => {
    vi.mocked(imageMod.validateImageFile).mockResolvedValueOnce({
      ok: true,
      meta: { mime: 'image/jpeg', sizeBytes: 1024, width: 1920, height: 1080 },
    });

    render(<Page />);
    const input = screen.getByLabelText('画像アップロード');
    const ok = makeFile('ok.jpg', 'image/jpeg', 5000);
    fireEvent.change(input, { target: { files: [ok] } });

    await waitFor(() => {
      expect(imageMod.stripExifToPng).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});
