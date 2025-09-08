import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// face_loader をモックして、フォールバック経路（動的ローダー経由）を検証する
vi.mock('./face_loader', () => {
  const loadFaceDetector = vi.fn(async () => {
    // サニタイズ対象（文字列数値はOK、それ以外は除外される）を混ぜる
    return async (_img: unknown) => [
      { x: '1', y: '2', width: '3', height: '4' },
      { x: 0, y: 0, width: NaN, height: 10 },
    ];
  });
  return { loadFaceDetector };
});

describe('detectFaces: モックが無い場合は動的ローダー経由で検出関数を呼ぶ', () => {
  const g = globalThis as { __mockFaceDetector?: (img: unknown) => Promise<unknown> };
  const orig = g.__mockFaceDetector;

  beforeEach(() => {
    // グローバルモックは未設定にしておく（フォールバック経路を使わせる）
    g.__mockFaceDetector = undefined;
  });
  afterEach(() => {
    g.__mockFaceDetector = orig;
  });

  it('ローダーが返す検出結果をサニタイズしてBBox[]を返す', async () => {
    // 動的importしたい対象（被テスト関数）をここで読み込む（上のモックが有効）
    const { detectFaces } = await import('./face');
    const res = await detectFaces({});
    expect(res).toEqual([{ x: 1, y: 2, width: 3, height: 4 }]);

    // ローダーが1回呼ばれていること（遅延ロード）
    const mod = await import('./face_loader');
    const calls = (mod.loadFaceDetector as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls.length).toBe(1);
  });
});
