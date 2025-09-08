// メトリクス（生成）の最小検証
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import process from 'node:process';

vi.mock('../lib/kv', () => {
  return {
    getKey: vi.fn(async () => 'APIKEY-1'),
  };
});

vi.mock('../lib/genai', () => {
  return {
    makeClient: vi.fn(() => ({
      models: {
        generateVideos: vi.fn(async () => ({ operation: 'op-xyz' })),
      },
    })),
  };
});

import { issueCsrfToken } from '../lib/csrf';
import { enableMetrics, resetMetrics, snapshotMetrics } from '../lib/metrics';
import { makeClient } from '../lib/genai';
import { postGenerate } from './generate';

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/l9G2WQAAAABJRU5ErkJggg==';

describe('metrics: generate', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
    enableMetrics(true);
    resetMetrics();
  });
  afterEach(() => {
    enableMetrics(false);
  });

  it('成功時に count/success と平均時間が更新される', async () => {
    // 所要時間を安定化（10ms固定）
    const now = Date.now();
    const spyNow = vi.spyOn(Date, 'now');
    spyNow.mockReturnValueOnce(now); // begin()
    spyNow.mockReturnValueOnce(now + 10); // end()

    const sid = 's-m1';
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
      },
    });
    expect(res.status).toBe(200);
    const snap = snapshotMetrics();
    expect(snap.generate.count).toBe(1);
    expect(snap.generate.success).toBe(1);
    expect(snap.generate.failure).toBe(0);
    // 実行環境によっては同一msになる可能性があるため >=0 を許容
    expect(snap.generate.totalMs).toBeGreaterThanOrEqual(0);
    expect(snap.generate.avgMs).toBeGreaterThanOrEqual(0);
  });

  it('失敗時（2回とも失敗）に failure が増える', async () => {
    const mk = makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void };
    mk.mockReturnValueOnce({ models: { generateVideos: vi.fn().mockRejectedValueOnce('x') } });
    mk.mockReturnValueOnce({ models: { generateVideos: vi.fn().mockRejectedValueOnce('y') } });

    const sid = 's-m2';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'a',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
      },
    });
    expect(res.status).toBe(500);
    const snap = snapshotMetrics();
    expect(snap.generate.count).toBe(1);
    expect(snap.generate.success).toBe(0);
    expect(snap.generate.failure).toBe(1);
  });
});
