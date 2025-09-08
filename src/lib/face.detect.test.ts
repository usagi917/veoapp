import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectFaces, type BBox } from './face';

describe('detectFaces: モック検出器の利用とサニタイズ', () => {
  const g = globalThis as { __mockFaceDetector?: (img: unknown) => Promise<unknown> };
  const orig = g.__mockFaceDetector;

  afterEach(() => {
    g.__mockFaceDetector = orig;
  });

  it('モックがあればそれを使ってBBox[]を返す', async () => {
    const boxes: BBox[] = [
      { x: 10, y: 20, width: 30, height: 40 },
      { x: 100, y: 200, width: 300, height: 400 },
    ];
    const spy = vi.fn(async (_img: unknown) => boxes);
    g.__mockFaceDetector = spy;

    const res = await detectFaces({});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(res).toEqual(boxes);
  });

  it('無効な結果は除外される（数値でない/幅高<=0）', async () => {
    const dirty: Array<{ x: unknown; y: unknown; width: unknown; height: unknown }> = [
      { x: '1', y: '2', width: '3', height: '4' }, // 文字列数値 → OKに正規化
      { x: 0, y: 0, width: NaN, height: 10 }, // NaN → 除外
      { x: 0, y: 0, width: -1, height: 5 }, // 負の幅 → 除外
      { x: 5, y: 5, width: 10, height: 0 }, // 高さ0 → 除外
    ];
    g.__mockFaceDetector = async () => dirty as unknown;

    const res = await detectFaces({});
    expect(res).toEqual([{ x: 1, y: 2, width: 3, height: 4 }]);
  });
});
