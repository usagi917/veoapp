import { getSid } from '../lib/cookies';
import { getKey } from '../lib/kv';
import { makeClient } from '../lib/genai';
import { verifyDownloadToken } from '../lib/download';
import { isTokenBlocked } from '../lib/dlblock';
import { applyCsp } from '../lib/csp';
import { begin as beginMetrics } from '../lib/metrics';

export type GetDownloadInput = {
  headers: Headers;
  query: { token?: string };
};

export type GetDownloadOutput = {
  status: number;
  headers: Headers;
  body: Uint8Array | { error: string };
};

function formatFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const HH = pad(now.getHours());
  const MM = pad(now.getMinutes());
  const SS = pad(now.getSeconds());
  return `pictalk_${yyyy}${mm}${dd}_${HH}${MM}${SS}.mp4`;
}

export async function getDownload({
  headers,
  query,
}: GetDownloadInput): Promise<GetDownloadOutput> {
  const resHeaders = new Headers();
  applyCsp(resHeaders);
  const endMetrics = beginMetrics('download').end;
  const sid = getSid(headers);
  if (!sid) {
    endMetrics(false);
    return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };
  }

  const token = typeof query.token === 'string' ? query.token.trim() : '';
  const ver = verifyDownloadToken(sid, token);
  if (!ver.ok) {
    endMetrics(false);
    return { status: 403, headers: resHeaders, body: { error: 'forbidden' } };
  }

  // 失効済みチェック（beforeunload等で失効通知されたトークンは拒否）
  try {
    const parts = token.split('.');
    const sig = parts.at(-1) || '';
    if (!sig) {
      endMetrics(false);
      return { status: 403, headers: resHeaders, body: { error: 'forbidden' } };
    }
    if (await isTokenBlocked(sig)) {
      endMetrics(false);
      return { status: 403, headers: resHeaders, body: { error: 'forbidden' } };
    }
  } catch {
    endMetrics(false);
    return { status: 403, headers: resHeaders, body: { error: 'forbidden' } };
  }

  const apiKey = await getKey(sid);
  if (!apiKey) {
    endMetrics(false);
    return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };
  }

  try {
    const client = makeClient(apiKey) as unknown as {
      files: { download: (args: { file: string }) => Promise<Uint8Array> };
    };
    const data = await client.files.download({ file: ver.handle });

    resHeaders.set('Cache-Control', 'no-store');
    resHeaders.set('Content-Type', 'video/mp4');
    resHeaders.set('Content-Disposition', `attachment; filename="${formatFileName()}"`);
    endMetrics(true);
    return { status: 200, headers: resHeaders, body: data };
  } catch (err) {
    // 失敗時は最小のエラーログを記録（PIIレス）
    try {
      const { logApiError } = await import('../lib/log');
      logApiError('download', err, { handle: ver.handle });
    } catch {
      // ignore logging errors
    }
    endMetrics(false);
    return { status: 500, headers: resHeaders, body: { error: 'download_error' } };
  }
}
