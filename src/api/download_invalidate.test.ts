// biome-ignore assist/source/organizeImports: mock順序のため並び替え禁止
import { describe, it, expect, vi, beforeEach } from 'vitest';
import process from 'node:process';

vi.mock('../lib/dlblock', () => {
  const blocked = new Set<string>();
  return {
    setTokenBlocked: vi.fn(async (sig: string) => {
      blocked.add(sig);
    }),
    isTokenBlocked: vi.fn(async (sig: string) => blocked.has(sig)),
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
import { postDownloadInvalidate } from './download_invalidate';
import { getDownload } from './download';
import { issueCsrfToken } from '../lib/csrf';

function asErr(b: unknown): { error: string } {
  return b as { error: string };
}

describe('POST /api/download/invalidate', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });

  it('正常系: 失効通知後は同トークンで403になる', async () => {
    const sid = 's-inv-1';
    const pageId = 'p-1';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const token = issueDownloadToken({ sid, pageId, handle: 'file-xyz', ttlSec: 120 });

    const res1 = await getDownload({ headers, query: { token } });
    expect(res1.status).toBe(200);

    const inv = await postDownloadInvalidate({ headers, body: { token, csrf } });
    expect(inv.status).toBe(200);
    expect('ok' in inv.body && inv.body.ok).toBe(true);

    const res2 = await getDownload({ headers, query: { token } });
    expect(res2.status).toBe(403);
    expect(asErr(res2.body).error).toMatch(/forbidden/);
  });

  it('sid無しは401、CSRF不正は400、token空は400', async () => {
    const res1 = await postDownloadInvalidate({ headers: new Headers(), body: { token: 'x' } });
    expect(res1.status).toBe(401);

    const sid = 's-inv-2';
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res2 = await postDownloadInvalidate({ headers, body: { token: 'x', csrf: 'bad' } });
    expect(res2.status).toBe(400);

    const csrf = issueCsrfToken(sid);
    const res3 = await postDownloadInvalidate({ headers, body: { token: '', csrf } });
    expect(res3.status).toBe(400);
  });
});
