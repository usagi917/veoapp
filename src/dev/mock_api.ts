/*
  開発/本番共通の最小フェッチモック。
  - /api/generate だけを処理し、src/api/generate.ts の実装に委譲。
  - 余計なオペレーション/ダウンロードAPIは廃止。
*/

type Json = Record<string, unknown>;

async function parseJson(init?: RequestInit | undefined): Promise<Json> {
  const raw = init?.body;
  try {
    if (typeof raw === 'string') return JSON.parse(raw) as Json;
    return {};
  } catch {
    return {};
  }
}

async function handleApi(url: URL, init?: RequestInit): Promise<Response> {
  const path = url.pathname;

  // /api/generate（POST）
  if (path === '/api/generate' && (init?.method || 'GET').toUpperCase() === 'POST') {
    try {
      const body = await parseJson(init);
      const { postGenerate } = await import('../api/generate');
      const out = await postGenerate({ headers: {}, body });
      const hs: Record<string, string> = {};
      out.headers.forEach((v, k) => (hs[k] = v));
      return new Response(JSON.stringify(out.body), { status: out.status, headers: hs });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'internal_error', message: String(e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('not handled', { status: 404 });
}

export function installFetchMock(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __apiMockInstalled?: boolean };
  if (w.__apiMockInstalled) return;
  const orig = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? new URL(input, location.origin)
        : new URL((input as Request).url || String(input), location.origin);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(url, init);
    }
    return orig(input as RequestInfo, init);
  }) as typeof window.fetch;
  w.__apiMockInstalled = true;
}
