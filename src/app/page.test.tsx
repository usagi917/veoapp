import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Page from './page';

function mockFileReaderReturning(dataUrl: string) {
  class FR {
    public result: string | ArrayBuffer | null = null;
    public onload: null | (() => void) = null;
    public onerror: null | (() => void) = null;
    readAsDataURL(_file: File) {
      setTimeout(() => {
        this.result = dataUrl;
        this.onload && this.onload();
      }, 0);
    }
  }
  // @ts-ignore
  global.FileReader = FR as any;
}

describe('Page / 生成フロー', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // LocalStorageはJSDOMにあるが、クリアしておく
    localStorage.clear();
  });

  it('APIキー/画像/テキストが揃うまでボタンは無効', () => {
    render(<Page />);
    const btn = screen.getByRole('button', { name: '動画を生成' });
    expect(btn).toBeDisabled();
  });

  it('生成クリックで /api/generate に apiKey/image/text をPOSTし、成功時に動画が表示される', async () => {
    const user = userEvent.setup();
    render(<Page />);

    // FileReaderをモック（画像を data:URL へ変換した結果を返す）
    mockFileReaderReturning('data:image/png;base64,AAA=');

    // fetchをモック
    const fetchMock = vi.spyOn(window, 'fetch');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ videoUrl: 'blob:ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response,
    );

    // 入力
    await user.type(screen.getByLabelText('APIキー'), 'sk-test');

    const fileInput = screen.getByLabelText('画像', { selector: 'input[type="file"]' });
    const file = new File([new Uint8Array([1, 2, 3])], 'test.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    await user.type(screen.getByLabelText('動画の内容'), '自己紹介してください');

    const btn = screen.getByRole('button', { name: '動画を生成' });
    expect(btn).toBeEnabled();

    await user.click(btn);

    // fetch呼び出しの検証
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe('/api/generate');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body || '{}'));
    expect(body.apiKey).toBe('sk-test');
    expect(body.text).toContain('自己紹介');
    expect(String(body.image)).toMatch(/^data:image\//);

    // 成功で video がレンダリングされる
    expect(await screen.findByLabelText('生成された動画')).toBeInTheDocument();
  });
});

