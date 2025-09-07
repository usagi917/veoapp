import { describe, it, expect, beforeEach, vi } from 'vitest';
import process from 'node:process';
import { postDownloadIssue } from './download_issue';
import { verifyDownloadToken } from '../lib/download';
import { issueCsrfToken } from '../lib/csrf';

vi.mock('../lib/kv', () => {
  return {
    getKey: vi.fn(async () => 'APIKEY-1'),
  };
});

describe('POST /api/download/issue', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });

  it('正常系: sid+CSRF+BYOKで有効なtokenを発行し、CSPヘッダを付与', async () => {
    const sid = 's-issue-1';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });

    const res = await postDownloadIssue({ headers, body: { handle: 'file-abc', csrf } });
    expect(res.status).toBe(200);
    const csp = res.headers.get('Content-Security-Policy') || '';
    expect(csp).toContain("default-src 'self'");

    const body = res.body as { token: string };
    expect(typeof body.token).toBe('string');
    const ver = verifyDownloadToken(sid, body.token);
    expect(ver.ok).toBe(true);
    if (ver.ok) {
      expect(ver.handle).toBe('file-abc');
      expect(ver.pageId.length).toBeGreaterThan(0);
    }
  });

  it('sid無しは401、CSRF不正は400、handle空は400、BYOK未登録は401', async () => {
    // sid 無し
    const r1 = await postDownloadIssue({
      headers: new Headers(),
      body: { handle: 'h', csrf: 'x' },
    });
    expect(r1.status).toBe(401);

    // CSRF 不正
    const sid = 's-issue-2';
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const r2 = await postDownloadIssue({ headers, body: { handle: 'h', csrf: 'bad' } });
    expect(r2.status).toBe(400);

    // handle 空
    const csrf = issueCsrfToken(sid);
    const r3 = await postDownloadIssue({ headers, body: { handle: '', csrf } });
    expect(r3.status).toBe(400);

    // BYOK 未登録
    const { getKey } = await import('../lib/kv');
    (getKey as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const r4 = await postDownloadIssue({ headers, body: { handle: 'h', csrf } });
    expect(r4.status).toBe(401);
  });

  it('余計なプロパティを含む入力は400（zod strict）', async () => {
    const sid = 's-issue-3';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await postDownloadIssue({
      headers,
      body: { handle: 'h', csrf, extra: 'x' } as unknown as { handle: string; csrf: string },
    });
    expect(res.status).toBe(400);
  });
});
