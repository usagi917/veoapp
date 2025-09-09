/**
 * Video metadata probing utility (stub for MVP).
 *
 * - Real probing (mp4 moov/ftyp parsing or <video> metadata) is heavy/async and
 *   environment-specific. For now, we expose an injectable provider so tests
 *   and future implementations can supply the actual logic without coupling.
 * - Tests inject `globalThis.__mockProbeVideoMeta`.
 */

export type ProbeInput = Blob | ArrayBuffer | Uint8Array;

export type VideoMeta = {
  width: number;
  height: number;
  fps?: number;
  durationSec?: number;
};

type Provider = (input: ProbeInput) => Promise<VideoMeta>;

/**
 * Probes video metadata from a Blob/ArrayBuffer/Uint8Array.
 *
 * Current MVP provides only an injectable hook for tests or platform-specific
 * implementations. In production, this can be implemented using HTMLVideoElement
 * (browser) or mp4/ffprobe parsing (server) behind the same API.
 */
export async function probeVideoMeta(input: ProbeInput): Promise<VideoMeta> {
  const g = globalThis as unknown as { __mockProbeVideoMeta?: Provider };
  const provider = g.__mockProbeVideoMeta;
  if (!provider) {
    throw new Error('probeVideoMeta provider not available');
  }
  const meta = await provider(input);
  if (!meta || typeof meta !== 'object') {
    throw new Error('invalid VideoMeta from provider');
  }
  const m = meta as Partial<VideoMeta>;
  if (typeof m.width !== 'number' || typeof m.height !== 'number') {
    throw new Error('invalid VideoMeta from provider');
  }
  return { width: m.width, height: m.height, fps: m.fps, durationSec: m.durationSec };
}
