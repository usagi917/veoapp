import type { FFmpegLike } from './concat';

type FFmpegModule = {
  createFFmpeg: (opts: { log?: boolean }) => FFmpegLike & { load: () => Promise<void> };
};

async function importFfmpegModule(): Promise<FFmpegModule> {
  const g = globalThis as unknown as { __mockFfmpegModule?: FFmpegModule };
  if (g.__mockFfmpegModule) return g.__mockFfmpegModule;
  // Use a non-literal specifier to avoid bundler resolution in tests; real builds should include the dependency.
  const spec: string = '@ffmpeg/ffmpeg';
  const mod = (await import(spec)) as unknown as FFmpegModule;
  return mod;
}

let ffmpegPromise: Promise<FFmpegLike> | null = null;
let ffmpegInstance: FFmpegLike | null = null;

/**
 * Lazily loads @ffmpeg/ffmpeg and returns a singleton instance.
 * Ensures the heavy WASM is initialized only once.
 */
export async function getFfmpeg(): Promise<FFmpegLike> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegPromise) return ffmpegPromise;

  ffmpegPromise = (async () => {
    const mod = await importFfmpegModule();
    if (!mod || typeof mod.createFFmpeg !== 'function') {
      throw new Error('ffmpeg module not available');
    }
    // createFFmpeg options kept minimal; logging off by default
    const ff = mod.createFFmpeg({ log: false });
    await ff.load();
    ffmpegInstance = ff;
    return ffmpegInstance;
  })();

  return ffmpegPromise;
}

// For tests: reset the cached instance/promise
export function __resetForTest() {
  ffmpegPromise = null;
  ffmpegInstance = null;
}
