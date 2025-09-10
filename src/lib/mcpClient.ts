/**
 * MCPクライアント（最小）：Streamable HTTP相当の /health を叩いて疎通確認のみ行う。
 * 依存追加なしで動くよう素の fetch を利用（将来的にMCP SDKへ差し替え）。
 */

export async function checkHealth(baseUrl: string): Promise<boolean> {
  const root = (baseUrl || '').replace(/\/$/, '');
  const url = `${root}/health`;
  try {
    const res = await fetch(url, { method: 'GET' });
    return !!res.ok;
  } catch {
    return false;
  }
}
