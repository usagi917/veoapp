import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
type MockFfmpegModule = {
  createFFmpeg: () => import('./concat').FFmpegLike & { load: () => Promise<void> };
};

let createCalls = 0;
let loadCalls = 0;

import { getFfmpeg, __resetForTest } from './ffmpeg';

describe('ffmpeg loader (lazy singleton)', () => {
  beforeEach(() => {
    __resetForTest();
    createCalls = 0;
    loadCalls = 0;
    (globalThis as unknown as { __mockFfmpegModule?: MockFfmpegModule }).__mockFfmpegModule = {
      createFFmpeg: () => {
        createCalls += 1;
        return {
          async load() {
            loadCalls += 1;
          },
          FS: vi.fn(),
          run: vi.fn(async () => {}),
        } as import('./concat').FFmpegLike & { load: () => Promise<void> };
      },
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { __mockFfmpegModule?: MockFfmpegModule }).__mockFfmpegModule;
  });

  it('initializes only once and returns the same instance', async () => {
    const a = await getFfmpeg();
    const b = await getFfmpeg();
    expect(a).toBe(b);
    expect(createCalls).toBe(1);
    expect(loadCalls).toBe(1);
    expect(typeof a.FS).toBe('function');
    expect(typeof a.run).toBe('function');
  });

  it('coalesces concurrent calls into a single initialization', async () => {
    const [x, y, z] = await Promise.all([getFfmpeg(), getFfmpeg(), getFfmpeg()]);
    expect(x).toBe(y);
    expect(y).toBe(z);
    expect(createCalls).toBe(1);
    expect(loadCalls).toBe(1);
  });
});
