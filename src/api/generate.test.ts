import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックでキャプチャする変数
let capturedImageArg: unknown = null;

// @google/genai をモックし、generateVideos 呼び出し時の image 引数を検証できるようにする
vi.mock('@google/genai', () => {
  class GoogleGenAIMock {
    public models: any;
    public operations: any;
    constructor(_opts: { apiKey: string }) {
      this.models = {
        // 対象実装はまず generateVideos を試す
        generateVideos: async ({ image }: { image: unknown }) => {
          capturedImageArg = image;
          return { name: 'op-1' };
        },
      };
      this.operations = {
        get: async () => ({ done: true, response: { videoUri: 'https://cdn.test/video.mp4' } }),
      };
    }
  }
  return { GoogleGenAI: GoogleGenAIMock };
});

// テスト対象の読み込みはモック定義後
import { postGenerate } from './generate';

describe('postGenerate / 画像ペイロード形式', () => {
  beforeEach(() => {
    capturedImageArg = null;
  });

  it('data:URL 入力から bytesBase64Encoded と mimeType を含む image オブジェクトで呼び出す', async () => {
    const input = {
      headers: {},
      body: {
        apiKey: 'sk-test',
        image: 'data:image/png;base64,AAA=',
        text: '自己紹介してください',
      },
    };

    const out = await postGenerate(input);
    expect(out.status).toBe(200);
    expect(out.body?.videoUrl).toContain('https://');

    // image 引数の形式を検証
    expect(capturedImageArg).toEqual({ bytesBase64Encoded: 'AAA=', mimeType: 'image/png' });
  });
});

