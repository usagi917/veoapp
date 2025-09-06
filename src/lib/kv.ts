import process from 'node:process';

function getEnv(name: string): string {
  const v = (process.env as Record<string, string | undefined>)[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

type PipelineResult = unknown[];

async function pipeline(commands: (string | number)[][]): Promise<PipelineResult> {
  const base = getEnv('KV_URL').replace(/\/$/, '');
  const token = getEnv('KV_TOKEN');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  } as const;
  const res = await fetch(`${base}/pipeline`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ commands: commands.map((c) => c.map((x) => String(x))) }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`KV request failed: ${res.status} ${text}`);
  }
  return (await res.json()) as PipelineResult;
}

function k(sid: string): string {
  return `key:${sid}`;
}

export async function setKey(sessionId: string, apiKey: string, ttlSec: number): Promise<void> {
  if (!sessionId) throw new Error('sessionId is required');
  if (!apiKey) throw new Error('apiKey is required');
  if (!Number.isFinite(ttlSec) || ttlSec <= 0) throw new Error('ttlSec must be > 0');
  await pipeline([['SETEX', k(sessionId), ttlSec, apiKey]]);
}

export async function getKey(sessionId: string): Promise<string | undefined> {
  if (!sessionId) throw new Error('sessionId is required');
  const out = (await pipeline([['GET', k(sessionId)]])) as { result: unknown }[];
  const result = Array.isArray(out) ? out[0]?.result : undefined;
  return result == null ? undefined : String(result);
}

export async function delKey(sessionId: string): Promise<boolean> {
  if (!sessionId) throw new Error('sessionId is required');
  const out = (await pipeline([['DEL', k(sessionId)]])) as { result: number }[];
  const result = Array.isArray(out) ? Number(out[0]?.result ?? 0) : 0;
  return result > 0;
}
