/*
  開発プレビュー/デモ用の簡易フェッチモック（Simpleモード）。
  - /api/* への fetch をブラウザ内で処理し、最小限のハッピーパスを返す。
  - BYOKは不要。sidを付与しつつ、インメモリで op/token を管理。
*/

type Json = Record<string, unknown>;
type Op = { id: string; done: boolean; handle?: string };

const mem = {
  ops: new Map<string, Op>(),
  tokens: new Map<string, { handle: string; exp: number }>(),
};

function ensureSid(): string {
  const m = /(?:^|;\s*)sid=([^;]+)/.exec(document.cookie || '');
  if (m) return decodeURIComponent(m[1]);
  const sid = `s_${Math.random().toString(36).slice(2, 10)}`;
  // biome-ignore lint/suspicious/noDocumentCookie: noDocumentCookie is not needed
  document.cookie = `sid=${encodeURIComponent(sid)}; path=/; SameSite=Lax`;
  return sid;
}

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

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
    ensureSid();
    const body = await parseJson(init);
    // 本番ビルド時は実装関数へ委譲（ブラウザ内で実行）
    if (import.meta.env.PROD) {
      const { postGenerate } = await import('../api/generate');
      const out = await postGenerate({ headers: {}, body });
      const hs: Record<string, string> = {};
      // biome-ignore lint/suspicious/noAssignInExpressions: noAssignInExpressions is not needed
      out.headers.forEach((v, k) => (hs[k] = v));
      return new Response(JSON.stringify(out.body), { status: out.status, headers: hs });
    }
    // 開発モードはモックのハッピーパス
    const len = Number(body.lengthSec || 8);
    const n = len === 16 ? 2 : 1;
    const ops: string[] = [];
    for (let i = 0; i < n; i++) {
      const id = `op_${Math.random().toString(36).slice(2, 10)}`;
      mem.ops.set(id, { id, done: false });
      ops.push(id);
      setTimeout(() => {
        const handle = `h_${Math.random().toString(36).slice(2, 8)}`;
        mem.ops.set(id, { id, done: true, handle });
      }, 10);
    }
    return jsonResponse(200, { ops });
  }

  // /api/op（GET）
  if (path === '/api/op' && (init?.method || 'GET').toUpperCase() === 'GET') {
    const id = url.searchParams.get('id') || '';
    const op = mem.ops.get(id);
    if (!op) return jsonResponse(404, { error: 'not_found' });
    if (!op.done) return jsonResponse(200, { done: false });
    if (!op.handle) return jsonResponse(422, { error: 'no_handle' });
    return jsonResponse(200, { done: true, handle: op.handle });
  }

  // /api/download/issue（POST）
  if (path === '/api/download/issue' && (init?.method || 'GET').toUpperCase() === 'POST') {
    ensureSid();
    const body = await parseJson(init);
    const handle = String(body.handle || '');
    if (!handle) return jsonResponse(400, { error: 'invalid_input' });
    const token = `t_${Math.random().toString(36).slice(2, 12)}`;
    mem.tokens.set(token, { handle, exp: Date.now() + 120_000 });
    return jsonResponse(200, { token });
  }

  // /api/download（GET）
  if (path === '/api/download' && (init?.method || 'GET').toUpperCase() === 'GET') {
    const token = url.searchParams.get('token') || '';
    const rec = mem.tokens.get(token);
    if (!rec || rec.exp < Date.now()) return new Response('forbidden', { status: 403 });
    const data = new Uint8Array([0, 1, 2, 3]);
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="pictalk_demo.mp4"',
      },
    });
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
