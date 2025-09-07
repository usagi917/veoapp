import crypto from 'node:crypto';
import { getSid } from '../lib/cookies';
import { verifyCsrfToken } from '../lib/csrf';
import { getKey } from '../lib/kv';
import { issueDownloadToken } from '../lib/download';
import { z } from 'zod';
import { applyCsp } from '../lib/csp';

export type PostDownloadIssueInput = {
  headers: Headers;
  body: { handle?: string; csrf?: string };
};

export type PostDownloadIssueOutput = {
  status: number;
  headers: Headers;
  body: { token: string } | { error: string };
};

function genPageId(): string {
  return crypto.randomBytes(8).toString('hex');
}

const BodySchema = z
  .object({
    handle: z.string().trim().min(1),
    csrf: z.string().min(1),
  })
  .strict();

export async function postDownloadIssue({
  headers,
  body,
}: PostDownloadIssueInput): Promise<PostDownloadIssueOutput> {
  const resHeaders = new Headers();
  applyCsp(resHeaders);

  const sid = getSid(headers);
  if (!sid) return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };

  const parsed = BodySchema.safeParse(body as unknown);
  if (!parsed.success)
    return { status: 400, headers: resHeaders, body: { error: 'invalid_input' } };

  const { handle, csrf } = parsed.data;

  if (!verifyCsrfToken(sid, csrf))
    return { status: 400, headers: resHeaders, body: { error: 'invalid_csrf' } };

  // BYOK セッションがあることを確認
  const apiKey = await getKey(sid);
  if (!apiKey) return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };

  try {
    const token = issueDownloadToken({ sid, pageId: genPageId(), handle, ttlSec: 120 });
    return { status: 200, headers: resHeaders, body: { token } };
  } catch {
    return { status: 500, headers: resHeaders, body: { error: 'issue_error' } };
  }
}
