// Simpleモード用の最小スタブ実装（未実装 501 を返す）
export type PostGenerateInput = { headers?: any; body?: any };
export type PostGenerateOutput = { status: number; headers: Headers; body: any };

export async function postGenerate(_req: PostGenerateInput): Promise<PostGenerateOutput> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  // APIキーはフロントエンドから受け取る（環境変数は使わない）
  const apiKey = (typeof _req.body === 'object' && _req.body?.apiKey) || undefined;
  if (!apiKey) {
    return {
      status: 400,
      headers,
      body: { error: 'missing_api_key' },
    };
  }
  return {
    status: 501,
    headers,
    body: { error: 'not_implemented' },
  };
}
