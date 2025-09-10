export const SID_COOKIE = 'sid';

export type CookieSetOptions = {
  ttlSec?: number; // Max-Age 秒
  path?: string;
  domain?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
};

function buildCookie(k: string, v: string, opts: CookieSetOptions = {}): string {
  const { ttlSec = 60 * 60, path = '/', domain, sameSite = 'Lax', secure = true } = opts;

  const parts = [`${k}=${encodeURIComponent(v)}`];
  parts.push(`Path=${path}`);
  if (domain) parts.push(`Domain=${domain}`);
  parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  parts.push(`SameSite=${sameSite}`);
  if (ttlSec >= 0) parts.push(`Max-Age=${Math.floor(ttlSec)}`);
  return parts.join('; ');
}

function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const pairs = header.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const name = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    let decoded: string;
    try {
      decoded = decodeURIComponent(val);
    } catch {
      // 変なパーセントエンコードがあっても落ちないようにそのまま使う
      decoded = val;
    }
    out[name] = decoded;
  }
  return out;
}

export function getSid(headers: Headers): string | undefined {
  const cookie = headers.get('Cookie') ?? headers.get('cookie');
  const map = parseCookieHeader(cookie);
  return map[SID_COOKIE];
}

export function setSid(headers: Headers, sid: string, opts?: CookieSetOptions): void {
  headers.append('Set-Cookie', buildCookie(SID_COOKIE, sid, opts));
}

export function clearSid(headers: Headers, opts?: Omit<CookieSetOptions, 'ttlSec'>): void {
  const base: CookieSetOptions = { ...opts, ttlSec: 0 };
  headers.append('Set-Cookie', buildCookie(SID_COOKIE, '', base));
}
