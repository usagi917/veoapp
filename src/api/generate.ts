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
  let GoogleAI: any;
  try {
    const mod: any = await import('@google/genai');
    // 新SDKは GoogleGenAI をエクスポート
    GoogleAI = mod.GoogleGenAI || mod.GoogleAI || mod.GoogleGenerativeAI || mod.default;
  } catch (e) {
    // フォールバック（将来のパッケージ名差異に備える）。
    try {
      const mod2: any = await import('@google/generative-ai');
      GoogleAI = mod2.GoogleGenAI || mod2.GoogleAI || mod2.GoogleGenerativeAI || mod2.default;
    } catch {
      /* noop */
    }
  }
  if (!GoogleAI) throw new Error('genai_sdk_not_found');
  const client: any = new GoogleAI({ apiKey: args.apiKey });

  const imageBytes = dataUrlToUint8Array(args.imageDataUrl);
  const model = 'veo-3.0-generate-preview';

  // 1) 動画生成ジョブの発行
  let op: any;
  if (client?.models?.generateVideos) {
    op = await client.models.generateVideos({ model, prompt: args.prompt, image: imageBytes });
  } else if (client?.models?.generateVideo) {
    op = await client.models.generateVideo({ model, prompt: args.prompt, image: imageBytes });
  } else if (client?.models?.videos?.generate) {
    op = await client.models.videos.generate({ model, prompt: args.prompt, image: imageBytes });
  } else {
    throw new Error('genai_generate_not_supported');
  }

  // 新SDK では Operation オブジェクトをそのまま渡すのが正しい
  const operationName: string = op?.operation || op?.operationName || op?.name;
  const operationRef: any = op && (op.name || op.operation || op.operationName) ? op : operationName;
  if (!operationRef) throw new Error('operation_name_missing');

  // 2) ポーリング（最大 ~60秒）
  const maxWaitMs = 60_000;
  const start = Date.now();
  for (;;) {
    const ops = client.operations || {};
    const getFn = ops.getVideosOperation || ops.get || ops.status || ops.getOperation;
    if (!getFn) throw new Error('operations_get_not_supported');
    let st: any;
    try {
      // 優先: 新SDK 形式（Operation オブジェクト）
      st = await getFn.call(ops, { operation: operationRef });
    } catch {
      // 文字列でも受け付ける実装にフォールバック
      st = await getFn.call(ops, operationName);
    }

    // 生成済み動画の参照を複数パターンで探索
    const gv = st?.generatedVideos?.[0] || st?.response?.generatedVideos?.[0] || st?.result?.generatedVideos?.[0];
    const fileRef = gv?.video || st?.response?.video || st?.response?.videoUri || st?.video || st?.videoUri;

    const done = Boolean(st?.done ?? st?.response ?? fileRef);
    if (done && fileRef) {
      // 3) 直接URIが返ってくる場合を優先
      if (typeof fileRef === 'string') return fileRef;
      if (typeof fileRef?.uri === 'string') return fileRef.uri;

      // それ以外の場合のみ、可能ならダウンロード（Node向けAPIのため、ブラウザでは通常未対応）
      const files = client.files || {};
      const dl = files.download || files.get || files.read;
      if (dl) {
        let bytes: any;
        const candidate = fileRef?.name || fileRef?.uri || fileRef;
        try {
          bytes = await dl.call(files, { file: candidate, uri: candidate, name: candidate });
        } catch {
          bytes = await dl.call(files, candidate);
        }
        let u8: Uint8Array;
        if (bytes instanceof Uint8Array) u8 = bytes;
        else if (bytes?.arrayBuffer) u8 = new Uint8Array(await bytes.arrayBuffer());
        else if (bytes?.data) u8 = new Uint8Array(bytes.data);
        else u8 = new Uint8Array();
        const blob = new Blob([u8 as unknown as BlobPart], { type: 'video/mp4' });
        return URL.createObjectURL(blob);
      }

      throw new Error('files_download_not_supported');
    }
    if (Date.now() - start > maxWaitMs) throw new Error('operation_timeout');
    await sleep(3000);
  }
}
