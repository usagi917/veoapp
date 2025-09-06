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

function k(sig: string): string {
  return `dlblk:${sig}`;
}

export async function setTokenBlocked(sig: string, ttlSec: number): Promise<void> {
  if (!sig) throw new Error('sig is required');
  if (!Number.isFinite(ttlSec) || ttlSec <= 0) throw new Error('ttlSec must be > 0');
  await pipeline([['SETEX', k(sig), ttlSec, 1]]);
}

export async function isTokenBlocked(sig: string): Promise<boolean> {
  if (!sig) throw new Error('sig is required');
  const out = (await pipeline([['GET', k(sig)]])) as { result: unknown }[];
  const result = Array.isArray(out) ? out[0]?.result : undefined;
  return result != null && String(result) === '1';
}
