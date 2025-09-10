import { describe, it, expect } from 'vitest';
import { getSid, setSid, clearSid } from './cookies';

describe('cookies', () => {
  it('setSid: HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age 指定でSet-Cookieを付与', () => {
    const headers = new Headers();
    setSid(headers, 'abc123', { ttlSec: 3600 });
    const setCookie = headers.get('Set-Cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('sid=abc123');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=3600');
  });

  it('getSid: Cookieヘッダからsidを取り出す', () => {
    const headers = new Headers({
      Cookie: 'foo=1; sid=xyz-789; bar=2',
    });
    expect(getSid(headers)).toBe('xyz-789');
  });

  it('getSid: 不正なエンコードでも落ちずにそのまま返す', () => {
    const headers = new Headers({ Cookie: 'sid=%E0%A4%A' });
    expect(getSid(headers)).toBe('%E0%A4%A');
  });

  it('getSid: sidが無い場合はundefined', () => {
    const headers = new Headers({ Cookie: 'foo=1; bar=2' });
    expect(getSid(headers)).toBeUndefined();
  });

  it('clearSid: Max-Age=0 で無効化するSet-Cookieを付与', () => {
    const headers = new Headers();
    clearSid(headers);
    const setCookie = headers.get('Set-Cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('sid=');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
  });
});
