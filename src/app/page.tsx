import { useEffect, useState } from 'react';
import { Container, Card, Input, Textarea, Button, Alert } from '../components/ui';

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

  const iconSvg = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  );

  const keyIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/>
      <path d="m21 2-9.6 9.6"/>
      <circle cx="7.5" cy="15.5" r="5.5"/>
    </svg>
  );

  return (
    <div className="gradient-bg" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 0',
    }}>
      <Container maxWidth="md">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="hero-title" style={{ 
            fontSize: '48px',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0 0 16px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            Veo 3 AI 動画生成
          </h1>
          <p className="hero-subtitle" style={{
            fontSize: '18px',
            color: '#f1f5f9',
            margin: 0,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            写真とテキストから魅力的な動画を生成
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Input
              label="APIキー"
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
              icon={keyIcon}
              size="lg"
            />

            <div>
              <label htmlFor="file-upload" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                画像をアップロード
              </label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                backgroundColor: file ? '#f0fdf4' : '#f9fafb',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload" 
                  style={{ 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ color: file ? '#059669' : '#9ca3af' }}>
                    {iconSvg}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    color: file ? '#059669' : '#6b7280',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}>
                    {file ? `選択済み: ${file.name}` : 'クリックして画像を選択'}
                  </span>
                </label>
              </div>
            </div>

            <Textarea
              label="動画の内容"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="どんな動画にしたいか詳しく書いてください。例：優しく自己紹介して、最後に手を振る"
              size="lg"
              rows={4}
            />

            <Button
              onClick={onGenerate}
              disabled={loading || !file || !text.trim() || !apiKey.trim()}
              loading={loading}
              size="lg"
              style={{ width: '100%' }}
            >
              {loading ? '動画生成中...' : '動画を生成'}
            </Button>

            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            {videoUrl && (
              <Card variant="outlined" padding="md">
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '16px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  生成された動画
                </h3>
                <video 
                  src={videoUrl} 
                  controls 
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  aria-label="生成された動画"
                >
                  <track kind="captions" srcLang="ja" label="日本語" />
                  このブラウザは動画をサポートしていません。
                </video>
              </Card>
            )}
          </div>
        </Card>
      </Container>
    </div>
  );
}
