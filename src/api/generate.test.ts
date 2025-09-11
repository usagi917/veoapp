import { describe, it, expect, vi } from 'vitest';

// モジュールモック: 新SDK(@google/genai) が GoogleGenAI をエクスポートする前提
vi.mock('@google/genai', () => {
  class GoogleGenAIMock {
    public models = {
      // 動画生成: Operation風のオブジェクトを返す
      generateVideos: async (_params: any) => ({ name: 'operations/op-123', done: false }),
    };
    public operations = {
      // 直ちに完了状態を返し、video.uri を含める
      getVideosOperation: async ({ operation }: any) => {
        return {
          name: operation?.name ?? 'operations/op-123',
          done: true,
          response: {
            generatedVideos: [
              {
                video: { uri: 'https://example.com/video.mp4', mimeType: 'video/mp4' },
              },
            ],
          },
        };
      },
    };
    public files = {};
    constructor(_opts: any) {}
  }
  return { GoogleGenAI: GoogleGenAIMock };
});

import { postGenerate } from './generate';

describe('postGenerate / generateVideoInBrowser', () => {
  it('GoogleGenAI (新SDK) を正しく認識し、video.uri を返す', async () => {
    const out = await postGenerate({
      body: {
        apiKey: 'sk-test',
        image: 'data:image/png;base64,AAA=',
        text: 'テスト',
      },
    });
    expect(out.status).toBe(200);
    expect(out.body?.videoUrl).toBe('https://example.com/video.mp4');
  });
});

