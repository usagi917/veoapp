export type BBox = { x: number; y: number; width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

export function aspect16by9(width: number, height: number): boolean {
  return width * 9 === height * 16;
}

function clamp(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function centerOf(b: BBox): { cx: number; cy: number } {
  return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
}

/**
 * 画像内に収まる最大の 16:9 矩形サイズを返す（整数、縦横は切り下げ）。
 */
export function maxRect16by9Inside(
  imageWidth: number,
  imageHeight: number,
): {
  width: number;
  height: number;
} {
  if (imageWidth <= 0 || imageHeight <= 0) return { width: 0, height: 0 };
  const arW = imageHeight * (16 / 9);
  if (imageWidth >= arW) {
    // 横に余裕がある：高さ優先で幅を決める
    const width = Math.floor(arW);
    const height = Math.floor((width * 9) / 16);
    return { width, height };
  }
  // 縦に余裕がある：幅優先で高さを決める
  const width = Math.floor(imageWidth);
  const height = Math.floor((width * 9) / 16);
  return { width, height };
}

/**
 * 顔重心をできるだけ中心に置きつつ、画像内に収まる 16:9 矩形を算出する。
 * faces[index] を基準にする。facesが空、またはindex不正なら undefined を返す。
 */
export function computeSmartCropRect(
  imageWidth: number,
  imageHeight: number,
  faces: BBox[],
  index: number,
): Rect | undefined {
  if (!Array.isArray(faces) || faces.length === 0) return undefined;
  if (index < 0 || index >= faces.length) return undefined;
  const face = faces[index];
  const { width: rectW, height: rectH } = maxRect16by9Inside(imageWidth, imageHeight);
  if (rectW <= 0 || rectH <= 0) return undefined;
  const { cx, cy } = centerOf(face);
  const x = clamp(Math.round(cx - rectW / 2), 0, Math.max(0, imageWidth - rectW));
  const y = clamp(Math.round(cy - rectH / 2), 0, Math.max(0, imageHeight - rectH));
  return { x, y, width: rectW, height: rectH };
}

/**
 * 主たる顔を推定する。
 * 方針：画像中心に最も近い顔を優先。距離同率の場合は面積が大きい方。
 * 顔が0件のときは -1。
 */
export function pickPrimaryFaceIndex(
  imageWidth: number,
  imageHeight: number,
  faces: BBox[],
): number {
  if (!Array.isArray(faces) || faces.length === 0) return -1;
  const imgCx = imageWidth / 2;
  const imgCy = imageHeight / 2;
  let best = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestArea = -1;
  faces.forEach((f, i) => {
    const { cx, cy } = centerOf(f);
    const dx = cx - imgCx;
    const dy = cy - imgCy;
    const dist2 = dx * dx + dy * dy;
    const area = f.width * f.height;
    const score = dist2; // 小さいほど良い
    if (score < bestScore || (score === bestScore && area > bestArea)) {
      best = i;
      bestScore = score;
      bestArea = area;
    }
  });
  return best;
}

// 検出器のスタブ（将来実装）
export async function detectFaces(image: unknown): Promise<BBox[]> {
  // 実装は MediaPipe Tasks / face-api.js に委譲予定
  // テスト容易性のため、グローバルモック `__mockFaceDetector` があればそれを使用。
  type Mock = (img: unknown) => Promise<unknown>;
  const g = globalThis as { __mockFaceDetector?: Mock };
  const fromMock: Mock | null =
    typeof g.__mockFaceDetector === 'function' ? g.__mockFaceDetector! : null;

  const raw: unknown = fromMock ? await fromMock(image) : ([] as BBox[]);
  if (!Array.isArray(raw)) return [];

  const out: BBox[] = [];
  for (const r of raw as Array<Record<string, unknown>>) {
    if (!r) continue;
    const x = Number(r['x'] as number | string);
    const y = Number(r['y'] as number | string);
    const width = Number(r['width'] as number | string);
    const height = Number(r['height'] as number | string);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
    if (width <= 0 || height <= 0) continue;
    out.push({ x, y, width, height });
  }
  return out;
}
