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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent mb-4 tracking-tight">
            AI 動画生成
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 font-medium">
            写真とテキストから魅力的な動画を生成
          </p>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/30 p-8">
          <div className="space-y-8">
            <div className="space-y-2">
              <label htmlFor="api-key-input" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                APIキー
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 2-9.6 9.6" />
                    <circle cx="7.5" cy="15.5" r="5.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                </div>
                <input
                  id="api-key-input"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    setApiKey(v);
                    try {
                      localStorage.setItem('apiKey', v);
                    } catch {
                      // noop
                    }
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="file-upload" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                画像をアップロード
              </label>
              <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer hover:border-blue-400 ${
                file 
                  ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-900/20' 
                  : 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100/50 dark:hover:bg-slate-600/30'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-3">
                  <div className={`${file ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className={`text-sm font-medium ${
                      file ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {file ? `選択済み: ${file.name}` : 'クリックして画像を選択'}
                    </p>
                    {!file && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="content-textarea" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                動画の内容
              </label>
              <textarea
                id="content-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="どんな動画にしたいか詳しく書いてください。例：優しく自己紹介して、最後に手を振る"
                rows={4}
                className="w-full px-4 py-4 bg-white/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm resize-none"
              />
            </div>

            <button
              type="button"
              onClick={onGenerate}
              disabled={loading || !file || !text.trim() || !apiKey.trim()}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                loading || !file || !text.trim() || !apiKey.trim()
                  ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>動画生成中...</span>
                </div>
              ) : (
                '動画を生成'
              )}
            </button>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {videoUrl && (
              <div className="bg-white/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  生成された動画
                </h3>
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full rounded-lg shadow-lg"
                  aria-label="生成された動画"
                >
                  <track kind="captions" srcLang="ja" label="日本語" />
                  このブラウザは動画をサポートしていません。
                </video>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
