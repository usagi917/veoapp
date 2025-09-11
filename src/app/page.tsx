import { useEffect, useState } from 'react';

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
        try {
          const err = await res.json();
          const msg = err?.message || err?.error || '生成に失敗しました';
          setError(String(msg));
        } catch {
          setError('生成に失敗しました');
        }
        return;
      }
      const body = (await res.json()) as { videoUrl?: string };
      if (!body.videoUrl) {
        setError('動画URLが取得できませんでした');
        return;
      }
      setVideoUrl(body.videoUrl);
    } catch (e) {
      console.error('Generation error:', e);
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };


  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <header className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">AI 動画生成</h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">写真とテキストから魅力的な動画を生成</p>
        </header>

        <section className="card p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="api-key-input" className="field-label mb-1">APIキー</label>
              <input
                id="api-key-input"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => {
                  const v = e.target.value;
                  setApiKey(v);
                  try { localStorage.setItem('apiKey', v); } catch {}
                }}
                className="text-input"
              />
            </div>

            <div>
              <label htmlFor="file-upload" className="field-label mb-1">画像</label>
              <div className="flex items-center gap-3">
                <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <label htmlFor="file-upload" className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer select-none transition">画像を選択</label>
                <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{file ? file.name : '未選択'}</span>
              </div>
            </div>

            <div>
              <label htmlFor="content-textarea" className="field-label mb-1">動画の内容</label>
              <textarea
                id="content-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="どんな動画にしたいか簡潔に。例：優しく自己紹介して、最後に手を振る"
                rows={4}
                className="text-input resize-none"
              />
            </div>

            <button
              type="button"
              onClick={onGenerate}
              disabled={loading || !file || !text.trim() || !apiKey.trim()}
              className="btn-primary"
            >
              {loading ? '生成中…' : '動画を生成'}
            </button>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {videoUrl && (
              <div className="mt-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">生成された動画</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-black">
                  <video src={videoUrl} controls className="w-full" aria-label="生成された動画">
                    <track kind="captions" srcLang="ja" label="日本語" />
                    このブラウザは動画をサポートしていません。
                  </video>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
