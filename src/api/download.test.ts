// biome-ignore assist/source/organizeImports: mock順序のため並び替え禁止
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import process from 'node:process';

vi.mock('../lib/kv', () => {
  return {
    getKey: vi.fn(async () => 'APIKEY-1'),
  };
});

vi.mock('../lib/genai', () => {
  return {
    makeClient: vi.fn(() => ({
      files: {
        download: vi.fn(async () => new Uint8Array([0x00, 0x01, 0x02])),
      },
    })),
  };
});

import { issueDownloadToken } from '../lib/download';
import { getKey } from '../lib/kv';
import { makeClient } from '../lib/genai';
import { getDownload } from './download';

function asErr(b: unknown): { error: string } {
  return b as { error: string };
}

describe('GET /api/download?token=...', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('正常系: 有効トークンでMP4を返し、no-storeとContent-Dispositionを付与', async () => {
    const sid = 's-dl-1';
    const pageId = 'p-1';
    const handle = 'file-xyz';
    const token = issueDownloadToken({ sid, pageId, handle, ttlSec: 120 });
    const headers = new Headers({ Cookie: `sid=${sid}` });

    const res = await getDownload({ headers, query: { token } });
    expect(res.status).toBe(200);
    // ヘッダ検証
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Content-Type')).toBe('video/mp4');
    const cd = res.headers.get('Content-Disposition') || '';
    expect(cd).toMatch(/^attachment; filename="pictalk_\d{8}_\d{6}\.mp4"$/);
    // ボディ（MP4バイト配列想定）
    expect(res.body instanceof Uint8Array).toBe(true);
    expect((res.body as Uint8Array).length).toBe(3);

    // makeClient の呼び出しを確認
    const mk = makeClient as unknown as {
      mock: { results: { value: { files: { download: { mock: { calls: unknown[][] } } } } }[] };
    };
    const client0 = mk.mock.results.at(-1)?.value;
    expect(client0?.files.download.mock.calls.length).toBe(1);
    const args = (client0?.files.download.mock.calls[0] as unknown[])[0] as { file: string };
    expect(args.file).toBe(handle);
  });

  it('期限切れトークンは403', async () => {
    const sid = 's-exp';
    const pageId = 'p-1';
    const handle = 'file-xyz';
    const token = issueDownloadToken({ sid, pageId, handle, ttlSec: 1 }); // 1秒
    // 現在時刻を+5秒に進める
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 5000);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await getDownload({ headers, query: { token } });
    expect(res.status).toBe(403);
    expect(asErr(res.body).error).toMatch(/forbidden/);
  });

  it('改ざんトークンは403', async () => {
    const sid = 's-bad';
    const pageId = 'p-1';
    const handle = 'file-xyz';
    const token = issueDownloadToken({ sid, pageId, handle, ttlSec: 60 }) + 'x';
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await getDownload({ headers, query: { token } });
    expect(res.status).toBe(403);
    expect(asErr(res.body).error).toMatch(/forbidden/);
  });

  it('sid未設定は401、BYOK未登録も401', async () => {
    const token = 'dummy';
    const res1 = await getDownload({ headers: new Headers(), query: { token } });
    expect(res1.status).toBe(401);

    (getKey as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(
      undefined,
    );
    const sid = 's-nokey';
    const pageId = 'p-1';
    const handle = 'file-xyz';
    const good = issueDownloadToken({ sid, pageId, handle, ttlSec: 60 });
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res2 = await getDownload({ headers, query: { token: good } });
    expect(res2.status).toBe(401);
  });

  it('下位のdownload失敗は500', async () => {
    const mk = makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void };
    mk.mockReturnValueOnce({
      files: {
        download: vi.fn().mockRejectedValueOnce(new Error('boom')),
      },
    });

    const sid = 's-dl-err';
    const pageId = 'p-1';
    const handle = 'file-xyz';
    const token = issueDownloadToken({ sid, pageId, handle, ttlSec: 60 });
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await getDownload({ headers, query: { token } });
    expect(res.status).toBe(500);
    expect(asErr(res.body).error).toMatch(/download_error/);
  });
});
