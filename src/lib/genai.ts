// 実運用では @google/genai をラップする予定だが、
// テスト容易性のために最小の疎通メソッドだけ定義する。

export type GenAiClient = {
  ping: () => Promise<void>;
  operations: {
    getVideosOperation: (args: { operation: string }) => Promise<{
      done?: boolean;
      generatedVideos?: { video?: string }[];
    }>;
  };
  files?: {
    download: (args: { file: string }) => Promise<Uint8Array>;
  };
};

export function makeClient(apiKey: string): GenAiClient {
  if (!apiKey) throw new Error('apiKey is required');
  // MVPでは疎通をスキップ（テストでモックされる想定）
  return {
    async ping() {
      return;
    },
    operations: {
      async getVideosOperation() {
        // 実装はSDKに委譲予定（ここではテスト時にモックされる）
        return { done: false };
      },
    },
  };
}
