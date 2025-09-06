import { describe, it, expect, vi, beforeEach } from 'vitest';
import process from 'node:process';

vi.mock('../lib/kv', () => {
  return {
    getKey: vi.fn(async () => 'APIKEY-1'),
  };
});

vi.mock('../lib/genai', () => {
  return {
    makeClient: vi.fn(() => ({
      models: {
        generateVideos: vi.fn(async () => ({ operation: 'op-123' })),
      },
    })),
  };
});

import { issueCsrfToken } from '../lib/csrf';
import { getKey } from '../lib/kv';
import { makeClient } from '../lib/genai';
import { postGenerate } from './generate';

function asErr(b: unknown): { error: string } {
  return b as { error: string };
}

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/l9G2WQAAAABJRU5ErkJggg==';

describe('POST /api/generate (8秒×1)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });

  it('正常系: 8秒×1 → op ひとつを返す（プロンプト要素含む）', async () => {
    const sid = 's-1';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });

    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'こんにちは世界、これはテストです',
        voice: { gender: 'female', tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
      },
    });

    expect(res.status).toBe(200);
    const body = res.body as unknown as { ops: string[]; usedScript: string[] };
    expect(Array.isArray(body.ops)).toBe(true);
    expect(body.ops).toEqual(['op-123']);
    expect(body.usedScript).toHaveLength(1);
    expect(body.usedScript[0]).toContain('こんにちは');

    // 呼び出しパラメータを検証
    // makeClient が返したインスタンスから呼び出し履歴を参照
    const mk = makeClient as unknown as {
      mock: {
        results: { value: { models: { generateVideos: { mock: { calls: unknown[][] } } } } }[];
      };
    };
    const client0 = mk.mock.results.at(-1)?.value; // 直近のクライアント
    expect(client0).toBeTruthy();
    const spy = client0!.models.generateVideos;
    // 1回のみ呼ばれる
    expect(spy.mock.calls.length).toBe(1);
    const args = (spy.mock.calls[0] as unknown[])[0] as {
      prompt: string;
      config?: { negativePrompt?: string; personGeneration?: string };
    };
    expect(args.prompt).toMatch(/女性の声|トーン/);
    expect(args.config?.negativePrompt).toBeDefined();
    expect(args.config?.personGeneration).toBe('allow_adult');
  });

  it('CSRF不正は400', async () => {
    const headers = new Headers({ Cookie: 'sid=s-1' });
    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'a',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf: 'bad.token',
      },
    });
    expect(res.status).toBe(400);
    expect(asErr(res.body).error).toMatch(/invalid_csrf/);
  });

  it('BYOK未登録は401', async () => {
    (getKey as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(
      undefined,
    );
    const sid = 's-x';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'a',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
      },
    });
    expect(res.status).toBe(401);
    expect(asErr(res.body).error).toMatch(/unauthorized/);
  });

  it('画像がdata:image/png;base64でない場合は400', async () => {
    const sid = 's-1';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await postGenerate({
      headers,
      body: {
        image: 'data:text/plain;base64,aaaa',
        script: 'a',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
      },
    });
    expect(res.status).toBe(400);
    expect(asErr(res.body).error).toMatch(/invalid_input/);
  });

  it('1回失敗したら自動で1回リトライする', async () => {
    // 1回目の makeClient() で返すクライアントは失敗、2回目は成功にする
    const mk2 = makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void };
    mk2.mockReturnValueOnce({
      models: {
        generateVideos: vi.fn().mockRejectedValueOnce(new Error('boom')),
      },
    });
    mk2.mockReturnValueOnce({
      models: {
        generateVideos: vi.fn().mockResolvedValueOnce({ operation: 'op-2' }),
      },
    });

    const sid = 's-1';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script: 'a',
        voice: { tone: 'normal' },
        motion: 'neutral',
        microPan: false,
        lengthSec: 8,
        consent: true,
        csrf,
      },
    });
    expect(res.status).toBe(200);
    expect((res.body as unknown as { ops: string[] }).ops).toEqual(['op-2']);
  });
});

describe('POST /api/generate (16秒×2)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });

  it('正常系: 16秒 → op を2つ返す（usedScriptも2つ）', async () => {
    const mk = makeClient as unknown as { mockReturnValueOnce: (v: unknown) => void };
    mk.mockReturnValueOnce({
      models: {
        generateVideos: vi.fn().mockResolvedValueOnce({ operation: 'op-A' }),
      },
    });
    mk.mockReturnValueOnce({
      models: {
        generateVideos: vi.fn().mockResolvedValueOnce({ operation: 'op-B' }),
      },
    });

    const sid = 's-16';
    const csrf = issueCsrfToken(sid);
    const headers = new Headers({ Cookie: `sid=${sid}` });
    const script =
      '自己紹介するね。わたしはラムだっちゃ。電撃ビビビの星から来たの。地球の文化は面白いね。今日はピクトークのデモを見せるっちゃ。まずは台本を短く整えるよ。次に8秒ごとに分けるんだっちゃ。最後に楽しく話して完成だっちゃ。準備はいいかや？';

    const res = await postGenerate({
      headers,
      body: {
        image: pngDataUrl,
        script,
        voice: { gender: 'male', tone: 'normal' },
        motion: 'smile',
        microPan: true,
        lengthSec: 16,
        consent: true,
        csrf,
      },
    });

    expect(res.status).toBe(200);
    const body = res.body as unknown as { ops: string[]; usedScript: string[] };
    expect(body.ops).toEqual(['op-A', 'op-B']);
    expect(body.usedScript).toHaveLength(2);
  });
});
