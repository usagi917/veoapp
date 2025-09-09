import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import process from 'node:process';

vi.mock('../lib/kv', () => {
  return {
    getKey: vi.fn(async () => 'APIKEY-1'),
  };
});

vi.mock('../lib/genai', () => {
  return {
    DEFAULT_VEO_MODEL: 'veo-3.0-fast-generate-preview',
    makeClient: vi.fn(() => ({
      models: {
        // 失敗を強制して 500 パスへ誘導
        generateVideos: vi.fn(async () => {
          throw new Error('gen_fail');
        }),
      },
    })),
  };
});

import * as log from '../lib/log';
import { issueCsrfToken } from '../lib/csrf';
import { postGenerate } from './generate';

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/l9G2WQAAAABJRU5ErkJggg==';

describe('generate: 失敗時に error ログを出力する', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'secret-1234567890';
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('2回とも失敗して500のとき、logEvent("error", { where: "generate", ... }) が呼ばれる', async () => {
    const spy = vi.spyOn(log, 'logApiError');

    const sid = 's-err1';
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
    expect(res.status).toBe(500);

    const calls = (spy as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const hasErrorLog = calls.some((c) => c[0] === 'generate');
    expect(hasErrorLog).toBe(true);
  });
});
