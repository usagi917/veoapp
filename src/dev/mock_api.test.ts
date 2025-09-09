import { describe, it, expect, beforeEach } from 'vitest';
import { installFetchMock } from './mock_api';

function setCookie(k: string, v: string) {
  // jsdom環境でもdocument.cookieは利用可能
  document.cookie = `${k}=${v}; path=/`;
}

describe('dev/mock_api: fetch interception for /api/*', () => {
  beforeEach(() => {
    // クッキー/グローバル状態の簡易初期化
    // sidはテストごとにリセット（上書き）
    setCookie('sid', '');
  });

  it('POST /api/key 登録→ sid クッキー付与 → /api/generate → /api/op → /api/download フローが通る', async () => {
    installFetchMock();

    // 1) APIキー登録
    const r1 = await fetch('/api/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'DUMMY-KEY', csrf: 'x' }),
    });
    expect(r1.ok).toBe(true);
    expect(document.cookie).toMatch(/sid=/);

    // 2) 生成リクエスト
    const body = {
      image: 'data:image/png;base64,aGVsbG8=',
      script: 'こんにちは',
      voice: { tone: 'normal' },
      motion: 'neutral',
      microPan: false,
      lengthSec: 8,
      consent: true,
      csrf: 'x',
      model: 'veo-3.0-fast-generate-preview',
    };
    const r2 = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(r2.ok).toBe(true);
    const j2 = (await r2.json()) as { ops?: string[]; usedScript?: string[] };
    expect(Array.isArray(j2.ops)).toBe(true);
    expect((j2.ops || []).length).toBeGreaterThanOrEqual(1);

    const op = (j2.ops || [])[0];
    // モックは非同期でdoneに遷移するため少し待つ
    await new Promise((r) => setTimeout(r, 20));
    const r3 = await fetch(`/api/op?id=${encodeURIComponent(op)}`);
    expect(r3.ok).toBe(true);
    const j3 = (await r3.json()) as { done?: boolean; handle?: string };
    expect(j3.done).toBe(true);
    expect(typeof j3.handle).toBe('string');

    // 3) ダウンロード発行→ダウンロード
    const r4 = await fetch('/api/download/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: j3.handle, csrf: 'x' }),
    });
    expect(r4.ok).toBe(true);
    const j4 = (await r4.json()) as { token?: string };
    expect(typeof j4.token).toBe('string');
    const r5 = await fetch(`/api/download?token=${encodeURIComponent(j4.token || '')}`);
    expect(r5.ok).toBe(true);
  });
});
