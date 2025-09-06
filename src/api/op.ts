import { getSid } from '../lib/cookies';
import { getKey } from '../lib/kv';
import { makeClient } from '../lib/genai';

export type GetOpInput = {
  headers: Headers;
  query: { id?: string };
};

export type GetOpOutput = {
  status: number;
  headers: Headers;
  body: { done: false } | { done: true; handle: string } | { error: string };
};

export async function getOp({ headers, query }: GetOpInput): Promise<GetOpOutput> {
  const resHeaders = new Headers();
  const id = typeof query.id === 'string' ? query.id.trim() : '';
  if (!id) return { status: 400, headers: resHeaders, body: { error: 'invalid_input' } };

  const sid = getSid(headers);
  if (!sid) return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };

  // KVからAPIキーを取得
  const apiKey = await getKey(sid);
  if (!apiKey) return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };

  try {
    const client = makeClient(apiKey);
    const op: unknown = await client.operations.getVideosOperation({ operation: id });
    const o = op as { done?: boolean; generatedVideos?: { video?: string }[] };
    if (!o?.done) return { status: 200, headers: resHeaders, body: { done: false } };

    const handle = o.generatedVideos?.[0]?.video;
    if (!handle)
      return { status: 422, headers: resHeaders, body: { error: 'missing_video_handle' } };
    return { status: 200, headers: resHeaders, body: { done: true, handle } };
  } catch {
    return { status: 500, headers: resHeaders, body: { error: 'op_error' } };
  }
}
