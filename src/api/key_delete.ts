import { getSid, clearSid } from '../lib/cookies';
import { verifyCsrfToken } from '../lib/csrf';
import { delKey } from '../lib/kv';

export type DeleteKeyInput = {
  headers: Headers;
  body: { csrf?: string };
};

export type DeleteKeyOutput = {
  status: number;
  headers: Headers;
  body: { ok: true } | { error: string };
};

/**
 * BYOKの登録を解除するエンドポイント相当の関数。
 * - sid必須（未ログイン扱いは401）
 * - CSRF必須
 * - KV削除は冪等（存在しなくても200）
 * - sid Cookieはクリア
 */
export async function deleteKey({ headers, body }: DeleteKeyInput): Promise<DeleteKeyOutput> {
  const resHeaders = new Headers();

  const sid = getSid(headers);
  if (!sid) return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };

  const csrf = typeof body.csrf === 'string' ? body.csrf : '';
  if (!verifyCsrfToken(sid, csrf)) {
    return { status: 400, headers: resHeaders, body: { error: 'invalid_csrf' } };
  }

  try {
    await delKey(sid); // 存在しない場合でも false が返るだけ
  } catch {
    return { status: 500, headers: resHeaders, body: { error: 'kv_error' } };
  }

  // sid Cookie をクリア（Max-Age=0）
  clearSid(resHeaders);

  return { status: 200, headers: resHeaders, body: { ok: true } };
}
