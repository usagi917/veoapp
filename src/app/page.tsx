import React, { useEffect, useState } from 'react';

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  // 初期表示時にローカルストレージからAPIキーを復元
  useEffect(() => {
    try {
      const v = localStorage.getItem('apiKey') ?? '';
      if (typeof v === 'string') setApiKey(v);
    } catch {
      // noop
    }
  }, []);

  async function fileToDataURL(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('file_read_error'));
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(f);
    });
  }

  async function onGenerate() {
    try {
      setError(null);
      setVideoUrl(null);
      if (!file || text.trim().length === 0) {
        setError('画像とテキストを入力してください');
        return;
      }
      setLoading(true);
      const image = await fileToDataURL(file);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, image, text }),
      });
      if (!res.ok) {
        setError('まだ未実装です（501）');
        return;
      }
      const body = (await res.json()) as { videoUrl?: string };
      if (!body.videoUrl) {
        setError('動画URLが取得できませんでした');
        return;
      }
      setVideoUrl(body.videoUrl);
    } catch (e) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>写真 + テキスト → 動画（Simple）</h1>
      <div style={{ display: 'grid', gap: 16 }}>
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
          <label htmlFor="image">画像</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label htmlFor="desc">どんな動画にしたいか（日本語）</label>
          <textarea
            id="desc"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            rows={4}
            style={{ width: '100%' }}
            placeholder="例）優しく自己紹介して、最後に手を振る"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading || !file || !text.trim() || !apiKey.trim()}
          >
            {loading ? '生成中…' : '生成'}
          </button>
        </div>

        {error && (
          <div role="alert" style={{ color: '#900' }}>
            {error}
          </div>
        )}

        {videoUrl && (
          <video src={videoUrl} controls style={{ width: '100%', maxHeight: 360 }} />
        )}
      </div>
    </div>
  );
}
