// モデル別メトリクス（avg/p99/成功率）の最小検証
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
        generateVideos: vi.fn(async () => ({ operation: 'op-xyz' })),
      },
    })),
  };
});

import { issueCsrfToken } from '../lib/csrf';
import { enableMetrics, resetMetrics } from '../lib/metrics';
import { snapshotGenerateByModel } from '../lib/metrics';
import { makeClient } from '../lib/genai';
import { postGenerate } from './generate';

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/l9G2WQAAAABJRU5ErkJggg==';

describe('metrics by model: generate', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
    enableMetrics(true);
    resetMetrics();
  });
  afterEach(() => {
    enableMetrics(false);
  });

  it('Fastモデルの成功リクエストでモデル別集計に反映される（avg/p99）', async () => {
    const sid = 's-m-fast';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });

    // 所要時間を 10ms と 50ms に固定
    const base = Date.now();
    const spyNow = vi.spyOn(Date, 'now');
    spyNow.mockReturnValueOnce(base);
    spyNow.mockReturnValueOnce(base + 10);

    let res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'A',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
        model: 'veo-3.0-fast-generate-preview',
      },
    });
    expect(res.status).toBe(200);

    // 2回目（50ms）
    const base2 = base + 1000;
    spyNow.mockReturnValueOnce(base2);
    spyNow.mockReturnValueOnce(base2 + 50);
    res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'B',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
        model: 'veo-3.0-fast-generate-preview',
      },
    });
    expect(res.status).toBe(200);

    const snap = snapshotGenerateByModel();
    const fast = snap['veo-3.0-fast-generate-preview'];
    expect(fast).toBeTruthy();
    expect(fast.count).toBe(2);
    expect(fast.success).toBe(2);
    expect(fast.failure).toBe(0);
    expect(fast.avgMs).toBeGreaterThanOrEqual(0);
    // p99 は平均以上で単調（最低でも0以上）
    expect(fast.p99Ms).toBeGreaterThanOrEqual(fast.avgMs);
    expect(fast.p99Ms).toBeGreaterThanOrEqual(0);
  });

  it('標準モデルの失敗リクエストで failure が増える', async () => {
    const mk = makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void };
    // 2回ともリジェクトさせ、最終的に500
    mk.mockReturnValueOnce({ models: { generateVideos: vi.fn().mockRejectedValueOnce('x') } });
    mk.mockReturnValueOnce({ models: { generateVideos: vi.fn().mockRejectedValueOnce('y') } });

    const sid = 's-m-std';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'C',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
        model: 'veo-3.0-generate-preview',
      },
    });
    expect(res.status).toBe(500);
    const snap = snapshotGenerateByModel();
    const std = snap['veo-3.0-generate-preview'];
    expect(std).toBeTruthy();
    expect(std.count).toBe(1);
    expect(std.success).toBe(0);
    expect(std.failure).toBe(1);
  });
});
