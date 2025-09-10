// モデル別メトリクスに latencyMs / lastDurationSec / lastFps を記録する
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
import { postGenerate } from './generate';

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/l9G2WQAAAABJRU5ErkJggg==';

describe('metrics by model: latencyMs と lastDurationSec/lastFps', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
    enableMetrics(true);
    resetMetrics();
  });
  afterEach(() => {
    enableMetrics(false);
  });

  it('成功リクエストで latencyMs / lastDurationSec / lastFps が記録される', async () => {
    const sid = 's-lat-1';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });

    // 所要時間を 42ms に固定
    const base = Date.now();
    const spyNow = vi.spyOn(Date, 'now');
    spyNow.mockReturnValueOnce(base);
    spyNow.mockReturnValueOnce(base + 42);

    const res = await postGenerate({
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

    const snap = snapshotGenerateByModel();
    const fast = snap['veo-3.0-fast-generate-preview'];
    expect(fast).toBeTruthy();
    // 新規: latencyMs と lastDurationSec/lastFps
    expect(fast.latencyMs).toBeGreaterThanOrEqual(0);
    expect(fast.lastDurationSec).toBe(8);
    expect(fast.lastFps).toBe(24);
  });
});
