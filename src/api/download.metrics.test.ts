// メトリクス（ダウンロード）の最小検証
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import process from 'node:process';

vi.mock('../lib/dlblock', () => {
  return {
    isTokenBlocked: vi.fn(async () => false),
  };
});

vi.mock('../lib/kv', () => {
  return {
    getKey: vi.fn(async () => 'APIKEY-1'),
  };
});

vi.mock('../lib/genai', () => {
  return {
    makeClient: vi.fn(() => ({
      files: {
        download: vi.fn(async () => new Uint8Array([0x00])),
      },
    })),
  };
});

import { issueDownloadToken } from '../lib/download';
import { enableMetrics, resetMetrics, snapshotMetrics } from '../lib/metrics';
import { getDownload } from './download';

describe('metrics: download', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
    enableMetrics(true);
    resetMetrics();
  });
  afterEach(() => {
    enableMetrics(false);
  });

  it('成功時に download の count/success が増える', async () => {
    const sid = 's-mdl';
    const token = issueDownloadToken({ sid, pageId: 'p-1', handle: 'h-1', ttlSec: 60 });
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await getDownload({ headers, query: { token } });
    expect(res.status).toBe(200);
    const snap = snapshotMetrics();
    expect(snap.download.count).toBe(1);
    expect(snap.download.success).toBe(1);
    expect(snap.download.failure).toBe(0);
  });
});
