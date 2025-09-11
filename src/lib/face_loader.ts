/**
 * 顔検出器の動的ローダー
 */

// 顔検出の結果型
export interface FaceDetectionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

// 顔検出関数の型
export type FaceDetector = (image: HTMLImageElement | HTMLCanvasElement | ImageData) => Promise<FaceDetectionResult[]>;

/**
 * 顔検出器を動的に読み込む
 * 実際の実装では、MediaPipe Face Detection や Face-API.js などを使用
 */
export async function loadFaceDetector(): Promise<FaceDetector> {
  // TODO: 実際の顔検出ライブラリを導入するまでは空の検出器を返す
  return async (_image: HTMLImageElement | HTMLCanvasElement | ImageData): Promise<FaceDetectionResult[]> => {
    // モック実装：検出されなかったことにする
    return [];
  };
}
