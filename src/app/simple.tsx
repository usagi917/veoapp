import React from 'react';
import { Container, Card, Input, Textarea, Button, Alert, Progress } from '../components/ui';

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

  const getProgressValue = () => {
    if (isComplete) return 3;
    if (isGenerating) return 2;
    return 1;
  };

  const getProgressStatus = () => {
    if (isComplete) return '生成完了！動画の準備ができました';
    if (isGenerating) return '動画を生成中です...';
    return '生成の準備完了';
  };

  const keyIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>API Key Icon</title>
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/>
      <path d="m21 2-9.6 9.6"/>
      <circle cx="7.5" cy="15.5" r="5.5"/>
    </svg>
  );

  const photoIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Photo Icon</title>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  );

  const downloadIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Download Icon</title>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );

  return (
    <div className="gradient-bg" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      padding: '32px 0',
    }}>
      <Container maxWidth="md">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="hero-title" style={{ 
            fontSize: '36px',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0 0 12px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            Veo 3 シンプル生成
          </h1>
          <p className="hero-subtitle" style={{
            fontSize: '16px',
            color: '#e0e7ff',
            margin: 0,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            高度な設定で本格的な動画を生成
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Input
              label="APIキー"
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
              icon={keyIcon}
              size="md"
            />

            <div>
              <label htmlFor="photo-upload" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                写真をアップロード
              </label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: image ? '#f0fdf4' : '#f9fafb',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  style={{ display: 'none' }}
                  id="photo-upload"
                />
                <label 
                  htmlFor="photo-upload" 
                  style={{ 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div style={{ color: image ? '#059669' : '#9ca3af' }}>
                    {photoIcon}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    color: image ? '#059669' : '#6b7280',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}>
                    {image ? `選択済み: ${(image as File).name}` : 'クリックして写真を選択'}
                  </span>
                </label>
              </div>
            </div>

            <Textarea
              label="動画のイメージ"
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              placeholder="どんな動画にしたいか日本語で詳しく書いてください"
              size="md"
              rows={3}
            />

            <Button
              onClick={onGenerate}
              disabled={isGenerating || !text.trim() || !apiKey.trim()}
              loading={isGenerating}
              size="md"
              style={{ width: '100%' }}
            >
              {isGenerating ? '生成中...' : '動画を生成'}
            </Button>

            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <Card variant="outlined" padding="md">
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                生成ステータス
              </h3>
              <Progress
                value={getProgressValue()}
                max={3}
                color={isComplete ? 'success' : isGenerating ? 'primary' : 'warning'}
                showLabel={false}
              />
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginTop: '8px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                {getProgressStatus()}
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                fontSize: '12px',
                color: '#9ca3af',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                <span style={{ color: getProgressValue() >= 1 ? '#10b981' : '#9ca3af' }}>
                  1. 待機
                </span>
                <span style={{ color: getProgressValue() >= 2 ? '#10b981' : '#9ca3af' }}>
                  2. 生成
                </span>
                <span style={{ color: getProgressValue() >= 3 ? '#10b981' : '#9ca3af' }}>
                  3. 完了
                </span>
              </div>
            </Card>

            {isComplete && handle && (
              <Card variant="outlined" padding="md">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}>
                    動画の準備完了
                  </h3>
                  <Button
                    onClick={onDownload}
                    variant="secondary"
                    size="md"
                    icon={downloadIcon}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    ダウンロード
                  </Button>
                  {downloadMsg && (
                    <Alert variant={downloadMsg.includes('成功') || downloadMsg.includes('開始') ? 'success' : 'error'}>
                      {downloadMsg}
                    </Alert>
                  )}
                </div>
              </Card>
            )}
          </div>
        </Card>
      </Container>
    </div>
  );
}
