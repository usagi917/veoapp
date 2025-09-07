import crypto from 'node:crypto';
import { getSid, setSid } from '../lib/cookies';
import { verifyCsrfToken } from '../lib/csrf';
import { setKey } from '../lib/kv';
import { makeClient } from '../lib/genai';
import { z } from 'zod';
import { applyCsp } from '../lib/csp';

export type PostKeyInput = {
  headers: Headers;
  body: { apiKey?: string; csrf?: string };
};

export type PostKeyOutput = {
  status: number;
  headers: Headers;
  body: { ok: true } | { error: string };
};

function genSid(): string {
  return crypto.randomBytes(16).toString('hex');
}

const TTL_SEC = 60 * 60;

const BodySchema = z
  .object({
    apiKey: z.string().trim().min(1),
    csrf: z.string().min(1),
  })
  .strict();

export async function postKey({ headers, body }: PostKeyInput): Promise<PostKeyOutput> {
  const resHeaders = new Headers();
  applyCsp(resHeaders);
  // 入力チェック（zodで厳密）
  const parsed = BodySchema.safeParse(body as unknown);
  if (!parsed.success) {
    return { status: 400, headers: resHeaders, body: { error: 'invalid_input' } };
  }
  const { apiKey, csrf } = parsed.data;

  // sid取得 or 生成
  let sid = getSid(headers);
  if (!sid) sid = genSid();

  // CSRF 検証
  if (!verifyCsrfToken(sid, csrf)) {
    return { status: 400, headers: resHeaders, body: { error: 'invalid_csrf' } };
  }

  // 軽い疎通
  try {
    const client = makeClient(apiKey);
    await client.ping();
  } catch {
    return { status: 400, headers: resHeaders, body: { error: 'invalid_api_key' } };
  }

  // KV 保存
  try {
    await setKey(sid, apiKey, TTL_SEC);
  } catch {
    return { status: 500, headers: resHeaders, body: { error: 'kv_error' } };
  }

  // Cookie（TTL更新）
  setSid(resHeaders, sid, { ttlSec: TTL_SEC });

  return { status: 200, headers: resHeaders, body: { ok: true } };
}
