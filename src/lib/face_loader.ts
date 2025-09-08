// 動的importで顔検出ライブラリ（face-api.js など）を遅延ロードするための薄いラッパ
// 実際の型やAPIには依存せず、テスト容易性のため「検出関数」を返すだけにする。

export type DetectFunction = (image: unknown) => Promise<unknown>;

/**
 * 動的に顔検出器を読み込み、検出関数を返す。
 * - 実運用では `face-api.js` 等を import する想定（存在しなければ空配列を返す関数を返却）。
 * - テストでは本モジュールをモックして、任意の検出結果を返す関数を差し込む。
 */
export async function loadFaceDetector(): Promise<DetectFunction> {
  const spec = 'face-api.js';
  try {
    const mod: unknown = (await import(spec)) as unknown;
    // 代表的なエクスポート形態をいくつか試す（存在しない場合はno-op）
    const anyMod = mod as Record<string, unknown> | null | undefined;
    // 1) 名前付き export detectFaces(image)
    const namedDetect = anyMod && (anyMod['detectFaces'] as unknown);
    if (typeof namedDetect === 'function') return namedDetect as DetectFunction;
    // 2) default export が関数
    const def = anyMod && (anyMod['default'] as unknown);
    if (typeof def === 'function') return def as DetectFunction;
  } catch {
    // ライブラリ未導入・実行環境外では読み込み失敗しても良い（no-opにフォールバック）
  }
  // デフォルトは「検出なし」
  return async () => [] as unknown[];
}
