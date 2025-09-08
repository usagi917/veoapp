import { useMutation, useQuery } from '@tanstack/react-query';

export type GenerateVars = {
  image: string; // data:image/png;base64,...
  script: string;
  voice?: { gender?: string; tone?: string };
  motion?: string;
  microPan?: boolean;
  lengthSec: 8 | 16;
  consent: true;
  csrf: string;
};

export type GenerateResult = { ops: string[]; usedScript: string[] };

export function useGenerateMutation() {
  return useMutation<GenerateResult, unknown, GenerateVars>({
    mutationKey: ['generate'],
    mutationFn: async (vars: GenerateVars) => {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string } | undefined;
        const err = new Error(body?.error || 'generate_error') as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      const r = res as unknown as { json?: () => Promise<unknown> };
      const maybe = (typeof r.json === 'function' ? await r.json().catch(() => ({})) : {}) as
        | Partial<GenerateResult>
        | undefined;
      return { ops: maybe?.ops ?? [], usedScript: maybe?.usedScript ?? [] } as GenerateResult;
    },
  });
}

export type OpResult = { done?: boolean; handle?: string };

// 単発で /api/op を取得するユーティリティ（UIからの手動ポーリング用途）
export async function getOpOnce(id: string): Promise<OpResult> {
  const res = await fetch(`/api/op?id=${encodeURIComponent(String(id))}`);
  if (!res.ok) {
    const err = new Error('op_error') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as OpResult;
}

export function useOpQuery(id?: string) {
  return useQuery<OpResult>({
    queryKey: ['op', id],
    enabled: !!id,
    // done:true になるまで 10秒間隔でポーリング
    refetchInterval: (q) => {
      const d = q.state.data as OpResult | undefined;
      return d?.done ? false : 10_000;
    },
    refetchIntervalInBackground: true,
    queryFn: async () => getOpOnce(String(id)),
  });
}
