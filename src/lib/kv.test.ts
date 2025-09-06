import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import process from 'node:process';

import { setKey, getKey, delKey } from './kv';

describe('kv (Upstash RESTラッパ)', () => {
  const OLD_FETCH = globalThis.fetch;

  beforeEach(() => {
    process.env.KV_URL = 'https://kv.example.com';
    process.env.KV_TOKEN = 'test-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = OLD_FETCH as unknown as typeof fetch;
  });

  it('setKey: pipeline(SETEX key ttl value) を Authorization付きで呼ぶ', async () => {
    const mock: typeof fetch = vi.fn(async (url: unknown, init?: unknown) => {
      expect(url).toBe('https://kv.example.com/pipeline');
      const method = (init as { method?: string })?.method;
      expect(method).toBe('POST');
      const hdrs = (init as { headers?: Record<string, string> })?.headers || {};
      expect(hdrs['Authorization']).toBe('Bearer test-token');
      const body = JSON.parse(String((init as { body?: unknown })?.body));
      expect(body.commands[0][0]).toBe('SETEX');
      expect(body.commands[0][1]).toMatch(/^key:/);
      expect(body.commands[0][2]).toBe('3600');
      expect(body.commands[0][3]).toBe('API_KEY');
      return new Response(JSON.stringify([{ result: 'OK' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    globalThis.fetch = mock;

    await setKey('sid123', 'API_KEY', 3600);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('getKey: 値が取得できる', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify([{ result: 'API_KEY' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const v = await getKey('sid123');
    expect(v).toBe('API_KEY');
  });

  it('getKey: 無い場合は undefined', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify([{ result: null }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const v = await getKey('sid123');
    expect(v).toBeUndefined();
  });

  it('delKey: 削除件数>0でtrue', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify([{ result: 1 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const ok = await delKey('sid123');
    expect(ok).toBe(true);
  });

  it('HTTPエラーは例外にする', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response('boom', { status: 500 });
    }) as unknown as typeof fetch;

    await expect(setKey('sid', 'K', 10)).rejects.toThrow(/KV request failed/);
  });
});
