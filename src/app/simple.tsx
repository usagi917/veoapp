import React from 'react';

type GenResponse = { ops?: string[] };
type OpResponse = { done?: boolean; handle?: string };

async function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(b);
  });
}

export default function SimplePage() {
  const [image, setImage] = React.useState<Blob | null>(null);
  const [text, setText] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [handle, setHandle] = React.useState<string | null>(null);
  const [downloadMsg, setDownloadMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem('apiKey') ?? '';
      if (typeof v === 'string') setApiKey(v);
    } catch {
      // noop
    }
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setIsComplete(false);
    setHandle(null);
    const f = e.currentTarget.files?.[0] || null;
    setImage(f);
  }

  async function onGenerate() {
    try {
      setError(null);
      setIsGenerating(true);
      setIsComplete(false);
      setHandle(null);
      const dataUrl = image ? await blobToDataUrl(image) : 'data:image/png;base64,aGVsbG8=';
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          image: dataUrl,
          script: text.trim(),
          lengthSec: 8,
          consent: true,
          csrf: 'dev',
          model: 'veo-3.0-generate-preview',
          aspect: '16:9',
        }),
      });
      if (!res.ok) throw new Error('generate_failed');
      const body = (await res.json()) as GenResponse;
      const ops = Array.isArray(body.ops) ? body.ops : [];
      if (ops.length === 0) throw new Error('no_ops');

      // biome-ignore lint/style/noNonNullAssertion: noNonNullAssertion is not needed
      const id = ops[0]!;
      async function pollOnce(): Promise<boolean> {
        const r = await fetch(`/api/op?id=${encodeURIComponent(id)}`);
        if (!r.ok) return false;
        const o = (await r.json()) as OpResponse;
        if (o.done && o.handle) {
          setHandle(o.handle);
          setIsComplete(true);
          return true;
        }
        return false;
      }
      // 即時1回 + 10秒間隔
      if (await pollOnce()) return;
      const t = setInterval(async () => {
        const ok = await pollOnce();
        if (ok) clearInterval(t);
      }, 10_000);
    } catch (_e) {
      setError('生成に失敗しました');
      setIsGenerating(false);
    }
  }

  async function onDownload() {
    try {
      setDownloadMsg(null);
      const h = handle;
      if (!h) return;
      const r1 = await fetch('/api/download/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: h, csrf: 'dev' }),
      });
      if (!r1.ok) throw new Error('issue_failed');
      const { token } = (await r1.json()) as { token?: string };
      if (!token) throw new Error('no_token');
      const r2 = await fetch(`/api/download?token=${encodeURIComponent(token)}`);
      if (!(r2 as unknown as { ok?: boolean }).ok) throw new Error('download_failed');
      setDownloadMsg('ダウンロードを開始しました');
    } catch {
      setDownloadMsg('ダウンロードに失敗しました');
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1 style={{ margin: 0, marginBottom: 12 }}>Veo3 シンプル生成</h1>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label htmlFor="apiKey">APIキー</label>
          <input
            id="apiKey"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setApiKey(v);
              try {
                localStorage.setItem('apiKey', v);
              } catch {
                // noop
              }
            }}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="photo">写真</label>
          <input id="photo" type="file" accept="image/*" onChange={onFileChange} />
        </div>
        <div>
          <label htmlFor="idea">イメージ</label>
          <textarea
            id="idea"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            rows={3}
            style={{ width: '100%' }}
            placeholder="どんな動画にしたいか日本語で書いてください"
          />
        </div>
        <div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !text.trim() || !apiKey.trim()}
          >
            生成
          </button>
        </div>

        {error && (
          <div role="alert" style={{ color: '#b00020' }}>
            {error}
          </div>
        )}

        <div>
          <div>進行状況</div>
          <ol>
            <li>待機</li>
            <li>生成</li>
            <li>最終化</li>
          </ol>
          {isComplete && <div>生成完了</div>}
        </div>

        {isComplete && handle && (
          <div>
            <button type="button" onClick={onDownload}>ダウンロード</button>
            {downloadMsg && <div>{downloadMsg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
