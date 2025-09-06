import { describe, it, expect, vi, beforeEach } from 'vitest';

// kv と genai をモックする
vi.mock('../lib/kv', () => {
  return {
    getKey: vi.fn(async () => 'APIKEY-1'),
  };
});

vi.mock('../lib/genai', () => {
  return {
    makeClient: vi.fn(() => ({
      operations: {
        getVideosOperation: vi.fn(async () => ({
          done: false,
        })),
      },
    })),
  };
});

import { getKey } from '../lib/kv';
import { makeClient } from '../lib/genai';
import { getOp } from './op';

function asError(b: unknown): { error: string } {
  return b as { error: string };
}

describe('GET /api/op?id=...', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('done:false を返す（未完了）', async () => {
    const headers = new Headers({ Cookie: 'sid=s-1' });
    const res = await getOp({ headers, query: { id: 'op-123' } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ done: false });
  });

  it('done:true かつ videoハンドルがあるとき、handleを返す', async () => {
    // getVideosOperation の戻り値を上書き
    (makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void }).mockReturnValueOnce({
      operations: {
        getVideosOperation: vi.fn(async () => ({
          done: true,
          generatedVideos: [{ video: 'handle-xyz' }],
        })),
      },
    });

    const headers = new Headers({ Cookie: 'sid=s-1' });
    const res = await getOp({ headers, query: { id: 'op-999' } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ done: true, handle: 'handle-xyz' });
  });

  it('done:true だが videoハンドル欠落は 422', async () => {
    (makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void }).mockReturnValueOnce({
      operations: {
        getVideosOperation: vi.fn(async () => ({
          done: true,
          generatedVideos: [],
        })),
      },
    });

    const headers = new Headers({ Cookie: 'sid=s-1' });
    const res = await getOp({ headers, query: { id: 'op-1' } });
    expect(res.status).toBe(422);
    expect(asError(res.body).error).toMatch(/missing_video_handle/);
  });

  it('sid 未登録（KVにキー無し）は 401', async () => {
    (getKey as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(
      undefined,
    );
    const headers = new Headers({ Cookie: 'sid=s-unknown' });
    const res = await getOp({ headers, query: { id: 'op-2' } });
    expect(res.status).toBe(401);
    expect(asError(res.body).error).toMatch(/unauthorized/);
  });

  it('id が無い/不正は 400', async () => {
    const headers = new Headers({ Cookie: 'sid=s-1' });
    const res = await getOp({ headers, query: {} });
    expect(res.status).toBe(400);
    expect(asError(res.body).error).toMatch(/invalid_input/);
  });

  it('下位エラーは 500', async () => {
    (makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void }).mockReturnValueOnce({
      operations: {
        getVideosOperation: vi.fn(async () => {
          throw new Error('boom');
        }),
      },
    });
    const headers = new Headers({ Cookie: 'sid=s-1' });
    const res = await getOp({ headers, query: { id: 'op-err' } });
    expect(res.status).toBe(500);
    expect(asError(res.body).error).toMatch(/op_error/);
  });
});
