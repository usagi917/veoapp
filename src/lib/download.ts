import crypto from 'node:crypto';
import process from 'node:process';
import { Buffer } from 'node:buffer';

const VERSION = 'v1';

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 8) throw new Error('SESSION_SECRET is not set or too short');
  return s;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(secret: string, msg: string): string {
  const h = crypto.createHmac('sha256', secret).update(msg).digest();
  return base64url(h);
}

export type IssueTokenArgs = {
  sid: string;
  pageId: string;
  handle: string;
  ttlSec: number; // トークン有効期限（秒）
};

/**
 * ダウンロード用の短寿命トークンを発行する。
 * フォーマット: `${expMs}.${pageId}.${handleB64}.${sig}`
 * 署名対象メッセージ: `v1:${sid}:${pageId}:${handleB64}:${expMs}`
 */
export function issueDownloadToken({ sid, pageId, handle, ttlSec }: IssueTokenArgs): string {
  if (!sid || !pageId || !handle) throw new Error('invalid args');
  if (!Number.isFinite(ttlSec) || ttlSec <= 0) throw new Error('ttlSec must be > 0');
  const secret = getSecret();
  const expMs = Date.now() + Math.floor(ttlSec * 1000);
  const handleB64 = base64url(Buffer.from(handle));
  const msg = `${VERSION}:${sid}:${pageId}:${handleB64}:${expMs}`;
  const sig = sign(secret, msg);
  return `${expMs}.${pageId}.${handleB64}.${sig}`;
}

export type VerifyResult =
  | { ok: true; handle: string; pageId: string }
  | { ok: false; reason: 'invalid' | 'expired' };

/**
 * トークン検証。sidと一致し、署名整合かつ期限内であればOK。
 */
export function verifyDownloadToken(sid: string, token: string): VerifyResult {
  try {
    if (!sid || !token) return { ok: false, reason: 'invalid' };
    const secret = getSecret();
    const parts = token.split('.');
    if (parts.length !== 4) return { ok: false, reason: 'invalid' };
    const [expStr, pageId, handleB64, sig] = parts;
    const expMs = Number(expStr);
    if (!Number.isFinite(expMs) || expMs <= 0) return { ok: false, reason: 'invalid' };
    const now = Date.now();
    if (now > expMs) return { ok: false, reason: 'expired' };
    const expected = sign(secret, `${VERSION}:${sid}:${pageId}:${handleB64}:${expMs}`);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return { ok: false, reason: 'invalid' };
    if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'invalid' };
    const handle = Buffer.from(handleB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    );
    return { ok: true, handle, pageId };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
