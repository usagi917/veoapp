import { describe, it, expect } from 'vitest';
import { type BBox } from './face';
import { aspect9by16, maxRect9by16Inside, computeSmartCropRectAR } from './face';

describe('face: スマートクロップ（9:16）', () => {
  it('画像内の最大9:16矩形サイズを返す（横長/縦長）', () => {
    // 1920x1280 → 高さ優先で 720x1280
    const r1 = maxRect9by16Inside(1920, 1280);
    expect(aspect9by16(r1.width, r1.height)).toBe(true);
    expect(r1.width).toBe(Math.floor((1280 * 9) / 16));
    expect(r1.height).toBe(1280);

    // 1080x1920（縦長）→ 幅優先で 1080x1920
    const r2 = maxRect9by16Inside(1080, 1920);
    expect(aspect9by16(r2.width, r2.height)).toBe(true);
    expect(r2.width).toBe(1080);
    expect(r2.height).toBe(Math.floor((1080 * 16) / 9));
  });

  it('顔重心ベースで9:16矩形を算出（中心近傍/境界クランプ）', () => {
    const W = 1920;
    const H = 1280;
    const faces: BBox[] = [{ x: 900, y: 600, width: 120, height: 120 }];
    const rect = computeSmartCropRectAR(W, H, faces, 0, '9:16')!;
    expect(aspect9by16(rect.width, rect.height)).toBe(true);
    // 中央近傍
    const rx = rect.x + rect.width / 2;
    const ry = rect.y + rect.height / 2;
    expect(Math.abs(rx - W / 2)).toBeLessThanOrEqual(5);
    expect(Math.abs(ry - H / 2)).toBeLessThanOrEqual(5);
  });
});
