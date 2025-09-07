import React, { useId, useState } from 'react';
import { validateImageFile, stripExifToPng } from '../lib/image';

// 最小UIスケルトン（フォーム & 進行表示）
export type PageProps = { __test_faces?: number };

export default function Page(props: PageProps = {}) {
  // 最小のローカル状態（まだ機能結線はしない）
  const [lengthSec, setLengthSec] = useState<8 | 16>(8);
  const [scriptText, setScriptText] = useState('');
  const [consent, setConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allowManualRetry, setAllowManualRetry] = useState(false);
  const [processedImage, setProcessedImage] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
  const [activeTokens, setActiveTokens] = useState<string[]>([]);

  // アクセシビリティ用ID（label関連付け）
  const fileId = useId();
  const scriptId = useId();
  const genderId = useId();
  const toneId = useId();
  const toneHelpId = useId();
  const motionId = useId();
  const panId = useId();
  const consentId = useId();
  const errorId = useId();
  const keyInputId = useId();

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

  async function handleGenerateClick() {
    if (isGenerating) return; // 二重送信防止
    setErrorMsg(null);
    setAllowManualRetry(false);
    setIsGenerating(true);

    // 簡易な顔数チェック（将来の顔検出/選択UIと接続予定）
    const faces = typeof props.__test_faces === 'number' ? props.__test_faces : undefined;
    if (faces === 0) {
      setErrorMsg('顔が検出できません。単一人物・正面の写真をご利用ください。');
      setIsGenerating(false);
      return;
    }
    if (faces !== undefined && faces > 1) {
      setErrorMsg('顔を1つ選択してください。');
      setIsGenerating(false);
      return;
    }

    let lastStatus: number | null = null;
    async function tryOnce() {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: scriptText.trim(),
            lengthSec,
            consent,
          }),
        });
        if (!res.ok) {
          lastStatus = res.status;
          return false;
        }
        const data = (await res.json().catch(() => ({}))) as {
          usedScript?: string[];
          ops?: string[];
        };
        if (data && Array.isArray(data.usedScript)) {
          setUsedScript(data.usedScript);
        }
        if (data && Array.isArray(data.ops) && data.ops.length > 0) {
          setOps(data.ops);
        }
        return true;
      } catch {
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

  // /api/op ポーリング（即時1回 + 10秒間隔）
  React.useEffect(() => {
    if (!ops || ops.length === 0) return;
    let cancelled = false;
    const doneSet = new Set<string>();
    const handles: string[] = [];

    async function pollOnce() {
      for (const id of ops ?? []) {
        if (doneSet.has(id)) continue;
        try {
          const res = await fetch(`/api/op?id=${encodeURIComponent(id)}`);
          if (!res.ok) continue;
          const body = (await res.json()) as { done?: boolean; handle?: string };
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
      const handles = _opHandles || [];
      if (handles.length === 0) return;
      // MVP: 最初の1本をダウンロード開始
      const handle = handles[0];
      const csrf = 'test.csrf';
      const res1 = await fetch('/api/download/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, csrf }),
      });
      if (!res1.ok) throw new Error('issue_failed');
      const body = (await res1.json()) as { token?: string };
      const token = body.token || '';
      if (!token) throw new Error('no_token');
      await fetch(`/api/download?token=${encodeURIComponent(token)}`);
      setActiveTokens((prev) => [...prev, token]);
      setDownloadMsg('ダウンロードを開始しました');
    } catch {
      setDownloadMsg('ダウンロードに失敗しました');
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

  return (
    <div>
      <h1>Pictalk</h1>

      {/* ヘッダ右上: APIキー登録モーダル起動 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button type="button" onClick={() => setShowKeyModal(true)}>
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
              <label htmlFor={genderId}>性別</label>
              <select id={genderId} name="gender" defaultValue="female">
                <option value="female">女性</option>
                <option value="male">男性</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label htmlFor={toneId}>トーン</label>
              <select id={toneId} name="tone" defaultValue="normal" aria-describedby={toneHelpId}>
                <option value="slow">slow</option>
                <option value="normal">normal</option>
                <option value="energetic">energetic</option>
              </select>
              <div id={toneHelpId} style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                トーン説明: slow=ゆっくり, normal=ふつう, energetic=元気/ハキハキ
              </div>
            </div>

            <div>
              <label htmlFor={motionId}>動き</label>
              <select id={motionId} name="motion" defaultValue="neutral">
                <option value="neutral">自然で落ち着いた</option>
                <option value="smile">笑顔</option>
              </select>
            </div>

            <div>
              <label htmlFor={panId}>微パン</label>
              <input id={panId} name="microPan" type="checkbox" />
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
                checked={consent}
                onChange={(e) => setConsent(e.currentTarget.checked)}
              />
              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
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
                {downloadMsg && <div style={{ marginTop: 4, fontSize: 12 }}>{downloadMsg}</div>}
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
          aria-label="APIキー登録"
          aria-modal="true"
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
            <h2 style={{ marginTop: 0 }}>APIキーを登録</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label htmlFor={keyInputId}>APIキー</label>
                <input
                  id={keyInputId}
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.currentTarget.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowKeyModal(false)}>
                  閉じる
                </button>
                <button type="button" onClick={handleSaveApiKey}>
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
