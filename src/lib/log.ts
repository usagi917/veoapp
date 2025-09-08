// 最小限・PIIレスのロギングユーティリティ

export type SafeGenerateLog = {
  hasImage: boolean;
  scriptChars: number;
  lengthSec?: 8 | 16;
  consent?: boolean;
  voice?: { gender?: string; tone?: string };
  motion?: string;
  microPan?: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function sanitizeGenerateInput(body: unknown): SafeGenerateLog {
  const r = isRecord(body) ? body : {};
  const image = typeof r.image === 'string' ? r.image : '';
  const script = typeof r.script === 'string' ? r.script : '';
  const voiceR = isRecord(r.voice) ? r.voice : undefined;
  const hasImage = /^data:image\/png;base64,/i.test(image);
  const lengthSec = r.lengthSec === 8 || r.lengthSec === 16 ? (r.lengthSec as 8 | 16) : undefined;
  const consent = typeof r.consent === 'boolean' ? r.consent : undefined;
  const motion = typeof r.motion === 'string' ? r.motion : undefined;
  const microPan = typeof r.microPan === 'boolean' ? r.microPan : undefined;
  const voice = voiceR
    ? {
        gender: typeof voiceR.gender === 'string' ? voiceR.gender : undefined,
        tone: typeof voiceR.tone === 'string' ? voiceR.tone : undefined,
      }
    : undefined;

  return {
    hasImage,
    scriptChars: script.length,
    lengthSec,
    consent,
    voice,
    motion,
    microPan,
  };
}

type LogType =
  | 'generate_request'
  | 'generate_result'
  | 'op_poll'
  | 'download_issue'
  | 'download'
  | 'metrics'
  | 'error';

// 文字列値を短縮（念のための安全網）
function truncateValues(obj: unknown, max = 200): unknown {
  if (typeof obj === 'string') return obj.length > max ? obj.slice(0, max) + '…' : obj;
  if (Array.isArray(obj)) return obj.map((v) => truncateValues(v, max));
  if (isRecord(obj)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = truncateValues(v, max);
    }
    return out;
  }
  return obj;
}

export function logEvent(type: LogType, payload: unknown): string {
  const base: Record<string, unknown> = { ts: new Date().toISOString(), type };
  const extra = truncateValues(payload);
  if (isRecord(extra)) {
    Object.assign(base, extra);
  }
  const line = JSON.stringify(base);
  // 出力（テスト容易性のため返り値も返す）
  try {
    console.log(line);
  } catch {
    // ignore
  }
  return line;
}
