import { getSid } from '../lib/cookies';
import { verifyCsrfToken } from '../lib/csrf';
import { setTokenBlocked } from '../lib/dlblock';
import { verifyDownloadToken } from '../lib/download';

export type PostDownloadInvalidateInput = {
  headers: Headers;
  body: { token?: string; csrf?: string };
};

export type PostDownloadInvalidateOutput = {
  status: number;
  headers: Headers;
  body: { ok: true } | { error: string };
};

/**
 * ダウンロードトークンを失効させる（ページ離脱時など）。
 * 有効トークンであれば署名部(sig)をKVに記録して期限までブロックする。
 */
export async function postDownloadInvalidate({
  headers,
  body,
}: PostDownloadInvalidateInput): Promise<PostDownloadInvalidateOutput> {
  const resHeaders = new Headers();
  const sid = getSid(headers);
  if (!sid) return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };

  const csrf = typeof body.csrf === 'string' ? body.csrf : '';
  if (!verifyCsrfToken(sid, csrf)) {
    return { status: 400, headers: resHeaders, body: { error: 'invalid_csrf' } };
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) return { status: 400, headers: resHeaders, body: { error: 'invalid_input' } };

  // トークン検証（署名/期限）
  const ver = verifyDownloadToken(sid, token);
  if (!ver.ok) {
    // セキュリティ上の観点で詳細は返さず 200 とする（冪等）
    return { status: 200, headers: resHeaders, body: { ok: true } };
  }

  // 署名(sig) と 残TTL を算出
  const parts = token.split('.');
  const expMs = Number(parts[0]);
  const sig = parts.at(-1) || '';
  if (!Number.isFinite(expMs) || !sig) {
    return { status: 200, headers: resHeaders, body: { ok: true } };
  }
  const now = Date.now();
  const ttlMs = Math.max(0, expMs - now);
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
  try {
    await setTokenBlocked(sig, ttlSec);
  } catch {
    // KV障害時は 500
    return { status: 500, headers: resHeaders, body: { error: 'invalidate_error' } };
  }
  return { status: 200, headers: resHeaders, body: { ok: true } };
}
