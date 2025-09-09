// 無効なモデルID指定時のフォールバック挙動とメトリクス反映を検証
// 期待: generateVideos では DEFAULT_VEO_MODEL が使われ、
//       メトリクス（by model）も DEFAULT_VEO_MODEL のバケットに加算される。

// biome-ignore assist/source/organizeImports: モック順序固定
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        generateVideos: vi.fn(async () => ({ operation: 'op-ok' })),
      },
    })),
  };
});

import { issueCsrfToken } from '../lib/csrf';
import { enableMetrics, resetMetrics, snapshotGenerateByModel } from '../lib/metrics';
import { makeClient } from '../lib/genai';
import { postGenerate } from './generate';

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/l9G2WQAAAABJRU5ErkJggg==';

describe('invalid model → DEFAULT_VEO_MODEL へフォールバック + メトリクスも既定モデルで記録', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
    enableMetrics(true);
    resetMetrics();
  });

  afterEach(() => {
    enableMetrics(false);
  });

  it('未知の model を指定しても generateVideos には既定モデルが渡され、metrics も既定モデルに加算', async () => {
    const sid = 's-bad-model';
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
        model: 'unknown-model-xyz',
      },
    });
    expect(res.status).toBe(200);

    // generateVideos へ渡された model を検証
    const mk = makeClient as unknown as {
      mock: {
        results: { value: { models: { generateVideos: { mock: { calls: unknown[][] } } } } }[];
      };
    };
    const client0 = mk.mock.results.at(-1)?.value;
    const spy = client0?.models.generateVideos;
    const args = (spy?.mock.calls[0] as unknown[])[0] as { model: string };
    expect(args.model).toBe('veo-3.0-fast-generate-preview');

    // メトリクス（by model）に unknown ではなく既定モデルで集計される
    const snap = snapshotGenerateByModel();
    expect(snap['unknown-model-xyz']).toBeUndefined();
    expect(snap['veo-3.0-fast-generate-preview']).toBeTruthy();
    expect(snap['veo-3.0-fast-generate-preview'].count).toBe(1);
    expect(snap['veo-3.0-fast-generate-preview'].success).toBe(1);
  });
});
