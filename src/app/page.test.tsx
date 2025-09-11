import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from './page';

// Helper to mock FileReader for data URL conversion
class MockFileReader {
  public onload: null | (() => void) = null;
  public onerror: null | (() => void) = null;
  public result: string | ArrayBuffer | null = null;
  readAsDataURL(_file: File) {
    // return small valid data URL
    this.result = 'data:image/png;base64,AAAA';
    if (this.onload) this.onload();
  }
}

describe('Page (APIキー手入力仕様)', () => {
  const originalFileReader = (global as any).FileReader;
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as any).FileReader = MockFileReader as any;
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ videoUrl: 'https://example.com/video.mp4' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response,
    ) as any;
    localStorage.clear();
  });

  afterEach(() => {
    (global as any).FileReader = originalFileReader;
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('APIキー入力欄が表示される', () => {
    render(<Page />);
    expect(screen.getByLabelText('APIキー')).toBeInTheDocument();
  });

  it('APIキー未入力のときは生成ボタンが無効', async () => {
    render(<Page />);

    const fileInput = screen.getByLabelText('画像') as HTMLInputElement;
    const textArea = screen.getByLabelText('どんな動画にしたいか（日本語）');
    const button = screen.getByRole('button', { name: '生成' });

    // 入力: ファイルとテキストのみ
    const file = new File([new Uint8Array([0x89])], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(textArea, { target: { value: '自己紹介して手を振る' } });

    // APIキーが空のため無効
    expect(button).toBeDisabled();
  });

  it('APIキーを入れると生成ボタンが有効になり、送信時にapiKeyが含まれる', async () => {
    render(<Page />);

    const fileInput = screen.getByLabelText('画像') as HTMLInputElement;
    const textArea = screen.getByLabelText('どんな動画にしたいか（日本語）');
    const apiKeyInput = screen.getByLabelText('APIキー');
    const button = screen.getByRole('button', { name: '生成' });

    const file = new File([new Uint8Array([0x89])], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(textArea, { target: { value: '自己紹介して手を振る' } });

    // 入力前は無効
    expect(button).toBeDisabled();

    // APIキー入力
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test-123' } });

    // 有効になる
    expect(button).not.toBeDisabled();

    // クリックでfetchがapiKeyを含む形で呼ばれる
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('/api/generate');
      const sent = JSON.parse(init.body);
      expect(sent.apiKey).toBe('sk-test-123');
      expect(sent.text).toBe('自己紹介して手を振る');
      expect(typeof sent.image).toBe('string');
    });
  });
});

