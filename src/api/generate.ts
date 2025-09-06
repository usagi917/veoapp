import { Buffer } from 'node:buffer';
import { getSid } from '../lib/cookies';
import { verifyCsrfToken } from '../lib/csrf';
import { getKey } from '../lib/kv';
import { makeClient } from '../lib/genai';
import { fitScriptAndSplit } from '../lib/script';
import { buildPrompt } from '../lib/prompt';

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
  const m = /^data:(image\/png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  const b64 = m[2];
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
  const res = await client.models.generateVideos({
    model: 'veo-3.0-generate-preview',
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

  const sid = getSid(headers);
  if (!sid) return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };

  const csrf = typeof body.csrf === 'string' ? body.csrf : '';
  if (!verifyCsrfToken(sid, csrf))
    return { status: 400, headers: resHeaders, body: { error: 'invalid_csrf' } };

  const apiKey = await getKey(sid);
  if (!apiKey) return { status: 401, headers: resHeaders, body: { error: 'unauthorized' } };

  // 入力バリデーション（最小限）
  const image = typeof body.image === 'string' ? body.image : '';
  const script = typeof body.script === 'string' ? body.script.trim() : '';
  const tone = body.voice?.tone || 'normal';
  const lengthSec = body.lengthSec;
  const consent = body.consent === true;

  if (!consent || (lengthSec !== 8 && lengthSec !== 16)) {
    return { status: 400, headers: resHeaders, body: { error: 'invalid_input' } };
  }
  const parsed = parsePngDataUrl(image);
  if (!parsed) return { status: 400, headers: resHeaders, body: { error: 'invalid_input' } };

  const { segments } = fitScriptAndSplit(script, (lengthSec as 8 | 16) ?? 8, tone);
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
  if (first)
    return { status: 200, headers: resHeaders, body: { ops: first, usedScript: segments } };
  const second = await attempt();
  if (second)
    return { status: 200, headers: resHeaders, body: { ops: second, usedScript: segments } };
  return { status: 500, headers: resHeaders, body: { error: 'generate_error' } };
}
