// Simpleモード用の最小スタブ実装（未実装 501 を返す）
export type PostGenerateInput = { headers?: any; body?: any };
export type PostGenerateOutput = { status: number; headers: Headers; body: any };

export async function postGenerate(_req: PostGenerateInput): Promise<PostGenerateOutput> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  // APIキーはフロントエンドから受け取る（環境変数は使わない）
  const apiKey = (typeof _req.body === 'object' && _req.body?.apiKey) || undefined;
  if (!apiKey) {
    return {
      status: 400,
      headers,
      body: { error: 'missing_api_key' },
    };
  }
  try {
    const image = String(_req.body?.image || '');
    const text = String(_req.body?.text || _req.body?.script || '');
    if (!image || !text) {
      return { status: 422, headers, body: { error: 'invalid_input' } };
    }

    const videoUrl = await generateVideoInBrowser({ apiKey, imageDataUrl: image, prompt: text });
    if (!videoUrl) {
      return { status: 502, headers, body: { error: 'upstream_failed' } };
    }
    return { status: 200, headers, body: { videoUrl } };
  } catch (e: any) {
    return {
      status: 501,
      headers,
      body: { error: 'not_implemented', message: e?.message || String(e) },
    };
  }
}

// --- Helpers for in-browser generation (BYOK) ---

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const m = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
  if (!m) return new Uint8Array();
  const b64 = m[2]!;
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function generateVideoInBrowser(args: {
  apiKey: string;
  imageDataUrl: string;
  prompt: string;
}): Promise<string> {
  // 動的インポート + any で型依存を崩してブラウザでも呼べるようにする
  const mod: any = await import('@google/genai');
  const GoogleAI = mod.GoogleAI || mod.GoogleGenerativeAI || mod.default;
  if (!GoogleAI) throw new Error('genai_sdk_not_found');
  const client: any = new GoogleAI({ apiKey: args.apiKey });

  const imageBytes = dataUrlToUint8Array(args.imageDataUrl);
  const model = 'veo-3.0-generate-preview';

  // 1) 動画生成ジョブの発行
  let op: any;
  if (client?.models?.generateVideos) {
    op = await client.models.generateVideos({
      model,
      prompt: args.prompt,
      image: imageBytes,
    });
  } else if (client?.models?.generateVideo) {
    op = await client.models.generateVideo({
      model,
      prompt: args.prompt,
      image: imageBytes,
    });
  } else {
    throw new Error('genai_generate_not_supported');
  }

  const operationName: string = op?.operation || op?.operationName || op?.name;
  if (!operationName) throw new Error('operation_name_missing');

  // 2) ポーリング（最大 ~60秒）
  const maxWaitMs = 60_000;
  const start = Date.now();
  for (;;) {
    const st = await client.operations.getVideosOperation({ operation: operationName, operationName });
    const gv = st?.generatedVideos?.[0];
    if (st?.done && gv?.video) {
      const fileId = gv.video;
      // 3) ダウンロード
      const bytes: any = await client.files.download({ file: fileId });
      const u8 = (bytes as Uint8Array) || new Uint8Array();
      const blob = new Blob([u8 as unknown as BlobPart], { type: 'video/mp4' });
      return URL.createObjectURL(blob);
    }
    if (Date.now() - start > maxWaitMs) throw new Error('operation_timeout');
    await sleep(3000);
  }
}
