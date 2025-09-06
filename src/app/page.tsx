import React, { useId, useState } from 'react';

// 最小UIスケルトン（フォーム & 進行表示）
export default function Page() {
  // 最小のローカル状態（まだ機能結線はしない）
  const [lengthSec, setLengthSec] = useState<8 | 16>(8);
  const [scriptText, setScriptText] = useState('');
  const [consent, setConsent] = useState(false);

  // アクセシビリティ用ID（label関連付け）
  const fileId = useId();
  const scriptId = useId();
  const genderId = useId();
  const toneId = useId();
  const motionId = useId();
  const panId = useId();
  const consentId = useId();

  return (
    <div>
      <h1>Pictalk</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 左パネル：フォーム群 */}
        <section aria-label="左パネル">
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor={fileId}>画像アップロード</label>
              <input id={fileId} name="image" type="file" accept="image/*" />
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
              <select id={toneId} name="tone" defaultValue="normal">
                <option value="slow">slow</option>
                <option value="normal">normal</option>
                <option value="energetic">energetic</option>
              </select>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
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
            </div>

            <div>
              <button type="button" disabled={scriptText.trim().length === 0 || !consent}>
                生成
              </button>
            </div>
          </div>
        </section>

        {/* 右パネル：進行表示と使用台本 */}
        <section aria-label="右パネル">
          <div>
            <h2>進行</h2>
            <ol>
              <li>待機</li>
              <li>生成</li>
              <li>最終化</li>
            </ol>
          </div>
          <div>
            <h2>使用台本</h2>
            <div style={{ fontSize: 12, color: '#666' }}>ここに使用した台本を表示します</div>
          </div>
        </section>
      </div>
    </div>
  );
}
