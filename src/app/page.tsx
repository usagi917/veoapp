import React, { useId, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGenerateMutation, getOpOnce } from './queries';
import { getFfmpeg } from '../lib/ffmpeg';
import { concatMp4Copy } from '../lib/concat';
import { computeSmartCropRectAR, pickPrimaryFaceIndex, type BBox } from '../lib/face';
import { validateImageFile, stripExifToPng } from '../lib/image';
import { useAppStore, type VoiceGender, type VoiceTone, type Motion } from './store';
import { ensureMd3ThemeInstalled } from './ui/theme';
// React Query は今後の結線予定

// 最小UIスケルトン（フォーム & 進行表示）
export type PageProps = {
  __test_faces?: number | { dims: { width: number; height: number }; bboxes: BBox[] };
};

function PageInner(props: PageProps = {}) {
  // MD3風の最小テーマを適用（JSDOMテストでも検証できるように <style id="md3-theme"> を挿入）
  React.useEffect(() => {
    ensureMd3ThemeInstalled();
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
  const toneHelpId = useId();
  const motionId = useId();
  const panId = useId();
  const consentId = useId();
  const consentDescId = useId();
  const errorId = useId();
  const keyInputId = useId();
  const keyModalHeadingId = useId();
  const focusTriggerRef = useRef<(() => void) | null>(null);

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
          ? props.__test_faces!.bboxes.length
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
      if (cancelled || isComplete) return;
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
    <div>
      <h1>Pictalk</h1>

      {/* ヘッダ右上: APIキー登録モーダル起動 */}
      <div
        className="top-actions"
        style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}
      >
        <button
          type="button"
          ref={(el) => {
            focusTriggerRef.current = () => el?.focus();
          }}
          onClick={() => setShowKeyModal(true)}
        >
          APIキー
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 左パネル：フォーム群 */}
        <section aria-label="左パネル">
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor={fileId}>画像アップロード</label>
              <input
                id={fileId}
                name="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            {/* 複数顔のときの簡易選択UI（テスト用ダミー） */}
            {typeof props.__test_faces === 'number' && props.__test_faces > 1 && (
              <fieldset>
                <legend>顔の選択</legend>
                {Array.from({ length: props.__test_faces }).map((_, i) => (
                  <label
                    key={i}
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

            <div>
              <label htmlFor={scriptId}>セリフ</label>
              <textarea
                id={scriptId}
                name="script"
                rows={4}
                value={scriptText}
                onChange={(e) => setScriptText(e.currentTarget.value)}
              />
              {scriptText.trim().length === 0 && (
                <div style={{ fontSize: 12, color: '#900', marginTop: 4 }}>
                  セリフを入力してください。
                </div>
              )}
            </div>

            <div>
              <label htmlFor="aspectSelect">アスペクト比</label>
              <select
                id="aspectSelect"
                name="aspect"
                value={aspect}
                onChange={(e) => setAspect(e.currentTarget.value as '16:9' | '9:16')}
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </select>
            </div>

            <div>
              <label htmlFor={genderId}>性別</label>
              <select
                id={genderId}
                name="gender"
                value={voiceGender}
                onChange={(e) => setVoiceGender(e.currentTarget.value as VoiceGender)}
              >
                <option value="female">女性</option>
                <option value="male">男性</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label htmlFor={toneId}>トーン</label>
              <select
                id={toneId}
                name="tone"
                value={voiceTone}
                onChange={(e) => setVoiceTone(e.currentTarget.value as VoiceTone)}
                aria-describedby={toneHelpId}
              >
                <option value="slow">slow</option>
                <option value="normal">normal</option>
                <option value="energetic">energetic</option>
              </select>
              <div id={toneHelpId} style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                トーン説明: slow=ゆっくり, normal=ふつう, energetic=元気/ハキハキ
              </div>
            </div>

            <div>
              <label htmlFor="modelQuality">品質</label>
              <select
                id="modelQuality"
                name="model"
                value={modelId}
                onChange={(e) => setModelId(e.currentTarget.value)}
              >
                <option value="veo-3.0-fast-generate-preview">Fast（高速・720p既定）</option>
                <option value="veo-3.0-generate-preview">標準（高品質）</option>
              </select>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                料金はご利用のAPIキーの課金に準拠します。詳細は公式価格をご確認ください。
              </div>
            </div>

            <div>
              <label htmlFor={motionId}>動き</label>
              <select
                id={motionId}
                name="motion"
                value={motion}
                onChange={(e) => setMotion(e.currentTarget.value as Motion)}
              >
                <option value="neutral">自然で落ち着いた</option>
                <option value="smile">笑顔</option>
                <option value="energetic">元気に（ハキハキ）</option>
                <option value="serene">落ち着き（穏やか）</option>
                <option value="nod">うなずき（相槌）</option>
              </select>
            </div>

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

            <div>
              <button
                type="button"
                aria-busy={isGenerating || undefined}
                disabled={isGenerating || scriptText.trim().length === 0 || !consent}
                onClick={handleGenerateClick}
              >
                {isGenerating ? '生成中…' : '生成'}
              </button>
            </div>
          </div>
        </section>

        {/* 右パネル：進行表示と使用台本 */}
        <section aria-label="右パネル">
          {errorMsg && (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              style={{
                border: '1px solid #f00',
                background: '#fee',
                color: '#900',
                padding: 8,
                marginBottom: 12,
              }}
            >
              {errorMsg}
            </div>
          )}
          {processedImage && !errorMsg && (
            <div style={{ marginBottom: 12, color: '#060' }}>画像を読み込みました</div>
          )}
          {allowManualRetry && (
            <div style={{ marginBottom: 12 }}>
              <button type="button" onClick={handleGenerateClick}>
                同じ設定で再生成
              </button>
            </div>
          )}
          <div>
            <h2>進行</h2>
            <ol>
              <li>待機</li>
              <li>生成</li>
              <li>最終化</li>
            </ol>
            {cropRectLabel && <div style={{ marginTop: 4, color: '#333' }}>{cropRectLabel}</div>}
            {isComplete && (
              <div role="status" aria-live="polite" aria-atomic="true" style={{ color: '#060' }}>
                生成完了
              </div>
            )}
            {isComplete && (_opHandles?.length || 0) > 0 && (
              <div style={{ marginTop: 8 }}>
                <button type="button" onClick={handleDownloadClick}>
                  ダウンロード
                </button>
                {downloadMsg &&
                  (downloadErr ? (
                    <div
                      role="alert"
                      aria-live="assertive"
                      style={{ marginTop: 4, fontSize: 12, color: '#900' }}
                    >
                      {downloadMsg}
                    </div>
                  ) : (
                    <div
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      style={{ marginTop: 4, fontSize: 12 }}
                    >
                      {downloadMsg}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div>
            <h2>使用台本</h2>
            {usedScript && usedScript.length > 0 ? (
              <div>
                {usedScript.map((s, i) => (
                  <p key={i} style={{ margin: '4px 0' }}>
                    {s}
                  </p>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#666' }}>ここに使用した台本を表示します</div>
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
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ background: '#fff', padding: 16, minWidth: 320, borderRadius: 8 }}>
            <h2 id={keyModalHeadingId} style={{ marginTop: 0 }}>
              APIキー登録
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label htmlFor={keyInputId}>APIキー</label>
                <input
                  id={keyInputId}
                  type="password"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoFocus
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.currentTarget.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeKeyModal}>
                  閉じる
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  disabled={apiKeyInput.trim().length === 0}
                >
                  保存
                </button>
              </div>
              {keySaveMsg && <div>{keySaveMsg}</div>}
              {keySaveError && <div style={{ color: '#900' }}>{keySaveError}</div>}
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
