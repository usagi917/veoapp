// biome-ignore assist/source/organizeImports: モック順序のため並び替え禁止
import { describe, it, expect, vi, beforeEach } from 'vitest';
import process from 'node:process';

vi.mock('../lib/kv', () => {
  return {
    delKey: vi.fn(async () => true),
  };
});

import { issueCsrfToken } from '../lib/csrf';
import { delKey } from '../lib/kv';
import { deleteKey } from './key_delete';

function asErr(b: unknown): { error: string } {
  return b as { error: string };
}

describe('DELETE /api/key（BYOK解除）', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });

  it('正常系: CSRF→KV削除→sid Cookie クリアで200', async () => {
    const sid = 'sid-del-1';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });

    const res = await deleteKey({ headers, body: { csrf } });
    expect(res.status).toBe(200);
    expect('ok' in res.body && res.body.ok).toBe(true);

    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain('sid=');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
  });

  it('delKeyがfalseでも200（冪等）', async () => {
    (delKey as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(
      false,
    );
    const sid = 'sid-del-2';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });

    const res = await deleteKey({ headers, body: { csrf } });
    expect(res.status).toBe(200);
  });

  it('sid無しは401、CSRF不正は400', async () => {
    const res1 = await deleteKey({ headers: new Headers(), body: { csrf: 'x' } });
    expect(res1.status).toBe(401);

    const sid = 'sid-del-3';
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res2 = await deleteKey({ headers, body: { csrf: 'bad' } });
    expect(res2.status).toBe(400);
    expect(asErr(res2.body).error).toMatch(/invalid_csrf/);
  });

  it('KV障害は500', async () => {
    (delKey as unknown as { mockRejectedValueOnce: (e: unknown) => void }).mockRejectedValueOnce(
      new Error('kv down'),
    );
    const sid = 'sid-del-4';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await deleteKey({ headers, body: { csrf } });
    expect(res.status).toBe(500);
    expect(asErr(res.body).error).toMatch(/kv_error/);
  });

  it('CSPヘッダを付与する', async () => {
    const sid = 'sid-del-csp';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });

    const res = await deleteKey({ headers, body: { csrf } });
    expect(res.status).toBe(200);
    const csp = res.headers.get('Content-Security-Policy') || '';
    expect(csp).toContain("default-src 'self'");
    // キャッシュ無効化（no-store）
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
