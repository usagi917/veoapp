# todo.md — 「ピクトーク（仮）」MVP チェックリスト

> **出荷判断の最上位チェック**
>
> * [ ] 8秒選択で**720p / MP4 / 音声付き**をDLできる
> * [ ] 16秒選択で**8秒×2本**を結合しDLできる（**ハードカット**）
> * [ ] **日本語セリフ**が**口パク＋まばたき**で自然に再現される
> * [ ] **声：性別×トーン**が反映される（必須選択）
> * [ ] **写真要件**未達・**顔検出0件/未選択**・**同意未チェック**は明確エラー
> * [ ] **ページ離脱で再DL不可**
> * [ ] **BYOK**（ユーザーAPIキー）で動作、**サーバー保存なし**
> * [ ] **fps方針を確定**：MVPは **Veo 3 既定（24fps）**／将来オプションで30fps再エンコード

---

## 0. 準備 & 方針確定

* [ ] 仕様差分の最終合意：**fps(24 vs 30)**、**16秒の結合方式（ハードカット）**、**クロスフェードは将来**
* [ ] ライセンス・同意文言（「自分/権利保有のみ」「未成年/有名人不可」）をUIに表示
* [ ] 実行環境：**Node 20 / pnpm / macOS (Apple Silicon)** を前提に統一
* [ ] Vercel プロジェクト作成（環境：Prod/Preview/Dev）

---

## 1. プロジェクト雛形（S0）

* [ ] Next.js 14+（App Router, TypeScript）を初期化
* [ ] Tailwind（ダークテーマ固定）設定
* [ ] ESLint / Prettier 設定（CIで強制）
* [ ] Vitest + React Testing Library 導入
* [ ] Playwright 導入（Chromium/Firefox/WebKit）
* [ ] GitHub Actions で **lint → unit → e2e** ワークフロー
* [ ] `src/app/page.tsx` に h1 `"Pictalk"`（サニティ）
* [ ] `pnpm test` / `pnpm test:e2e` が green

---

## 2. 依存パッケージ & 環境変数

* [ ] 依存を追加：`@google/genai`, `@ffmpeg/ffmpeg`, `face-api.js`(or MediaPipe), `zod`, `zustand`, `@tanstack/react-query`
* [ ] `.env.example` 用意（※**自前のGoogleキー不要**：BYOK方式）
* [ ] `SESSION_SECRET`（HMAC/暗号用）
* [ ] `KV_URL`, `KV_TOKEN`（Upstash/互換KV、TTL=60分）

---

## 3. KV/Cookie/CSRF ユーティリティ（S1）

* [ ] `src/lib/kv.ts`：`setKey(sessionId,key,ttl)` / `getKey(sessionId)` / `delKey(sessionId)`
* [ ] `src/lib/cookies.ts`：`getSid(req)` / `setSid(res,sid)` / `clearSid(res)`（**HttpOnly + Secure + SameSite=Lax**）
* [ ] `src/lib/csrf.ts`：`issueCsrfToken(sessionId)` / `verifyCsrfToken(sessionId, token)`（**HMAC-SHA256**、TTL=15分）
* [ ] ユニットテスト：KV（HTTPモック）、Cookie属性、CSRF改ざん

---

## 4. `/api/key`（BYOK登録）（S2）

* [ ] 入力 zod：`{ apiKey: string, csrf: string }`
* [ ] `sid`発行/取得 → KV `key:sid -> apiKey`（TTL=60分）保存
* [ ] 軽い疎通チェック（SDKで最小呼び出し）失敗は `400`
* [ ] 成功レス：`{ ok: true }`、失敗：`400/500`
* [ ] 右上「APIキー」モーダル（入力→POST→結果表示）
* [ ] テスト：正正常/CSRF不正/疎通失敗/KV障害

---

## 5. UI スケルトン（フォーム & 状態）

* [ ] **左パネル**：画像アップロード／セリフ／声（性別×トーン）／動きプリセット／微パン／長さ（8/16）／同意チェック／生成ボタン
* [ ] **右パネル**：進行表示（**待機→生成→最終化**）、結果（プレビュー+DL）、**使用台本**表示
* [ ] zustand でフォーム/アプリ状態、React Query でAPI呼び出し
* [ ] 必須選択のUI制御（未選択で生成不可）

---

## 6. 画像アップロード & 前処理（S3）

* [ ] 検証：**拡張子 JPG/PNG/WebP**、**≤10MB**、**短辺≥1080px**
* [ ] EXIF 削除：`createImageBitmap` → Canvas → `toBlob('image/png')`（再エンコード）
* [ ] 失敗時の明確なエラー表示（文言固定）
* [ ] ユニットテスト：サイズ/解像度/拡張子、EXIF除去の経路

---

## 7. 顔検出 → 顔選択 → スマートクロップ（S4）

* [ ] `src/lib/face.ts`：顔検出 `detectFaces(imageBitmap): bboxes[]`
* [ ] 顔が0：エラー表示／複数：**顔選択UI**
* [ ] スマートクロップ：**顔重心**基準で**16:9**矩形算出→Canvasトリミング→dataURL
* [ ] **微パン**：フラグ保持（映像パンはVeoに誘導）
* [ ] テスト：bbox→矩形算出ロジック、複数顔選択のUIフロー

---

## 8. 台本フィット & プロンプト生成（S5）

* [ ] `fitScriptAndSplit(text, lengthSec, tone)`：**CPS**（文字/秒）推定で要約・分割（16秒→8+8）
* [ ] 句読点優先の分割、語尾/句読点の**自然化**
* [ ] `buildPrompt({script, voice:{gender,tone}, motion, microPan})`：

  * [ ] 動きプリセット→語彙表に基づく誘導文
  * [ ] **negative**（極端な変形・背景暴走の抑止）
* [ ] テスト：長文圧縮、16秒2分割、プロンプトに各要素が反映

---

## 9. `/api/generate`（8秒×1 / ×2）（S6）

* [ ] 入力 zod：`image(dataURL)`, `script`, `voice`, `motion`, `microPan`, `lengthSec(8|16)`, `consent(true)`, `csrf`
* [ ] 画像 dataURL → bytes / mimeType `image/png`
* [ ] `@google/genai`：`ai.models.generateVideos({ model:'veo-3.0-generate-preview', prompt, image:{imageBytes,mimeType}, config:{ aspectRatio:'16:9', negativePrompt, personGeneration:'allow_adult' }})`
* [ ] 16秒時は同設定で**2オペ**起動 → `ops: string[]` を返す
* [ ] 失敗は**1回自動リトライ** → 以降エラー
* [ ] レスポンス：`{ ops, usedScript }`
* [ ] テスト：分岐/バリデ/リトライ（SDKモック）

---

## 10. `/api/op`（ポーリング）（S7）

* [ ] `ai.operations.getVideosOperation({ operation })` で `done` 判定
* [ ] 完了時：最初の `generatedVideos[0].video` ハンドルを返す（欠落は `422`）
* [ ] 未完了：`done:false`
* [ ] フロント：React Query で**10秒**間隔ポーリング
* [ ] テスト：done切替/ハンドル欠落/エラー

---

## 11. 16秒結合（ffmpeg.wasm, concat demuxer）（S8）

* [ ] **遅延ロード**＆シングルトン初期化
* [ ] `list.txt` を生成し `-f concat -safe 0 -i list.txt -c copy out.mp4`（**ストリームコピー**）
* [ ] 失敗時：filter `concat`（再エンコード）にフォールバック＋UI警告
* [ ] 出力の長さ/メタ一致を検証（24fpsのまま）
* [ ] テスト：I/O パスの単体、e2eで1回の実結合

---

## 12. `/api/download`（短寿命トークン・プロキシ）（S9）

* [ ] `issueDownloadToken({ sid, handle, ttl:120s, pageId })`（**HMAC署名**）
* [ ] `GET /api/download?token=...`：検証OK→`ai.files.download(file)`を**ストリーミング転送**
* [ ] ヘッダ：`Cache-Control: no-store`、`Content-Disposition: attachment; filename="pictalk_YYYYMMDD_HHmmss.mp4"`
* [ ] `beforeunload` で失効APIに通知（**再DL不可**）
* [ ] エラー：不正/期限切れは `403`
* [ ] テスト：有効/失効/期限切れ、ヘッダ検証

---

## 13. 進行表示・再試行・使用台本 表示（S10）

* [ ] ステップUI：**待機→生成→最終化**（概算%レンジ）
* [ ] エラー→**自動再試行1回**→失敗時は「同じ設定で再生成」ボタン
* [ ] 生成完了後に**使用台本**を表示（再生成の起点に）
* [ ] ボタン状態・スピナー・無効化のUX
* [ ] E2E：画像→設定→生成→DL のハッピーパス／失敗→再試行→成功

---

## 14. セキュリティ / プライバシー（S11）

* [ ] **BYOK**：フロントは**キー生値を保持しない**
* [ ] Cookie：**HttpOnly + Secure + SameSite=Lax**、`sid` のみ
* [ ] KV：`sessionId -> apiKey`（**TTL=60分**）、削除API
* [ ] **全POSTでCSRF必須**（トークンはHMAC、TTL=15分）
* [ ] **CSP**：

  * [ ] `default-src 'self'`
  * [ ] `img-src 'self' blob: data:`
  * [ ] `media-src 'self' blob:`
  * [ ] `script-src 'self' 'unsafe-inline'`（必要最小）
  * [ ] `connect-src 'self' https://*.googleapis.com`
* [ ] 入力 zod バリデ一式（画像/同意/必須）
* [ ] **personGeneration**：`allow_adult` 固定（地域制約に留意）
* [ ] ログ：**PIIなし・最小**、`no-store` 方針の確認

---

## 15. エラーハンドリング / リトライ / 文言

* [ ] 生成失敗：**自動1回再試行** → 失敗時はエラーUI＋再生成導線
* [ ] 顔検出0：**「顔が検出できません。単一人物・正面の写真をご利用ください。」**
* [ ] 複数顔未選択：**「顔を1つ選択してください。」**
* [ ] 同意未チェック：**「権利同意が必要です。」**
* [ ] BYOK無効：**APIキー登録モーダル**へ誘導
* [ ] レート/外部エラー：**数分後に再試行**メッセージ

---

## 16. テスト（Unit / E2E / 互換 / パフォーマンス）

**Unit**

* [ ] `fitScriptAndSplit`：CPS閾値・句読点分割・自然化
* [ ] `buildPrompt`：声/動き/negative反映
* [ ] 16秒結合の分岐（コピー/再エンコード）
* [ ] BYOK：KV TTL、Cookie検証、未登録`401`
* [ ] バリデ：画像サイズ/解像度/フォーマット/同意

**E2E**

* [ ] 8秒/16秒 生成→DL
* [ ] 声：男女×トーン3種
* [ ] 動き：5プリセット×微パンON/OFF
* [ ] 画像境界：縦長/横長/低解像/高圧縮/眼鏡/影
* [ ] ネットワーク：3G/4G 遅延時のUX
* [ ] ページ離脱：DL無効化
* [ ] 自動リトライ→成功

**互換・デバイス**

* [ ] 最新 Chrome/Edge/Safari/Firefox（PC/モバイル）

**性能**

* [ ] 生成時間（平均/99p）計測
* [ ] 8+8結合の所要時間（端末差）
* [ ] ffmpeg.wasm ロード時間・メモリ監視

---

## 17. 運用・監視

* [ ] 匿名メトリクス：リクエスト数/成功率/平均生成時間/DL率
* [ ] 例外収集：サーバー関数の例外・外部API失敗・結合失敗
* [ ] フラグ：

  * [ ] `concat.serverFallback`（サーバー側結合へ切替）
  * [ ] `rateLimit.enabled`（将来ON）
  * [ ] `download.ephemeral`（ページ閉鎖で失効＝常時ON）

---

## 18. アクセシビリティ

* [ ] ラベル／コントラスト比／キーボード操作
* [ ] 状態変化（進行/エラー）をスクリーンリーダー通知

---

## 19. バンドル最適化

* [ ] **動的import**：`face-api.js` / `@ffmpeg/ffmpeg` は遅延ロード
* [ ] 画像処理はWeb Worker化の検討（必要時）
* [ ] 依存のツリーシェイク確認

---

## 20. デプロイ

* [ ] 環境変数を Vercel に設定（`SESSION_SECRET`, `KV_URL`, `KV_TOKEN`）
* [ ] Node ランタイム 20, Edge 不使用（KV/HTTP要件に合わせる）
* [ ] プレビューURLで手動QA（ハッピーパス/E2E要点）

---

## 21. ドキュメント

* [ ] README（起動手順、BYOKの流れ、既知の制約、問い合わせ不可事項）
* [ ] API仕様（`/api/key`, `/api/generate`, `/api/op`, `/api/download`）
* [ ] セキュリティ方針（BYOK, CSP, CSRF, ログ）
* [ ] 変更履歴（v1.2 → MVP 実装差分）

---

## 22. リリース / ロールバック

* [ ] 受け入れ条件の**最終チェック**（冒頭の出荷判断）
* [ ] タグ付け & リリースノート作成
* [ ] 重大不具合時の**Vercel Revert**手順をREADMEに明記
* [ ] KVのクリーンアップ（不要キー削除）

---

## 23. 法務・コンテンツガイドライン

* [ ] UIに**権利同意**と**未成年/有名人不可**を明記
* [ ] ユーザーサポート向け「不許容事例」をFAQに追記
* [ ] サーバー**no-store**の方針をプライバシー記述に反映

---

## 24. （任意）コード生成LLMの運用

* [ ] **Prompt S0〜S11** を順に実行（各ステップが**テスト→実装→配線**で完結）
* [ ] 途中の**孤立コード禁止**（常にUI/APIへ結線）
* [ ] ステップ間の**成果物引き継ぎ**を明示（型/ファイルパス）

---

## 付録：受け入れ条件（再掲・最終確認）

* [ ] **8秒**／**16秒**が**720p/16:9/音声付き**でDLできる
* [ ] **口パク・まばたき**が明確に確認できる
* [ ] \*\*声（性別×トーン）\*\*の反映
* [ ] **写真要件**／**顔検出**／**同意**のバリデーション
* [ ] **ページ離脱で再DL不可**
* [ ] **BYOK**セッション（KV TTL=60分, CookieはHttpOnly）
* [ ] **CSP/CSRF/zod**が適用
* [ ] \*\*ログ/保存なし（no-store）\*\*方針の順守
