// biome-ignore assist/source/organizeImports: test imports need specific order for mocking
import { describe, it, expect, vi, beforeEach } from 'vitest';
import process from 'node:process';

vi.mock('../lib/kv', () => {
  return {
    getKey: vi.fn(async () => 'APIKEY-1'),
  };
});

vi.mock('../lib/genai', () => {
  return {
    DEFAULT_VEO_MODEL: 'veo-3.0-fast-generate-preview',
    makeClient: vi.fn(() => ({
      models: {
        generateVideos: vi.fn(async () => ({ operation: 'op-xyz' })),
      },
    })),
  };
});

import { issueCsrfToken } from '../lib/csrf';
import { makeClient } from '../lib/genai';
import { postGenerate } from './generate';

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/l9G2WQAAAABJRU5ErkJggg==';

describe('モデル切替とGenerateVideosConfigの適用', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });

  it('標準モデルを指定したら model: "veo-3.0-generate-preview" で呼び出す', async () => {
    const sid = 's-std';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'テスト',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
        model: 'veo-3.0-generate-preview',
      },
    });
    expect(res.status).toBe(200);
    const mk = makeClient as unknown as {
      mock: {
        results: { value: { models: { generateVideos: { mock: { calls: unknown[][] } } } } }[];
      };
    };
    const client0 = mk.mock.results.at(-1)?.value;
    const spy = client0?.models.generateVideos;
    const args = (spy?.mock.calls[0] as unknown[])[0] as {
      model: string;
      config: {
        aspectRatio?: string;
        durationSeconds?: number;
        fps?: number;
        generateAudio?: boolean;
        personGeneration?: string;
      };
    };
    expect(args.model).toBe('veo-3.0-generate-preview');
    // 主要項目の明示設定
    expect(args.config.aspectRatio).toBe('16:9');
    expect(args.config.durationSeconds).toBe(8);
    expect(args.config.fps).toBe(24);
    expect(args.config.generateAudio).toBe(true);
    expect(args.config.personGeneration).toBe('allow_adult');
  });

  it('アスペクト比 9:16 を指定したら config.aspectRatio が "9:16" になる', async () => {
    const sid = 's-portrait';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'テスト',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
        aspect: '9:16',
      } as unknown as Parameters<typeof postGenerate>[0]['body'],
    });
    expect(res.status).toBe(200);
    const mk = makeClient as unknown as {
      mock: {
        results: { value: { models: { generateVideos: { mock: { calls: unknown[][] } } } } }[];
      };
    };
    const client0 = mk.mock.results.at(-1)?.value;
    const spy = client0?.models.generateVideos;
    const args = (spy?.mock.calls[0] as unknown[])[0] as {
      model: string;
      config: {
        aspectRatio?: string;
      };
    };
    expect(args.config.aspectRatio).toBe('9:16');
  });
});
