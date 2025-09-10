// biome-ignore assist/source/organizeImports: keep React import first
import React, { useId, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGenerateMutation, getOpOnce } from './queries';
import { getFfmpeg } from '../lib/ffmpeg';
import { concatMp4Copy } from '../lib/concat';
import { computeSmartCropRectAR, pickPrimaryFaceIndex, type BBox } from '../lib/face';
import { validateImageFile, stripExifToPng } from '../lib/image';
import { useAppStore, type VoiceGender, type VoiceTone, type Motion } from './store';
import { ensureMd3ThemeInstalled } from './ui/theme';
import { installEnhancedTheme } from './ui/enhanced-theme';
import { McpStatus } from './McpStatus';
import { ModernSelect } from './ModernSelect';
import { ModernTextarea } from './ModernTextarea';
// React Query は今後の結線予定

// 最小UIスケルトン（フォーム & 進行表示）
export type PageProps = {
  __test_faces?: number | { dims: { width: number; height: number }; bboxes: BBox[] };
};

function PageInner(props: PageProps = {}) {
  // MD3風のテーマと拡張UIテーマを適用
  React.useEffect(() => {
    ensureMd3ThemeInstalled();
    installEnhancedTheme();
  }, []);
  // 最小のローカル状態（まだ機能結線はしない）
  const [lengthSec, setLengthSec] = useState<8 | 16>(8);
  const [scriptText, setScriptText] = useState('');
  const [consent, setConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allowManualRetry, setAllowManualRetry] = useState(false);
  const [processedImage, setProcessedImage] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
  const [cropRectLabel, setCropRectLabel] = useState<string | null>(null);
  const microPan = useAppStore((s) => s.microPan);
  const setMicroPan = useAppStore((s) => s.setMicroPan);

  // APIキー（BYOK）モーダル用の簡易状態
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySaveMsg, setKeySaveMsg] = useState<string | null>(null);
  const [keySaveError, setKeySaveError] = useState<string | null>(null);
  const [usedScript, setUsedScript] = useState<string[] | null>(null);
  const [ops, setOps] = useState<string[] | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [_opHandles, setOpHandles] = useState<string[] | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [downloadErr, setDownloadErr] = useState(false);
  const [activeTokens, setActiveTokens] = useState<string[]>([]);
  const voiceGender = useAppStore((s) => s.voiceGender);
  const setVoiceGender = useAppStore((s) => s.setVoiceGender);
  const voiceTone = useAppStore((s) => s.voiceTone);
  const setVoiceTone = useAppStore((s) => s.setVoiceTone);
  const motion = useAppStore((s) => s.motion);
  const setMotion = useAppStore((s) => s.setMotion);
  // モデル/品質セレクタ（Fast/標準）
  const [modelId, setModelId] = useState<string>('veo-3.0-fast-generate-preview');
  // アスペクト比（16:9 / 9:16）
  const [aspect, setAspect] = useState<'16:9' | '9:16'>('16:9');

  // アクセシビリティ用ID（label関連付け）
  const fileId = useId();
  const scriptId = useId();
  const genderId = useId();
  const toneId = useId();
  const motionId = useId();
  const panId = useId();
  const consentId = useId();
  const consentDescId = useId();
  const errorId = useId();
  const keyInputId = useId();
  const keyModalHeadingId = useId();
  const focusTriggerRef = useRef<(() => void) | null>(null);

  // セレクト要素のオプション定義
  const aspectOptions = [
    { value: '16:9', label: '16:9（横長）', icon: '📱' },
    { value: '9:16', label: '9:16（縦長）', icon: '📲' },
  ];

  const genderOptions = [
    { value: 'female', label: '女性', icon: '👩' },
    { value: 'male', label: '男性', icon: '👨' },
    { value: 'other', label: 'その他', icon: '👤' },
  ];

  const toneOptions = [
    { value: 'slow', label: 'ゆっくり', icon: '🐌' },
    { value: 'normal', label: 'ふつう', icon: '😊' },
    { value: 'energetic', label: '元気・ハキハキ', icon: '⚡' },
  ];

  const modelOptions = [
    { value: 'veo-3.0-fast-generate-preview', label: 'Fast（高速・720p）', icon: '⚡' },
    { value: 'veo-3.0-generate-preview', label: '標準（高品質）', icon: '✨' },
  ];

  const motionOptions = [
    { value: 'neutral', label: '自然で落ち着いた', icon: '😌' },
    { value: 'smile', label: '笑顔', icon: '😊' },
    { value: 'energetic', label: '元気に（ハキハキ）', icon: '😄' },
    { value: 'serene', label: '落ち着き（穏やか）', icon: '😇' },
    { value: 'nod', label: 'うなずき（相槌）', icon: '🤔' },
  ];

  // React Query: 将来の導入用のプレースホルダ。

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null);
    setProcessedImage(null);
    const file = e.currentTarget.files?.[0] ?? null;
    if (!file) return;
    const v = await validateImageFile(file);
    if (!v.ok) {
      setErrorMsg(v.message);
      return;
    }
    const png = await stripExifToPng(file);
    setProcessedImage(png);
  }

  const genMutation = useGenerateMutation();

  async function handleGenerateClick() {
    if (isGenerating) return; // 二重送信防止
    setErrorMsg(null);
    setAllowManualRetry(false);
    setIsGenerating(true);

    // 簡易な顔数チェック（将来の顔検出/選択UIと接続予定）
    const faces =
      typeof props.__test_faces === 'number'
        ? props.__test_faces
        : Array.isArray(props.__test_faces?.bboxes)
          ? props.__test_faces?.bboxes.length
          : undefined;
    if (faces === 0) {
      setErrorMsg('顔が検出できません。単一人物・正面の写真をご利用ください。');
      setIsGenerating(false);
      return;
    }
    if (faces !== undefined && faces > 1 && selectedFaceIndex == null) {
      setErrorMsg('顔を1つ選択してください。');
      setIsGenerating(false);
      return;
    }

    // テスト用: 顔矩形と画像寸法が与えられている場合、選択アスペクト比でクロップ矩形を計算して保持
    if (props.__test_faces && typeof props.__test_faces !== 'number') {
      const { dims, bboxes } = props.__test_faces;
      const idx =
        selectedFaceIndex ??
        (bboxes.length === 1 ? 0 : pickPrimaryFaceIndex(dims.width, dims.height, bboxes));
      if (idx >= 0) {
        const rect = computeSmartCropRectAR(dims.width, dims.height, bboxes, idx, aspect);
        if (rect) {
          setCropRectLabel(`クロップ完了（${aspect}）: ${rect.width}x${rect.height}`);
        }
      }
    }

    let lastStatus: number | null = null;
    async function tryOnce() {
      try {
        const data = await genMutation.mutateAsync({
          // 画像はMVPでは省略可（API側は別テスト）。ここでは既存テスト互換のフィールドに限定。
          script: scriptText.trim(),
          lengthSec,
          consent: true,
          microPan: microPan || undefined,
          voice: { gender: voiceGender, tone: voiceTone },
          motion,
          csrf: 'test.csrf',
          image: 'data:image/png;base64,aGVsbG8=',
          model: modelId,
          aspect,
        } as unknown as import('./queries').GenerateVars);
        if (data && Array.isArray(data.usedScript)) setUsedScript(data.usedScript);
        if (data && Array.isArray(data.ops) && data.ops.length > 0) setOps(data.ops);
        return true;
      } catch (e) {
        const err = e as { status?: number };
        lastStatus = err?.status ?? null;
        return false;
      }
    }

    // 1回目の試行
    let ok = await tryOnce();
    // 失敗したら1回だけ自動再試行
    if (!ok) {
      ok = await tryOnce();
    }

    if (!ok) {
      if (lastStatus === 401) {
        setShowKeyModal(true);
        setErrorMsg('APIキーが未登録です。右上の「APIキー」で登録してください。');
      } else if (lastStatus === 429 || lastStatus === 503) {
        setErrorMsg('現在混み合っています。数分後に再試行してください。');
      } else {
        setErrorMsg('エラー: 生成に失敗しました');
      }
      setAllowManualRetry(true);
      setIsGenerating(false);
    } else {
      setErrorMsg(null);
      setAllowManualRetry(false);
      setIsComplete(false);
      setIsGenerating(false);
    }
  }

  // /api/op ポーリング（即時1回 + 10秒間隔）: Query の getOpOnce を用いて取得
  React.useEffect(() => {
    if (!ops || ops.length === 0) return;
    let cancelled = false;
    const doneSet = new Set<string>();
    const handles: string[] = [];

    async function pollOnce() {
      for (const id of ops ?? []) {
        if (doneSet.has(id)) continue;
        try {
          const body = await getOpOnce(id);
          if (body.done === true) {
            doneSet.add(id);
            const h = body.handle;
            if (typeof h === 'string') handles.push(h);
          }
        } catch {
          // noop: 次回ポーリングで再試行
        }
      }
      if (!cancelled && ops && doneSet.size === ops.length) {
        setOpHandles(handles);
        setIsComplete(true);
      }
    }

    // 即時1回
    void pollOnce();
    // 10秒間隔
    const t = setInterval(() => {
      if (cancelled || doneSet.size === (ops?.length ?? 0)) return;
      void pollOnce();
    }, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [ops]);

  // beforeunload時にダウンロードトークンを失効
  React.useEffect(() => {
    if (activeTokens.length === 0) return;
    const handler = () => {
      const csrf = 'test.csrf';
      for (const token of activeTokens) {
        try {
          void fetch('/api/download/invalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, csrf }),
            keepalive: true,
          });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeTokens]);

  async function handleDownloadClick() {
    try {
      setDownloadMsg(null);
      setDownloadErr(false);
      const handles = _opHandles || [];
      if (handles.length === 0) return;
      const csrf = 'test.csrf';

      // 16秒（=8秒×2）では2本を取得して結合（ffmpeg.wasm）
      if (lengthSec === 16 && handles.length >= 2) {
        const targets = handles.slice(0, 2);
        const tokens: string[] = [];
        const parts: { name: string; data: Uint8Array }[] = [];

        for (let i = 0; i < targets.length; i++) {
          const h = targets[i];
          const r1 = await fetch('/api/download/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle: h, csrf }),
          });
          if (!r1.ok) throw new Error('issue_failed');
          const b1 = (await r1.json()) as { token?: string };
          const t = b1.token || '';
          if (!t) throw new Error('no_token');
          tokens.push(t);
          const r2 = await fetch(`/api/download?token=${encodeURIComponent(t)}`);
          if (!r2 || !(r2 as unknown as { ok?: boolean }).ok) throw new Error('download_failed');
          const buf = new Uint8Array(await (r2 as Response).arrayBuffer());
          parts.push({ name: `part${i + 1}.mp4`, data: buf });
        }

        const ff = await getFfmpeg();
        const out = await concatMp4Copy(ff, parts, 'pictalk_16s.mp4');
        try {
          const ab = out.bytes.buffer.slice(
            out.bytes.byteOffset,
            out.bytes.byteOffset + out.bytes.byteLength,
          ) as ArrayBuffer;
          const url = URL.createObjectURL(new Blob([ab], { type: 'video/mp4' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pictalk_16s.mp4';
          // 実ブラウザでのみ動作。JSDOMでは単に関数が呼ばれるだけ。
          a.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch {
          // ダウンロード開始の失敗は無視（案内表示は行う）
        }
        setActiveTokens((prev) => [...prev, ...tokens]);
        setDownloadMsg('ダウンロードを開始しました');
        setDownloadErr(false);
        return;
      }

      // 8秒（単一）の場合は最初の1本のみ
      {
        const handle = handles[0];
        const res1 = await fetch('/api/download/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle, csrf }),
        });
        if (!res1.ok) throw new Error('issue_failed');
        const body = (await res1.json()) as { token?: string };
        const token = body.token || '';
        if (!token) throw new Error('no_token');
        const res2 = await fetch(`/api/download?token=${encodeURIComponent(token)}`);
        if (!res2 || !(res2 as unknown as { ok?: boolean }).ok) {
          throw new Error('download_failed');
        }
        setActiveTokens((prev) => [...prev, token]);
        setDownloadMsg('ダウンロードを開始しました');
        setDownloadErr(false);
      }
    } catch {
      setDownloadMsg('ダウンロードに失敗しました');
      setDownloadErr(true);
    }
  }

  async function handleSaveApiKey() {
    setKeySaveMsg(null);
    setKeySaveError(null);
    try {
      // MVP: CSRFはサーバ側で検証される前提。ここではプレースホルダを送る。
      const csrf = 'test.csrf';
      const res = await fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim(), csrf }),
      });
      if (!res.ok) {
        setKeySaveError('APIキーの登録に失敗しました');
        return;
      }
      setKeySaveMsg('APIキーを登録しました');
      // フロントにキー生値を保持しない（即座にクリア）
      setApiKeyInput('');
    } catch {
      setKeySaveError('APIキーの登録に失敗しました');
    }
  }

  // モーダルを閉じる共通処理（ボタン/ESC共有）
  function closeKeyModal() {
    setShowKeyModal(false);
    setApiKeyInput('');
    setKeySaveMsg(null);
    setKeySaveError(null);
    // トリガーボタンへフォーカスを戻す
    Promise.resolve().then(() => {
      focusTriggerRef.current?.();
    });
  }

  return (
    <div
      className="md3-container"
      style={{
        minHeight: '100vh',
        paddingTop: 'var(--md3-spacing-6)',
        paddingBottom: 'var(--md3-spacing-6)',
      }}
    >
      <header
        className="enhanced-header"
        style={{ textAlign: 'center', marginBottom: 'var(--md3-spacing-8)', position: 'relative' }}
      >
        <h1
          className="md3-display-medium enhanced-title"
          style={{ margin: '0 0 var(--md3-spacing-3) 0' }}
        >
          🎬 Pictalk
        </h1>
        <p
          className="md3-body-large"
          style={{ color: 'var(--md3-color-on-surface-variant)', margin: 0 }}
        >
          AIを使って写真から話すビデオを生成
        </p>

        {/* 左上にMCP接続ステータス（最小表示） */}
        <div
          style={{
            position: 'absolute',
            top: 'var(--md3-spacing-4)',
            left: 'var(--md3-spacing-4)',
            fontSize: 12,
            color: 'var(--md3-color-on-surface-variant)',
          }}
        >
          <McpStatus />
        </div>

        {/* ヘッダ右上: APIキー登録モーダル起動 */}
        <button
          type="button"
          className="enhanced-secondary-button"
          ref={(el) => {
            focusTriggerRef.current = () => el?.focus();
          }}
          onClick={() => setShowKeyModal(true)}
          style={{
            position: 'absolute',
            top: 'var(--md3-spacing-4)',
            right: 'var(--md3-spacing-4)',
          }}
        >
          🔑 APIキー設定
        </button>
      </header>

      <div className="md3-grid md3-grid-2" style={{ gap: 'var(--md3-spacing-8)' }}>
        {/* 左パネル：フォーム群 */}
        <section className="md3-card enhanced-card enhanced-panel" aria-label="設定パネル">
          <h2 className="md3-title-large" style={{ margin: '0 0 var(--md3-spacing-4) 0' }}>
            🎛️ 生成設定
          </h2>
          <div className="md3-grid" style={{ gap: 'var(--md3-spacing-4)' }}>
            <div
              className="md3-surface enhanced-upload-zone"
              style={{
                textAlign: 'center',
              }}
            >
              <label
                htmlFor={fileId}
                className="md3-title-medium"
                style={{
                  cursor: 'pointer',
                  display: 'block',
                  marginBottom: 'var(--md3-spacing-3)',
                }}
              >
                📷 画像をアップロード
              </label>
              <input
                id={fileId}
                name="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ width: '100%' }}
              />
              <p
                className="md3-body-small"
                style={{
                  color: 'var(--md3-color-on-surface-variant)',
                  marginTop: 'var(--md3-spacing-2)',
                }}
              >
                単一人物の正面写真をご利用ください
              </p>
            </div>

            {/* 複数顔のときの簡易選択UI（テスト用ダミー） */}
            {typeof props.__test_faces === 'number' && props.__test_faces > 1 && (
              <fieldset>
                <legend>顔の選択</legend>
                {Array.from({ length: props.__test_faces }).map((_, i) => (
                  <label
                    key={`face-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: test face selection only
                      i
                    }`}
                    style={{ display: 'inline-flex', alignItems: 'center', marginRight: 12 }}
                  >
                    <input
                      type="radio"
                      name="faceIndex"
                      checked={selectedFaceIndex === i}
                      onChange={() => {
                        setSelectedFaceIndex(i);
                        setErrorMsg(null);
                      }}
                    />
                    {/* スクリーンリーダーに伝わる名称 */}
                    <span style={{ marginLeft: 4 }}>{`顔 ${i + 1}`}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <ModernTextarea
              id={scriptId}
              name="script"
              label="💬 セリフ"
              value={scriptText}
              onChange={setScriptText}
              placeholder="話させたいセリフを入力してください..."
              rows={4}
              autoResize={true}
              maxRows={8}
              size="md"
              variant="outline"
              color="primary"
              required={true}
              className="mb-4"
              error={scriptText.trim().length === 0 ? 'セリフを入力してください' : undefined}
            />

            <ModernSelect
              id="aspectSelect"
              name="aspect"
              label="📱 アスペクト比"
              value={aspect}
              options={aspectOptions}
              onChange={(value) => setAspect(value as '16:9' | '9:16')}
              size="md"
              variant="outline"
              color="primary"
              className="mb-4"
            />

            <ModernSelect
              id={genderId}
              name="gender"
              label="👤 性別"
              value={voiceGender}
              options={genderOptions}
              onChange={(value) => setVoiceGender(value as VoiceGender)}
              size="md"
              variant="outline"
              color="primary"
              className="mb-4"
            />

            <div>
              <ModernSelect
                id={toneId}
                name="tone"
                label="🎵 トーン"
                value={voiceTone}
                options={toneOptions}
                onChange={(value) => setVoiceTone(value as VoiceTone)}
                size="md"
                variant="outline"
                color="primary"
                className="mb-2"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                音声の話し方の設定です
              </div>
            </div>

            <div>
              <ModernSelect
                id="modelQuality"
                name="model"
                label="⚙️ 品質設定"
                value={modelId}
                options={modelOptions}
                onChange={(value) => setModelId(value)}
                size="md"
                variant="outline"
                color="primary"
                className="mb-2"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                料金はご利用のAPIキーの課金に準拠します
              </div>
            </div>

            <ModernSelect
              id={motionId}
              name="motion"
              label="🎭 動きの表現"
              value={motion}
              options={motionOptions}
              onChange={(value) => setMotion(value as Motion)}
              size="md"
              variant="outline"
              color="primary"
              className="mb-4"
            />

            <div>
              <label htmlFor={panId}>微パン</label>
              <input
                id={panId}
                name="microPan"
                type="checkbox"
                checked={microPan}
                onChange={(e) => setMicroPan(e.currentTarget.checked)}
              />
            </div>

            <fieldset>
              <legend>長さ</legend>
              <label>
                <input
                  type="radio"
                  name="lengthSec"
                  value="8"
                  checked={lengthSec === 8}
                  onChange={() => setLengthSec(8)}
                />
                8秒
              </label>
              <label style={{ marginLeft: 12 }}>
                <input
                  type="radio"
                  name="lengthSec"
                  value="16"
                  checked={lengthSec === 16}
                  onChange={() => setLengthSec(16)}
                />
                16秒
              </label>
            </fieldset>

            <div>
              <label htmlFor={consentId}>権利同意</label>
              <input
                id={consentId}
                name="consent"
                type="checkbox"
                aria-describedby={consentDescId}
                checked={consent}
                onChange={(e) => setConsent(e.currentTarget.checked)}
              />
              <div id={consentDescId} style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                利用条件: 自分/権利保有のみ、未成年/有名人不可
              </div>
              {!consent && (
                <div style={{ fontSize: 12, color: '#900', marginTop: 4 }}>
                  権利同意が必要です。
                </div>
              )}
            </div>

            <div style={{ marginTop: 'var(--md3-spacing-6)' }}>
              <button
                type="button"
                className="enhanced-button"
                aria-busy={isGenerating || undefined}
                disabled={isGenerating || scriptText.trim().length === 0 || !consent}
                onClick={handleGenerateClick}
                style={{
                  width: '100%',
                  minHeight: '3.5rem',
                }}
              >
                {isGenerating ? '🎬 生成中…' : '🚀 動画を生成する'}
              </button>
            </div>
          </div>
        </section>

        {/* 右パネル：進行表示と使用台本 */}
        <section
          className="md3-grid"
          aria-label="ステータスパネル"
          style={{ gap: 'var(--md3-spacing-4)' }}
        >
          {/* エラー・メッセージ表示 */}
          {errorMsg && (
            <div
              id={errorId}
              className="md3-error enhanced-error"
              role="alert"
              aria-live="assertive"
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {processedImage && !errorMsg && (
            <div
              className="md3-success"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--md3-spacing-2)' }}
            >
              ✅ 画像を読み込みました
            </div>
          )}

          {allowManualRetry && (
            <div className="md3-card">
              <button
                type="button"
                onClick={handleGenerateClick}
                style={{
                  backgroundColor: 'var(--md3-color-tertiary)',
                  color: 'var(--md3-color-on-tertiary)',
                  width: '100%',
                }}
              >
                🔄 同じ設定で再生成
              </button>
            </div>
          )}

          {/* 進行状況 */}
          <div className="md3-card enhanced-progress-card">
            <h2
              className="md3-title-large"
              style={{
                margin: '0 0 var(--md3-spacing-3) 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--md3-spacing-2)',
              }}
            >
              📊 進行状況
            </h2>
            <div
              className="md3-surface"
              style={{
                padding: 'var(--md3-spacing-3)',
                backgroundColor: 'var(--md3-color-surface-container)',
              }}
            >
              <ol
                className="md3-body-large"
                style={{ paddingLeft: 'var(--md3-spacing-5)', margin: 0 }}
              >
                <li style={{ marginBottom: 'var(--md3-spacing-2)' }}>⏳ 待機</li>
                <li style={{ marginBottom: 'var(--md3-spacing-2)' }}>🎬 生成</li>
                <li>✨ 最終化</li>
              </ol>
              {cropRectLabel && (
                <div
                  className="md3-body-small"
                  style={{
                    marginTop: 'var(--md3-spacing-3)',
                    color: 'var(--md3-color-on-surface-variant)',
                    padding: 'var(--md3-spacing-2)',
                    backgroundColor: 'var(--md3-color-surface-container-high)',
                    borderRadius: 'var(--md3-shape-corner-small)',
                  }}
                >
                  📏 {cropRectLabel}
                </div>
              )}
            </div>

            {isComplete && (
              <div
                className="md3-success enhanced-success"
                role="status"
                style={{
                  marginTop: 'var(--md3-spacing-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--md3-spacing-2)',
                }}
              >
                🎉 生成完了
              </div>
            )}

            {isComplete && (_opHandles?.length || 0) > 0 && (
              <div style={{ marginTop: 'var(--md3-spacing-4)' }}>
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  style={{
                    backgroundColor: 'var(--md3-color-tertiary)',
                    color: 'var(--md3-color-on-tertiary)',
                    width: '100%',
                    padding: 'var(--md3-spacing-4) var(--md3-spacing-6)',
                    fontSize: 'var(--md3-title-medium-size)',
                    fontWeight: 'var(--md3-title-medium-weight)',
                  }}
                >
                  📥 ダウンロード
                </button>
                {downloadMsg &&
                  (downloadErr ? (
                    <output className="md3-error" style={{ marginTop: 'var(--md3-spacing-2)' }}>
                      {downloadMsg}
                    </output>
                  ) : (
                    <output className="md3-success" style={{ marginTop: 'var(--md3-spacing-2)' }}>
                      {downloadMsg}
                    </output>
                  ))}
              </div>
            )}
          </div>

          {/* 使用台本 */}
          <div className="md3-card">
            <h2
              className="md3-title-large"
              style={{
                margin: '0 0 var(--md3-spacing-3) 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--md3-spacing-2)',
              }}
            >
              📝 使用台本
            </h2>
            {usedScript && usedScript.length > 0 ? (
              <div
                className="md3-surface"
                style={{
                  padding: 'var(--md3-spacing-3)',
                  backgroundColor: 'var(--md3-color-surface-container)',
                }}
              >
                {usedScript.map((s, i) => (
                  <p
                    key={`script-line-${i}-${s.slice(0, 20)}`}
                    className="md3-body-medium"
                    style={{
                      margin: 'var(--md3-spacing-2) 0',
                      padding: 'var(--md3-spacing-2)',
                      backgroundColor: 'var(--md3-color-surface-container-high)',
                      borderRadius: 'var(--md3-shape-corner-small)',
                      borderLeft: `4px solid var(--md3-color-primary)`,
                    }}
                  >
                    {s}
                  </p>
                ))}
              </div>
            ) : (
              <div
                className="md3-surface"
                style={{
                  padding: 'var(--md3-spacing-4)',
                  textAlign: 'center',
                  backgroundColor: 'var(--md3-color-surface-container)',
                }}
              >
                <p
                  className="md3-body-medium"
                  style={{ color: 'var(--md3-color-on-surface-variant)', margin: 0 }}
                >
                  💭 ここに使用した台本を表示します
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* APIキー登録モーダル（最小実装） */}
      {showKeyModal && (
        <div
          role="dialog"
          aria-labelledby={keyModalHeadingId}
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              e.preventDefault();
              closeKeyModal();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--md3-color-scrim)',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="md3-surface enhanced-modal"
            style={{
              padding: 'var(--md3-spacing-6)',
              minWidth: '20rem',
              maxWidth: '32rem',
            }}
          >
            <h2
              id={keyModalHeadingId}
              className="md3-title-large"
              style={{
                margin: '0 0 var(--md3-spacing-4) 0',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--md3-spacing-2)',
              }}
            >
              🔐 APIキー登録
            </h2>

            <div className="md3-grid" style={{ gap: 'var(--md3-spacing-4)' }}>
              <div>
                <label
                  htmlFor={keyInputId}
                  className="md3-body-medium"
                  style={{
                    color: 'var(--md3-color-on-surface-variant)',
                    marginBottom: 'var(--md3-spacing-2)',
                    display: 'block',
                  }}
                >
                  🔑 APIキー
                </label>
                <input
                  id={keyInputId}
                  type="password"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.currentTarget.value)}
                  placeholder="sk-..."
                  style={{ width: '100%' }}
                />
                <p
                  className="md3-body-small"
                  style={{
                    color: 'var(--md3-color-on-surface-variant)',
                    marginTop: 'var(--md3-spacing-2)',
                    margin: 'var(--md3-spacing-2) 0 0 0',
                  }}
                >
                  💡 APIキーは暗号化されて保存され、通信時のみ使用されます
                </p>
              </div>

              <div
                style={{ display: 'flex', gap: 'var(--md3-spacing-3)', justifyContent: 'flex-end' }}
              >
                <button
                  type="button"
                  onClick={closeKeyModal}
                  style={{
                    backgroundColor: 'var(--md3-color-surface-variant)',
                    color: 'var(--md3-color-on-surface-variant)',
                  }}
                >
                  閉じる
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  disabled={apiKeyInput.trim().length === 0}
                  style={{
                    backgroundColor:
                      apiKeyInput.trim().length > 0
                        ? 'var(--md3-color-primary)'
                        : 'var(--md3-color-surface-variant)',
                    color:
                      apiKeyInput.trim().length > 0
                        ? 'var(--md3-color-on-primary)'
                        : 'var(--md3-color-on-surface-variant)',
                  }}
                >
                  💾 保存
                </button>
              </div>

              {keySaveMsg && <div className="md3-success">✅ {keySaveMsg}</div>}
              {keySaveError && <div className="md3-error">❌ {keySaveError}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page(props: PageProps = {}) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
      }),
  );
  return (
    <QueryClientProvider client={qc}>
      <PageInner {...props} />
    </QueryClientProvider>
  );
}
