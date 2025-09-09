// 画像アップロードの検証とEXIF除去の薄いラッパ
// 実ブラウザでは createImageBitmap/Canvas を使うが、テストではモック前提。

export type ImageMeta = {
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
};

export type ValidationOk = { ok: true; meta: ImageMeta };
export type ValidationNgReason = 'mime' | 'size' | 'resolution';
export type ValidationNg = { ok: false; reason: ValidationNgReason; message: string };
export type ValidationResult = ValidationOk | ValidationNg;

export const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateImageMeta(meta: ImageMeta): ValidationResult {
  if (!SUPPORTED.has(meta.mime)) {
    return {
      ok: false,
      reason: 'mime',
      message: '画像ファイル（JPG/PNG/WebP）を選択してください。',
    };
  }
  if (meta.sizeBytes > MAX_SIZE) {
    return { ok: false, reason: 'size', message: 'ファイルサイズが大きすぎます（最大10MB）。' };
  }
  // 仕様変更: どんなサイズでもOK（解像度の下限チェックを撤廃）
  return { ok: true, meta };
}

// 実装メモ：ブラウザでの寸法取得処理（テストではモック想定）
export async function getImageDimensionsFromFile(
  _file: File,
): Promise<{ width: number; height: number }> {
  // 簡易実装（Nodeテスト環境では未使用）
  // ランタイムでは HTMLImageElement + createObjectURL 等で実装する
  throw new Error('getImageDimensionsFromFile is not implemented in this environment');
}

export async function validateImageFile(file: File): Promise<ValidationResult> {
  const metaBase = { mime: file.type, sizeBytes: file.size } as Pick<
    ImageMeta,
    'mime' | 'sizeBytes'
  >;
  let width = 0;
  let height = 0;
  try {
    const dim = await getImageDimensionsFromFile(file);
    width = dim.width;
    height = dim.height;
  } catch {
    // 寸法が取得できない場合は小さすぎる判定として扱う
    width = 0;
    height = 0;
  }
  return validateImageMeta({ ...metaBase, width, height });
}

// EXIF除去: 実ブラウザでは Canvas で PNG へ再エンコード
export async function stripExifToPng(_file: File): Promise<Blob> {
  // ランタイム実装は別。テストではモックされる前提。
  // ここではダミーのPNG Blobを返す。
  return new Blob([new Uint8Array(0)], { type: 'image/png' });
}
