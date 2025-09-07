import { describe, it, expect } from 'vitest';
import {
  aspect16by9,
  computeSmartCropRect,
  maxRect16by9Inside,
  pickPrimaryFaceIndex,
  type BBox,
} from './face';

describe('face: スマートクロップ（16:9）', () => {
  it('画像内の最大16:9矩形サイズを返す（横長/縦長）', () => {
    // 4:3 画像（4000x3000）→ 幅優先
    const r1 = maxRect16by9Inside(4000, 3000);
    expect(aspect16by9(r1.width, r1.height)).toBe(true);
    expect(r1.width).toBe(4000);
    expect(r1.height).toBe(Math.floor((4000 * 9) / 16));

    // 縦長（2000x4000）→ 高さ優先
    const r2 = maxRect16by9Inside(2000, 4000);
    expect(aspect16by9(r2.width, r2.height)).toBe(true);
    // この場合、幅=2000, 高さ=floor(2000*9/16)=1125
    expect(r2.width).toBe(2000);
    expect(r2.height).toBe(Math.floor((2000 * 9) / 16));
  });

  it('顔重心を中心に据えて16:9矩形を算出（境界はクランプ）', () => {
    const W = 4000;
    const H = 3000;
    const faces: BBox[] = [
      { x: 1900, y: 1450, width: 200, height: 100 }, // ほぼ中央
    ];
    const rect = computeSmartCropRect(W, H, faces, 0)!;
    expect(rect).toBeTruthy();
    expect(aspect16by9(rect.width, rect.height)).toBe(true);
    // 中央付近なので、矩形の中心は画像中心に近い
    const rx = rect.x + rect.width / 2;
    const ry = rect.y + rect.height / 2;
    expect(Math.abs(rx - W / 2)).toBeLessThanOrEqual(5);
    expect(Math.abs(ry - H / 2)).toBeLessThanOrEqual(5);

    // 左端付近の顔→xは0にクランプ
    const rectL = computeSmartCropRect(W, H, [{ x: 0, y: 1400, width: 100, height: 100 }], 0)!;
    expect(rectL.x).toBe(0);
    // 右端付近の顔→xは最大にクランプ
    const rectR = computeSmartCropRect(W, H, [{ x: W - 50, y: 1400, width: 50, height: 50 }], 0)!;
    expect(rectR.x).toBeGreaterThanOrEqual(W - rectR.width);
    expect(rectR.x + rectR.width).toBeLessThanOrEqual(W);

    // 上端/下端付近の顔でyクランプ
    const rectT = computeSmartCropRect(W, H, [{ x: 0, y: 0, width: 50, height: 50 }], 0)!;
    expect(rectT.y).toBe(0);
    const rectB = computeSmartCropRect(W, H, [{ x: 0, y: H - 50, width: 50, height: 50 }], 0)!;
    expect(rectB.y + rectB.height).toBeLessThanOrEqual(H);
  });

  it('facesが空、またはindex不正ならundefined', () => {
    expect(computeSmartCropRect(1000, 1000, [], 0)).toBeUndefined();
    expect(
      computeSmartCropRect(1000, 1000, [{ x: 0, y: 0, width: 10, height: 10 }], 1),
    ).toBeUndefined();
  });
});

describe('face: 主体顔の選択', () => {
  it('画像中心に近い顔を優先（同率なら面積が大きい）', () => {
    const W = 1000;
    const H = 800;
    const faces: BBox[] = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 450, y: 350, width: 60, height: 60 }, // 画像中心付近
      { x: 900, y: 700, width: 120, height: 120 },
    ];
    const i = pickPrimaryFaceIndex(W, H, faces);
    expect(i).toBe(1);

    // 距離同率なら面積が大きい方
    // 同一中心（500,400）に重心が来るように配置し、面積だけ変える
    const centerFaces: BBox[] = [
      { x: 480, y: 380, width: 40, height: 40 }, // 中心
      { x: 460, y: 360, width: 80, height: 80 }, // 同中心だが面積大
    ];
    const j = pickPrimaryFaceIndex(W, H, centerFaces);
    expect(j).toBe(1);
  });

  it('0件なら -1', () => {
    expect(pickPrimaryFaceIndex(100, 100, [])).toBe(-1);
  });
});
