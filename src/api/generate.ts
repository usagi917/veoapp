import { Buffer } from 'node:buffer';
import { getSid } from '../lib/cookies';
import { verifyCsrfToken } from '../lib/csrf';
import { getKey } from '../lib/kv';
import { makeClient, DEFAULT_VEO_MODEL } from '../lib/genai';
import { fitScriptAndSplit } from '../lib/script';
import { buildPrompt } from '../lib/prompt';
import { z } from 'zod';
import { applyCsp } from '../lib/csp';
import { logEvent, sanitizeGenerateInput } from '../lib/log';
import { begin as beginMetrics } from '../lib/metrics';

export type PostGenerateInput = {
  headers: Headers;
  body: {
    image?: string; // dataURL (image/png)
    script?: string;
    voice?: { gender?: string; tone?: string };
    motion?: string;
    microPan?: boolean;
    lengthSec?: number; // MVPでは8のみ対応（Step 5-3）
    consent?: boolean;
    csrf?: string;
  };
};

export type PostGenerateOutput = {
  status: number;
  headers: Headers;
  body: { ops: string[]; usedScript: string[] } | { error: string };
};

function parsePngDataUrl(dataUrl: string): { mimeType: 'image/png'; bytes: Uint8Array } | null {
  // 大文字小文字を無視し、base64部の空白/改行を許容する
  const m = /^data:(image\/png);base64,([\sA-Za-z0-9+/=]+)$/i.exec(dataUrl || '');
  if (!m) return null;
  const b64 = m[2].replace(/\s+/g, '');
  const buf = Buffer.from(b64, 'base64');
  return { mimeType: 'image/png', bytes: new Uint8Array(buf) };
}

type GenerateArgs = {
  apiKey: string;
  prompt: string;
  negative: string;
  imageBytes: Uint8Array;
  mimeType: 'image/png';
};

type GenClient = {
  models: {
    generateVideos: (args: {
      model: string;
      prompt: string;
      image: { imageBytes: Uint8Array; mimeType: 'image/png' };
      config: { aspectRatio: '16:9'; negativePrompt: string; personGeneration: 'allow_adult' };
    }) => Promise<{ operation?: string; name?: string }>;
  };
};

async function generateOnce(args: GenerateArgs): Promise<string> {
  const client = makeClient(args.apiKey) as unknown as GenClient;
  const modelToUse = (DEFAULT_VEO_MODEL as string | undefined) ?? 'veo-3.0-fast-generate-preview';
  const res = await client.models.generateVideos({
    model: modelToUse,
    prompt: args.prompt,
    image: { imageBytes: args.imageBytes, mimeType: args.mimeType },
    config: {
      aspectRatio: '16:9',
      negativePrompt: args.negative,
      personGeneration: 'allow_adult',
    },
  });
  const id = (res && (res.operation || res.name)) as string | undefined;
  if (!id) throw new Error('no_operation_id');
  return id;
}

export async function postGenerate({
  headers,
  body,
}: PostGenerateInput): Promise<PostGenerateOutput> {
  const resHeaders = new Headers();
  applyCsp(resHeaders);
  const endMetrics = beginMetrics('generate').end;
  // 最小・PIIレスのログ
  try {
    logEvent('generate_request', sanitizeGenerateInput(body));
  } catch {
    // ignore logging errors
  }

  const sid = getSid(headers);
  if (!sid) {
    endMetrics(false);
    return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };
  }

  const csrf = typeof body.csrf === 'string' ? body.csrf : '';
  if (!verifyCsrfToken(sid, csrf)) {
    endMetrics(false);
    return { status: 400, headers: resHeaders, body: { error: 'invalid_csrf' } };
  }

  const apiKey = await getKey(sid);
  if (!apiKey) {
    endMetrics(false);
    return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };
  }

  // 入力 zod（strict）
  const Schema = z
    .object({
      image: z.string().min(1),
      script: z.string().min(1),
      voice: z
        .object({
          gender: z.string().optional(),
          tone: z.string().optional(),
        })
        .optional(),
      motion: z.string().optional(),
      microPan: z.boolean().optional(),
      lengthSec: z.union([z.literal(8), z.literal(16)]),
      consent: z.literal(true),
      csrf: z.string().min(1),
    })
    .strict();

  const parsedInput = Schema.safeParse(body);
  if (!parsedInput.success) {
    endMetrics(false);
    return { status: 400, headers: resHeaders, body: { error: 'invalid_input' } };
  }
  const input = parsedInput.data;
  const image = input.image;
  const script = input.script.trim();
  const tone = input.voice?.tone || 'normal';
  const lengthSec = input.lengthSec;

  const parsed = parsePngDataUrl(image);
  if (!parsed) {
    endMetrics(false);
    return { status: 400, headers: resHeaders, body: { error: 'invalid_input' } };
  }

  const { segments } = fitScriptAndSplit(script, lengthSec as 8 | 16, tone);
  const { prompt, negative } = buildPrompt({
    script: segments,
    voice: body.voice || {},
    motion: body.motion,
    microPan: body.microPan,
  });

  // 1回リトライポリシー（8秒:1回、16秒:2回）
  const attempt = async (): Promise<string[] | null> => {
    try {
      if (lengthSec === 8) {
        const op = await generateOnce({
          apiKey,
          prompt,
          negative,
          imageBytes: parsed.bytes,
          mimeType: 'image/png',
        });
        return [op];
      }
      // 16秒（8秒×2）
      const opA = await generateOnce({
        apiKey,
        prompt,
        negative,
        imageBytes: parsed.bytes,
        mimeType: 'image/png',
      });
      const opB = await generateOnce({
        apiKey,
        prompt,
        negative,
        imageBytes: parsed.bytes,
        mimeType: 'image/png',
      });
      return [opA, opB];
    } catch {
      return null;
    }
  };

  const first = await attempt();
  if (first) {
    endMetrics(true);
    return { status: 200, headers: resHeaders, body: { ops: first, usedScript: segments } };
  }
  const second = await attempt();
  if (second) {
    endMetrics(true);
    return { status: 200, headers: resHeaders, body: { ops: second, usedScript: segments } };
  }
  try {
    // 最小の例外記録
    const { logApiError } = await import('../lib/log');
    logApiError('generate', new Error('generate_error'));
  } catch {
    // ignore logging errors
  }
  endMetrics(false);
  return { status: 500, headers: resHeaders, body: { error: 'generate_error' } };
}
