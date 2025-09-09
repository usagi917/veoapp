import { describe, it, expect, beforeEach } from 'vitest';

type G = {
  __mockProbeVideoMeta?: (arg: unknown) => Promise<{
    width: number;
    height: number;
    fps?: number;
    durationSec?: number;
  }>;
};

describe('probeVideoMeta (stub util with injectable provider)', () => {
  beforeEach(() => {
    const g = globalThis as unknown as G;
    delete g.__mockProbeVideoMeta;
  });

  it('uses injected provider when available', async () => {
    const input = new Uint8Array([1, 2, 3]);
    // Inject mock provider
    const g = globalThis as unknown as G;
    g.__mockProbeVideoMeta = async (arg: unknown) => {
      expect(arg).toBe(input);
      return { width: 1280, height: 720, fps: 24, durationSec: 8 };
    };

    const { probeVideoMeta } = await import('./video');
    const meta = await probeVideoMeta(input);
    expect(meta).toEqual({ width: 1280, height: 720, fps: 24, durationSec: 8 });
  });

  it('rejects when no provider is injected', async () => {
    const input = new Uint8Array([]);
    const { probeVideoMeta } = await import('./video');
    await expect(probeVideoMeta(input)).rejects.toThrow(/probeVideoMeta provider not available/i);
  });
});
