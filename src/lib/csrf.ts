import crypto from 'node:crypto';
import process from 'node:process';
import { Buffer } from 'node:buffer';

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15分
const VERSION = 'v1';

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 8) {
    throw new Error('SESSION_SECRET is not set or too short');
  }
  return s;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(secret: string, sid: string, ts: number): string {
  const msg = `${VERSION}:${sid}:${ts}`;
  const h = crypto.createHmac('sha256', secret).update(msg).digest();
  return base64url(h);
}

/**
 * CSRFトークンを発行する。sidに紐づくHMAC署名で、フォーマットは `${ts}.${sig}`。
 */
export function issueCsrfToken(sessionId: string): string {
  if (!sessionId) throw new Error('sessionId is required');
  const secret = getSecret();
  const ts = Date.now();
  const sig = sign(secret, sessionId, ts);
  return `${ts}.${sig}`;
}

/**
 * CSRFトークンを検証する。sidが一致し、署名整合かつTTL内であればtrue。
 */
export function verifyCsrfToken(sessionId: string, token: string): boolean {
  try {
    if (!sessionId || !token) return false;
    const secret = getSecret();
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const ts = Number(parts[0]);
    const sig = parts[1];
    if (!Number.isFinite(ts) || ts <= 0 || typeof sig !== 'string' || sig.length === 0)
      return false;

    const now = Date.now();
    if (ts > now) return false; // 未来日付は無効
    if (now - ts > DEFAULT_TTL_MS) return false; // 期限切れ

    const expected = sign(secret, sessionId, ts);
    // timing-safe compare
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
