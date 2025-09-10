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

  /**
   * 値が文字列ならそのまま返し、そうでなければ undefined。
   * 呼び出し側でデフォルト値を与える想定。
   */
  function getString(v: unknown): string | undefined {
    return typeof v === 'string' ? v : undefined;
  }

  /**
   * 値が真偽値ならそのまま返し、そうでなければ undefined。
   */
  function getBoolean(v: unknown): boolean | undefined {
    return typeof v === 'boolean' ? v : undefined;
  }

  const image = getString(r.image);
  const script = getString(r.script) ?? '';
  const voiceR = isRecord(r.voice) ? r.voice : undefined;
  const hasImage =
    typeof image === 'string' && /^data:image\/(?:png|jpe?g|webp);base64,/i.test(image);
  const lengthSec = r.lengthSec === 8 || r.lengthSec === 16 ? r.lengthSec : undefined;
  const consent = getBoolean(r.consent);
  const motion = getString(r.motion);
  const microPan = getBoolean(r.microPan);
  const voice = voiceR
    ? {
        gender: getString(voiceR.gender),
        tone: getString(voiceR.tone),
      }
    : undefined;

  return { hasImage, scriptChars: script.length, lengthSec, consent, voice, motion, microPan };
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

/**
 * API層のエラーを最小情報で記録するヘルパ。
 * PIIを避け、どのエンドポイント（where）で起きたかを残す。
 */
export function logApiError(where: string, err: unknown, extra?: unknown): string {
  const safe: Record<string, unknown> = { where };
  if (err && typeof err === 'object') {
    const e = err as { name?: unknown; message?: unknown };
    if (typeof e.name === 'string') safe.name = e.name;
    if (typeof e.message === 'string') safe.message = e.message.slice(0, 200);
  } else if (typeof err === 'string') {
    safe.message = err.slice(0, 200);
  }
  if (extra && isRecord(extra)) {
    safe.extra = truncateValues(extra);
  }
  return logEvent('error', safe);
}
