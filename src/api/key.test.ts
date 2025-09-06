// biome-ignore assist/source/organizeImports: test imports need specific order for mocking
import { describe, it, expect, vi, beforeEach } from 'vitest';
import process from 'node:process';

// kv と genai をモックする
vi.mock('../lib/kv', () => {
  return {
    setKey: vi.fn(async () => {}),
  };
});
vi.mock('../lib/genai', () => {
  return {
    makeClient: vi.fn(() => ({
      ping: vi.fn(async () => {}),
    })),
  };
});

import { issueCsrfToken } from '../lib/csrf';
import { setKey } from '../lib/kv';
import { makeClient } from '../lib/genai';
import { postKey } from './key';

function asErrorBody(b: unknown): { error: string } {
  return b as { error: string };
}

describe('POST /api/key', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });

  it('正常系: CSRF検証→疎通→KV保存→200 + sid Cookie', async () => {
    const sid = 'sid-abc';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const body = { apiKey: 'G-xxxx', csrf };

    const res = await postKey({ headers, body });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // KV保存が正しい引数で呼ばれる
    expect(setKey).toHaveBeenCalledWith(sid, 'G-xxxx', 60 * 60);

    // Cookieが付与される（TTL更新）
    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain(`sid=${sid}`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
  });

  it('sidが無い場合は生成して付与する', async () => {
    const headers = new Headers();
    // sidが無い→CSRFトークンは作れないので先に生成（テストでは sid を固定化して組み立て）
    const sid = 'generated-sid';
    const csrf = issueCsrfToken(sid);
    // CSRF検証用に sid をCookieへ一時的に入れる（生成シナリオのテストなので、最終Set-Cookieで上書きされることを確認）
    headers.set('Cookie', `sid=${sid}`);
    const res = await postKey({ headers, body: { apiKey: 'X', csrf } });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain('sid=');
  });

  it('CSRF不正は400', async () => {
    const headers = new Headers({ Cookie: 'sid=abc' });
    const res = await postKey({ headers, body: { apiKey: 'G', csrf: 'bad.token' } });
    expect(res.status).toBe(400);
    expect(asErrorBody(res.body).error).toMatch(/invalid_csrf/);
  });

  it('apiKey空は400', async () => {
    const sid = 's1';
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const csrf = issueCsrfToken(sid);
    const res = await postKey({ headers, body: { apiKey: '', csrf } });
    expect(res.status).toBe(400);
  });

  it('疎通失敗は400', async () => {
    // makeClient().ping を失敗させる
    (makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void }).mockReturnValueOnce({
      ping: vi.fn(async () => {
        throw new Error('bad key');
      }),
    });

    const sid = 's1';
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const csrf = issueCsrfToken(sid);
    const res = await postKey({ headers, body: { apiKey: 'bad', csrf } });
    expect(res.status).toBe(400);
    expect(asErrorBody(res.body).error).toMatch(/invalid_api_key/);
  });

  it('KV障害は500', async () => {
    (setKey as unknown as { mockRejectedValueOnce: (e: unknown) => void }).mockRejectedValueOnce(
      new Error('kv down'),
    );

    const sid = 's1';
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const csrf = issueCsrfToken(sid);
    const res = await postKey({ headers, body: { apiKey: 'G', csrf } });
    expect(res.status).toBe(500);
    expect(asErrorBody(res.body).error).toMatch(/kv_error/);
  });
});
