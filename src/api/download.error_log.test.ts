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
        // 失敗を発生させて 500 パスへ誘導
        download: vi.fn(async () => {
          throw new Error('dl_fail');
        }),
      },
    })),
  };
});

import * as log from '../lib/log';
import { issueDownloadToken } from '../lib/download';
import { getDownload } from './download';

describe('download: 失敗時に error ログを出力する', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('下位のdownloadが失敗して500のとき、logEvent("error", { where: "download", ... }) が呼ばれる', async () => {
    const spy = vi.spyOn(log, 'logApiError');

    const sid = 's-dl-errlog';
    const pageId = 'p-1';
    const handle = 'file-xyz';
    const token = issueDownloadToken({ sid, pageId, handle, ttlSec: 60 });
    const headers = new Headers({ Cookie: `sid=${sid}` });

    const res = await getDownload({ headers, query: { token } });
    expect(res.status).toBe(500);

    const calls = (spy as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const hasErrorLog = calls.some((c) => c[0] === 'download');
    expect(hasErrorLog).toBe(true);
  });
});
