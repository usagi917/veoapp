# A. 青写真（実装計画・ステップバイステップ）

### A-1. ゴールの再確認（MVP）

- 単一人物の写真を元に、**日本語セリフで口パク+まばたき**の**8秒動画**を生成（**16秒は8秒×2の連結**）。
- **BYOK**（ユーザー自身のGemini APIキー）で**サーバー保存なし**。
- **出力：MP4 / 720p / 16:9 /（Veo既定）24fps / 音声付き**。([Google AI for Developers][1])

> 注：Veo 3の仕様は「8秒、720p、24fps（表に記載）、音声ネイティブ、16:9（Veo 3は16:9のみ）」で固定。MVPではこの仕様に合わせます。([Google AI for Developers][1])

---

### A-2. システム構成（決定）

- **フロント**：Next.js (App Router, TypeScript, React, Tailwind, React Query, zustand)
- **サーバー**：Vercel Functions（Node 20）
- **外部**：Gemini API（Veo 3：`veo-3.0-generate-preview`）([Google AI for Developers][1])
- **主要lib**：`@google/genai`, `@ffmpeg/ffmpeg`, `face-api.js` or MediaPipe Tasks, `zod`
- **KV**：Upstash（TTL=60分）で**セッションID→APIキー**を保持
- **CSP/CSRF**：堅め（SameSite, HttpOnly, CSRF token）
- **ダウンロード**：短寿命トークン + **ページ滞在中のみ有効**

---

### A-3. ユーザーフロー（1画面）

1. 画像アップロード（要件チェック＋EXIF削除）
2. 顔検出→（複数時）顔選択→スマートクロップ（16:9）
3. セリフ入力（内部でフィット＝要約＆話速最適化）
4. 声（性別×トーン）・動きプリセット・微パン・長さ（8/16秒）・同意
5. 生成 → 進行表示（待機→生成→最終化）→（16秒は連結）→ ダウンロード（その場限り）

---

### A-4. 外部APIの仕様前提

- **生成**：`ai.models.generateVideos({ model: 'veo-3.0-generate-preview', prompt, image, config })`
- **ポーリング**：`ai.operations.getVideosOperation({ operation })`で**done**判定
- **DL**：`ai.files.download({ file, downloadPath })`（SDKサンプルあり）([Google AI for Developers][1])
- **Veo 3の仕様**（要点）：**8秒/720p/24fps/音声あり/16:9**、**image-to-video対応**、**personGeneration**パラメータあり（地域制約）([Google AI for Developers][1])
- **APIキー扱い**：サーバー側で**明示指定** or 環境変数。BYOKでは**サーバーへのみ渡す**。([Google AI for Developers][2])

---

### A-5. 技術上の要点と方針

- **fps**：Veo 3は**24fps**。MVPは**24fpsのまま**。16秒連結は**同条件**のため**ストリームコピーconcat**で**再エンコード回避**（`ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4`相当）。**クロスフェードはMVPではハードカット**（将来オプションで`xfade`。`xfade`を使う時は再エンコード必須）。([Google AI for Developers][1], [FFmpeg Trac][3])
- **ffmpeg.wasmの制約**：バイナリが重い・メモリ上限（\~2–4GB）など。MVPでは**concatのみ**に限定して軽量化。([JavaScript in Plain English][4], [GitHub][5])
- **人の生成ポリシー**：**image-to-video時は `personGeneration: "allow_adult"` を指定**（リージョン制約考慮）。([Google AI for Developers][1])

---

# B. 分割（反復で粒度調整）

## B-1. ラフなチャンク（イテレーション0 → エピック粒度）

1. **基盤セットアップ**：Next.js/TypeScript/ESLint/Prettier/Tailwind/テスト基盤（Vitest, Playwright）
2. **BYOK**：`/api/key` + KV + HttpOnly Cookie + CSRF
3. **アップローダ＆前処理**：要件チェック、EXIF除去、顔検出、顔選択、スマートクロップ
4. **スクリプト適合**：要約＆話速フィット、プロンプト生成
5. **生成API**：`/api/generate`（8秒×1/×2）、`/api/op`（ポーリング）
6. **連結＆DL**：ffmpeg.wasm concat、`/api/download`（短寿命トークン）
7. **UIフロー**：進行表示、エラー&再試行、結果表示
8. **セキュリティ**：CSP/CSRF/入力バリデ/リージョンパラメータ
9. **E2E/性能計測**：ブラウザ互換、低速回線、メトリクス

---

## B-2. さらに分解（イテレーション1 → ストーリー粒度）

**Epic 1：基盤**

- S1-1 プロジェクト雛形（Next.js App Router、TS）
- S1-2 Lint/Format/CI（GitHub Actions）
- S1-3 テスト基盤（Vitest + Playwright）
- S1-4 UIフレーム（ダークテーマ）

**Epic 2：BYOK**

- S2-1 KVクライアントとCookieユーティリティ
- S2-2 `/api/key`（登録&疎通チェック）
- S2-3 CSRFトークン（二重送信方式）

**Epic 3：画像前処理**

- S3-1 バリデーション（MIME/サイズ/短辺≥1080px）
- S3-2 EXIF削除（Canvas toBlob）
- S3-3 顔検出（MediaPipe/face-api.js）
- S3-4 顔選択UI
- S3-5 スマートクロップ（顔重心→16:9）＋微パン

**Epic 4：台本フィット & プロンプト**

- S4-1 `fitScriptAndSplit`（8/16秒, CPS推定）
- S4-2 動き/声→タグ展開、negative挿入

**Epic 5：生成API**

- S5-1 Veo 3呼び出し（8秒×1）
- S5-2 16秒（8秒×2オペ）
- S5-3 `/api/op`（ポーリング）
- S5-4 `personGeneration`設定

**Epic 6：連結 & DL**

- S6-1 ffmpeg.wasmロード & ハードコンカット（-c copy）
- S6-2 ダウンロードトークン（短寿命・ページ滞在中のみ）
- S6-3 `/api/download` プロキシ（`no-store`）

**Epic 7：UI/UX**

- S7-1 進行3ステップUI
- S7-2 自動再試行（1回）
- S7-3 「使用台本」表示

**Epic 8：セキュリティ/運用**

- S8-1 CSP/ヘッダ
- S8-2 入力zodバリデーション
- S8-3 匿名メトリクス（成功率/時間）

---

## B-3. さらに分解（イテレーション2 → **実装ステップ**）

**例：Epic 2（BYOK）を分解**

- Step 2-1：`/lib/kv.ts`（`getKey(sessionId)`, `setKey(sessionId, key, ttl)`）の型/テスト
- Step 2-2：`/lib/cookies.ts`（`getSid`, `setSid`）の型/テスト
- Step 2-3：`/lib/csrf.ts`（`issueCsrfToken`/`verifyCsrfToken`）
- Step 2-4：`POST /api/key` ハンドラ（zod, KV, Cookie, CSRF）＋ユニットテスト
- Step 2-5：クライアント「APIキー」モーダル（React Hook Form + 成功/失敗UI）

**例：Epic 5（生成API）を分解**

- Step 5-1：`/lib/genai.ts`（`makeClient(apiKey)`、依存注入しやすい設計）
- Step 5-2：`buildPrompt(input)`（声/動き/微パン/negative）
- Step 5-3：`POST /api/generate`（8秒×1）モック→本実装
- Step 5-4：16秒対応（8秒×2）
- Step 5-5：`GET /api/op?id=...`（ポーリングレスポンス）
- Step 5-6：`personGeneration`（image-to-videoは`allow_adult`固定）([Google AI for Developers][1])

**例：Epic 6（連結\&D L）を分解**

- Step 6-1：concat demuxer用の`list.txt`生成 & `-c copy`結合
- Step 6-2：短寿命DLトークンの署名・検証
- Step 6-3：`GET /api/download?token=...`（`Cache-Control: no-store`、`Content-Disposition`）
- Step 6-4：ページ離脱時の無効化（`beforeunload`→cleanup API）

> **要点**：各Stepは「テスト→実装→UI結線」まで完結し、**孤立コードを残さない**。

---

## B-4. 粒度レビュー（**安全に実装できる最小ステップ**か？）

- 各Stepは**1–3ファイルの変更**で終わり、**ユニットテスト**が先行。
- 外部依存（Veo 3）は**SDKラッパー**を介すことで**モック容易**。
- ffmpeg.wasmは**concatのみ**の最小使用（再エンコード回避 → メモリ/CPU負担低）。
- 失敗時は**1回自動リトライ**、それでも失敗なら**再生成導線**。
- **セキュリティ**はBYOK/CSP/CSRF/入力zodで**都度テスト**。

> **結論**：粒度は十分に小さく、かつ各Stepがユーザーストーリーの一部を前進させる「前進性」を確保。

---

# C. 実装プロンプト（TDD・逐次統合・孤立なし）

> 使い方：各プロンプトを**そのまま**コード生成LLMに投げてください。
> すべて**Mac（Apple Silicon, Node 20, pnpm）**前提。各ステップは**テスト→実装→配線**の順。
> 依存：`Node 20`, `pnpm`, `git`, `Playwright`, `Vitest`。
> **注意**：**Veo 3は8秒/720p/24fps/16:9、ネイティブ音声**です。JS SDKのサンプルはドキュメント準拠で使用します。([Google AI for Developers][1])

---

## Step 0：プロジェクト雛形とテスト基盤

```text
目的: Next.js(App Router, TS)の骨格、Tailwind、ESLint/Prettier、Vitest、Playwright をセットし、CIでlint/testを回す。

前提:
- macOS (Apple Silicon), Node 20, pnpm
- 新規リポジトリ "pictalk"

タスク:
1) Next.js 14+ with TS で初期化（app/ ルータ）。Tailwind 設定。
2) ESLint/Prettier 導入。lintスクリプトを追加。
3) Vitest + React Testing Library 設定。`src/` 配下で動作。
4) Playwright 設定（Chromium/Firefox/WebKit）。基本E2E雛形テスト。
5) GitHub Actions で CI（lint、unit、e2e headless）。

生成/変更ファイル（例）:
- package.json（scripts: dev, build, start, lint, test, test:e2e）
- vitest.config.ts, playwright.config.ts
- .eslintrc.cjs, .prettierrc
- src/app/layout.tsx, src/app/page.tsx（ダークUIのベース）
- .github/workflows/ci.yml

テスト（先に作成）:
- unit: "Sanity: renders home" (RTL)
- e2e: "/" にアクセスしてh1の存在を確認

受け入れ基準:
- `pnpm test` と `pnpm test:e2e` がgreen
- CIが通る
```

---

## Step 1：KVとCookieユーティリティ（BYOK準備）

```text
目的: BYOKセッション格納のため KV アダプタと Cookie/CSRF ユーティリティを用意し、テスト可能にする。

タスク:
1) `src/lib/kv.ts` : `setKey(sessionId, key, ttlSec)`, `getKey(sessionId)`, `delKey(sessionId)`
   - 実装はUpstash REST。エンドポイント/トークンはenvから。
   - VitestでモックHTTP（mswなど）により単体テスト。

2) `src/lib/cookies.ts` : `getSid(req)`, `setSid(res, sid)`, `clearSid(res)`
   - HttpOnly/Secure/SameSite=Lax/Path=/, Max-Age=TTL。
   - 単体テスト（ヘッダ検証）。

3) `src/lib/csrf.ts` : `issueCsrfToken(sessionId)`, `verifyCsrfToken(sessionId, token)`
   - HMAC(SHA256, SESSION_SECRET)。トークンTTLは短め（15分）。
   - 単体テスト（署名・期限）。

受け入れ基準:
- 主要関数のユニットテストがgreen
- Lint OK
```

---

## Step 2：`/api/key` – BYOK登録エンドポイント

```text
目的: ユーザーのGemini APIキーをサーバーセッションに登録する。

タスク:
1) zodスキーマ: `{ apiKey: string, csrf: string }`
2) Cookieから`sid`取得or生成→KVに`key:sid -> apiKey`を TTL=60分で保存
3) `@google/genai`の軽い疎通（任意: models.list相当または最小呼び出し）。失敗時400。
4) 成功レス: `{ ok: true }`
5) エラーハンドリング（400/500）

テスト:
- 正常系: CSRF正、KV保存、200
- CSRF不正/キー空: 400
- KV障害: 500

受け入れ基準:
- 単体テスト green
- エンドポイントのI/O契約が固定
- ドキュメントのAPIキー扱い基準に抵触しない（サーバーで保持）:contentReference[oaicite:12]{index=12}
```

---

## Step 3：アップローダ & EXIF削除 & 画像バリデーション

```text
目的: 画像入力の前処理（要件チェック・EXIF除去）を実装。

タスク:
1) クライアントコンポーネント: DropZone + ファイル検証（JPG/PNG/WebP, ≤10MB, 短辺≥1080px）
2) EXIF除去: `createImageBitmap`→Canvas→`toBlob('image/png')`で再エンコード（EXIF消去）
3) フロント単体テスト: バリデ通過/失敗（サイズ・解像度）

受け入れ基準:
- 仕様どおりにエラーメッセージ表示
- EXIFが除去される（jpeg→pngでもOK）
```

---

## Step 4：顔検出→顔選択→スマートクロップ（16:9）+ 微パン

```text
目的: 顔を検出し、選択→顔重心に基づき16:9でスマートクロップ。微パンは矩形オフセット適用。

タスク:
1) face-api.js or MediaPipe Tasks をラップした`src/lib/face.ts`を用意（検出結果: bbox[]）
2) 顔が0: エラー。複数: サムネ選択UI。
3) スマートクロップ: 画像→顔重心→16:9矩形→Canvasトリミング→dataURL化
4) 微パン: 16:9矩形を微小移動して連番フレームではなく**プロンプト指示**用のフラグとして保持（実映像のパンはVeoに任せる）
5) 単体テスト: bbox→矩形算出の純ロジック

受け入れ基準:
- 0/複数顔の分岐がUIで機能
- クロップ結果のアスペクトが厳密に16:9
```

---

## Step 5：台本フィット（要約＆話速最適化）+ プロンプト生成

```text
目的: 入力セリフを8秒(または16秒→8+8)に収まる長さへ要約し、声/動き/微パン/negativeをプロンプトへ展開。

タスク:
1) `fitScriptAndSplit(text, lengthSec, tone)` を実装（CPSベース閾値、句読点分割、自然化）
2) `buildPrompt({script, voice:{gender,tone}, motion, microPan})`を実装
   - 形式: Veo推奨の自然文 + negativePrompt（過度な変形・背景暴走抑止）
3) 単体テスト: 長文→8秒想定文字数へ圧縮される、16秒時にセグメント2本返す

受け入れ基準:
- `usedScript`がUIに表示可能な形で返せる
```

---

## Step 6：`/api/generate`（8秒×1 / ×2） – Veo 3 呼び出し

```text
目的: Veo 3で8秒動画を1本（または2本）生成するジョブを発行。

タスク:
1) リクエストzod: image(dataURL), script, voice, motion, microPan, lengthSec(8|16), consent(true), csrf
2) `makeClient(apiKey)`（@google/genai）。`ai.models.generateVideos({ model:'veo-3.0-generate-preview', prompt, image:{imageBytes, mimeType:'image/png'}, config:{ aspectRatio:'16:9', negativePrompt, personGeneration:'allow_adult' } })`
   - サンプルは公式のJSスニペット準拠。:contentReference[oaicite:13]{index=13}
3) 16秒時は同設定で2オペ起動し、`ops: [opA, opB]` と `usedScript`を返す
4) 失敗時は**1回自動再試行**（内部）、以降はエラー返却

テスト:
- 依存注入: `makeClient`をモックして、operation.name だけ検証
- 8秒/16秒の分岐テスト
- `consent=false`や必須未選択は400

受け入れ基準:
- 仕様どおりのレスポンス（ops[], usedScript）
```

---

## Step 7：`/api/op?id=...`（ポーリング）

```text
目的: オペレーション状態を代理取得して`done`と動画ハンドルを返す。

タスク:
1) `ai.operations.getVideosOperation({ operation })`を呼ぶ
2) `done: boolean` と、`response.generatedVideos[0].video`（ファイルハンドル）を抽出
3) エラー時 500。`done=false`時はそのまま返す。

テスト:
- モックでdone切替の挙動を検証
- ハンドルが欠落時の422

受け入れ基準:
- フロントのReact Queryが安定してポーリング可能
```

---

## Step 8：16秒連結（ffmpeg.wasm / concat demuxer）

```text
目的: 8秒×2本（同コーデック/同fps）のMP4を**ストリームコピー**で結合して高速化。

タスク:
1) ffmpeg.wasmの初期化コード（ワーカー / シングルトンロード）
2) 2ファイルのファイル名リスト（list.txt）生成 → `-f concat -safe 0 -i list.txt -c copy out.mp4`
3) 例外（ヘッダ不一致）の場合は**ハードカット filter concat**にフォールバック（再エンコード）※重いので警告UI
4) 単体テスト（擬似バイナリでI/Oパスをテスト、実ffmpegは結合コマンドだけe2eで検証）

受け入れ基準:
- 代表端末で結合が数秒で完了
- 24fpsのままタイム長が正しい
- wasmの制約に注意（メモリ/サイズ）:contentReference[oaicite:14]{index=14}
```

---

## Step 9：`/api/download`（短寿命トークン・プロキシ）

```text
目的: Veoの生成ファイルを**プロキシ配信**し、ページ滞在中のみ有効にする。

タスク:
1) `issueDownloadToken({sid, handle, ttl:120s, pageId})`（HMAC）
2) `GET /api/download?token=...` → トークン検証 → `ai.files.download(file)` をストリーミング転送（`Cache-Control: no-store`、ファイル名`pictalk_YYYYMMDD_HHmmss.mp4`）
3) `beforeunload`で`/api/download/expire`に通知→invalidate（サーバー側でpageId紐づけで失効）

テスト:
- 有効/無効トークン、TTL切れ、ページ離脱後の403
- ヘッダ検証（`Content-Disposition`, `no-store`）

受け入れ基準:
- ユーザーがタブを閉じると再DL不可
- ファイルDL成功（SDKのdownload関数の利用）:contentReference[oaicite:15]{index=15}
```

---

## Step 10：UI結線・進行表示・エラー再試行・「使用台本」表示

```text
目的: ユーザー操作を一貫フローに結線。待機→生成→最終化を表示。

タスク:
1) zustandでフォーム状態管理、React Queryで`/api/generate`→`/api/op`ポーリング
2) ステップUI: 待機→生成→最終化（進捗%は概算レンジ）
3) 失敗→自動再試行（1回）、それでもダメならボタン表示
4) 生成完了後に「使用台本」を右ペインに表示
5) E2E: 画像→設定→生成→DLまでのハッピーパス（外部APIはモック）

受け入れ基準:
- 受け入れ条件を全てUIで満たす（エラーメッセージも）
```

---

## Step 11：セキュリティ強化 & CSP

```text
目的: CSP/CSRF/zod/リージョンパラメータ/ログ最小化。

タスク:
1) next.config.js / ミドルウェアでCSPヘッダ（img-src/blob/data、media-src/blob、connect: *.googleapis.com 等）
2) すべてのPOSTでCSRF必須、zodで入力検証
3) `personGeneration`をimage-to-videoで`allow_adult`に固定（EU/UK他の制約も考慮）:contentReference[oaicite:16]{index=16}
4) 匿名メトリクス（成功率/平均時間）をコンソール送信（サーバー）

受け入れ基準:
- セキュリティlint（`eslint-plugin-security`等）が警告なし
```

---

## Step 12：最終E2E & パフォーマンス計測

```text
目的: 代表ブラウザでE2E通過、結合時間/生成時間を採取。

タスク:
1) PlaywrightでChrome/Firefox/Safari相当を実行（CIではChromium中心）
2) 3G/4G遅延をNetwork throttlingで再現
3) 計測ログ: 生成リクエスト→完了、結合時間、DL成功率

受け入れ基準:
- 全E2E green、主要メトリクス収集
```

---

# D. 粒度最終チェック（リスク/対策）

- **fps差異（30→24）**：MVPは**24fps**。将来「30fps再エンコード（重い）」を設定トグルで提供。([Google AI for Developers][1])
- **ffmpeg.wasmサイズ/性能**：**concatのみ**に限定しWASM負担を最小化。クロスフェードは将来。([JavaScript in Plain English][4])
- **長時間オペ**：公式推奨の**10秒ポーリング**に合わせる。([Google AI for Developers][1])
- **人の生成ポリシー**：`personGeneration`を仕様準拠に固定。([Google AI for Developers][1])

---

# E. 仕上げのプロンプト群（**各ステップごとに投げる**）

> すべて**TDD（テスト先行）**。各プロンプトの最後で**既存コードへ結線**までを指示。
> **各プロンプトは独立で実行してOK**ですが、**前の成果物に依存**します。
> **出力は差分/新規ファイル一式**を期待。**不要な大改造は禁止**。

---

### Prompt S0：雛形 & テスト基盤

```text
【目的】Next.js + TS + Tailwind + ESLint/Prettier + Vitest + Playwright + CI(GitHub Actions)を最小で構築し、トップページが描画できることをテストする。

【前提】Node 20, pnpm, 新規repo。

【要件】
- App Router構成。TailwindダークUI。scripts: dev/build/start/lint/test/test:e2e。
- Vitest + RTL、Playwrightを設定。
- CIで lint→unit→e2e の順に実行。

【テスト先行】
- unit: Home renders "Pictalk" のh1を検証。
- e2e: "/" へアクセスし h1 を確認。

【実装】
- 雛形と設定ファイルを生成。
- `src/app/page.tsx` に h1 "Pictalk"。
- Playwrightの基本シナリオ追加。

【受け入れ条件】
- `pnpm test` / `pnpm test:e2e` / CI が全て green。
```

---

### Prompt S1：KV/Cookie/CSRF ユーティリティ

```text
【目的】BYOK用のKV/Cookie/CSRFユーティリティを追加し、ユニットテストを通す。

【要件】
- `src/lib/kv.ts`: setKey/getKey/delKey (Upstash REST)。
- `src/lib/cookies.ts`: getSid/setSid/clearSid (HttpOnly, Secure, SameSite=Lax)。
- `src/lib/csrf.ts`: issueCsrfToken/verifyCsrfToken (HMAC-SHA256)。

【テスト先行】
- kv: 正常保存/取得/削除（HTTPモック）
- cookies: Set-Cookie属性検証
- csrf: 署名/期限/改ざん

【実装】
- 環境変数のスキーマ定義（zod）も追加。
- 型安全な関数群を実装。

【受け入れ条件】
- Vitest green、lint OK。
```

---

### Prompt S2：`/api/key`（BYOK登録）

```text
【目的】`POST /api/key` 実装。CSRF付きでKVにAPIキーを60分保存し、sid Cookieを設定する。

【要件】
- 入力: { apiKey, csrf }。zodで検証。
- `@google/genai`で軽い疎通（失敗は400）。
- レスポンス: { ok: true }。
- エラー: 400/500適切。

【テスト先行】
- 正常: KV保存 & 200
- CSRF不正: 400
- 疎通失敗: 400
- KV障害: 500

【実装・結線】
- 右上「APIキー」モーダル（仮）から叩けるfetch関数と最小UIを追加。
```

---

### Prompt S3：アップローダ & EXIF除去 & 画像検証

```text
【目的】JPG/PNG/WebP・≤10MB・短辺≥1080pxチェックとEXIF除去を実装。

【要件】
- コンポーネント: <ImageUploader />。
- 失敗時に明確なエラーメッセージ。
- EXIF除去: canvas再エンコード（toBlob）。

【テスト先行】
- ファイルサイズ/解像度/拡張子の判定テスト（ユニット）
- UI: 失敗文言の出現（RTL）

【実装・結線】
- Homeに< ImageUploader />を配置。次ステップの顔検出へ渡すハンドラを用意。
```

---

### Prompt S4：顔検出→顔選択→スマートクロップ（16:9）+ 微パン

```text
【目的】顔検出→複数顔選択→16:9スマートクロップを実装。微パンはフラグ保持。

【要件】
- `src/lib/face.ts` : detectFaces(imageBitmap)→ bboxes[]
- 顔0: エラー、複数: 選択UI
- スマートクロップ: 顔重心に収まる16:9矩形→Canvasトリミング→dataURL
- 微パン: stateに boolean で保持（Veoプロンプト用）

【テスト先行】
- 算出ロジック（bbox→矩形）単体テスト
- UI: 複数顔の選択ハンドリング

【実装・結線】
- Uploader完了後、本処理を差し込む。結果のdataURLを次工程へ。
```

---

### Prompt S5：台本フィット & プロンプト生成

```text
【目的】8/16秒に収まる台本フィットとVeo用プロンプト生成を実装。

【要件】
- fitScriptAndSplit(text, lengthSec, tone) → { normalized, segments: [{sec:8,text}, ...] }
- buildPrompt({script, voice:{gender,tone}, motion, microPan}) → { prompt, negativePrompt }
- motionの強度テーブルに基づく語彙を組み立てる。

【テスト先行】
- 文字数長め入力→8秒相当へ圧縮される
- 16秒→8+8の2分割
- プロンプト内に voice/motion/negative が反映

【実装・結線】
- UIからの入力全体をひとつの`GenerateRequest`にまとめられる形にする。
```

---

### Prompt S6：`/api/generate`（8秒×1/×2）

```text
【目的】Veo 3でジョブを発行し、ops配列とusedScriptを返す。

【要件】
- `@google/genai` : `ai.models.generateVideos({ model:'veo-3.0-generate-preview', prompt, image:{imageBytes, mimeType:'image/png'}, config:{ aspectRatio:'16:9', negativePrompt, personGeneration:'allow_adult' }})`
- 16秒は同設定で2本起動。
- 入力zod検証、consent必須。
- 内部で1回自動リトライ。

【テスト先行】
- `makeClient`モック: 8秒/16秒分岐、ops収集
- バリデ失敗の400

【実装・結線】
- フロントからPOST→レス表示（opsとusedScript）まで。
- 参考: 公式のJSサンプルの操作名/ダウンロード手順。:contentReference[oaicite:21]{index=21}
```

---

### Prompt S7：`/api/op`（ポーリング）

```text
【目的】operationの完了判定とvideoハンドル抽出。

【要件】
- `ai.operations.getVideosOperation({ operation })` を10秒間隔想定で呼ぶ。
- done: boolean, video handle の取得。

【テスト先行】
- done=false → そのまま返却
- done=true → handle返却
- 欠落→422

【実装・結線】
- React QueryのuseQuery(ポーリング)でUI更新。進行3ステップ表示。
```

---

### Prompt S8：16秒連結（ffmpeg.wasm）

```text
【目的】2つの8秒MP4をconcat demuxerで**-c copy**結合。

【要件】
- list.txt 形式で2ファイルのパスを与え、`-f concat -safe 0 -i list.txt -c copy out.mp4`
- 失敗時はfilter concatへフォールバック（重いのでwarn UI）
- wasm初期化は遅延ロード & 1度だけ。

【テスト先行】
- I/Oパスの単体（擬似ファイル）
- e2eで実際のconcatコマンド1回を検証

【実装・結線】
- `/api/op`完了後に自動結合→`/api/download`トークン発行へ接続。
```

---

### Prompt S9：`/api/download`（短寿命トークン・プロキシ）

```text
【目的】動画ハンドルをサーバー経由でダウンロードし、ページ滞在中のみ有効。

【要件】
- `issueDownloadToken({sid, handle, ttl:120s, pageId})`
- `GET /api/download?token=...` → 検証OKなら `ai.files.download({file})` をストリーム転送（`Cache-Control: no-store`）
- `beforeunload`で失効APIに通知

【テスト先行】
- 有効/失効/期限切れトークン、403確認
- レスポンスヘッダ検証

【実装・結線】
- DLボタン押下→`/api/download`へ。終了後トークン無効化。
- 参考：SDKのdownload使用例。:contentReference[oaicite:22]{index=22}
```

---

### Prompt S10：UI最終化（進行表示・再試行・使用台本）

```text
【目的】待機→生成→最終化の進行UI、1回の自動リトライ、使用台本の表示。

【要件】
- zustandでフォーム/状態管理
- React Queryミューテーション＆ポーリング
- エラー→自動1回再試行→その後は再生成ボタン
- 「使用台本」を右ペインに出す

【テスト先行】
- e2e: ハッピーパス（画像→生成→DL）
- e2e: 1回失敗→自動再試行で成功

【実装・結線】
- すべてのUIをワイヤリングし、孤立コードがないこと。
```

---

### Prompt S11：CSP/CSRF/バリデ/メトリクス

```text
【目的】CSPヘッダ、全POSTのCSRF、zodバリデ、匿名メトリクスを追加。

【要件】
- CSP: img-src 'self' blob: data: ; media-src 'self' blob: ; connect-src 'self' https://*.googleapis.com
- 全POSTでCSRF必須。zodスキーマのエラー表示を統一。
- 匿名メトリクス（生成成功率/時間）をサーバーログ出力（ダミーでOK）。

【テスト先行】
- CSRF無しPOST→403
- zodエラー→400
- ヘッダにCSPが付与されること

【実装・結線】
- 既存APIにCSRF検証を適用。
```

## 参考（一次情報）

- **Veo 3 API（JSサンプル、モデル、8秒/720p/24fps/16:9、音声、operations、download）**：Google AI dev docs。([Google AI for Developers][1])
- **Gemini API/SDK・APIキー**：AI Studio/SDKドキュメント。([Google AI for Developers][2], [Google APIs][6])
- **ffmpeg.wasmの制約/サイズ**：事例と解説。([JavaScript in Plain English][4])
- **ffmpeg xfade/concatの知見**：公式wiki/解説。([FFmpeg Trac][3], [OTTVerse][7])

[1]: https://ai.google.dev/gemini-api/docs/video 'Generate videos with Veo 3 in Gemini API  |  Google AI for Developers'
[2]: https://ai.google.dev/gemini-api/docs/api-key?utm_source=chatgpt.com 'Using Gemini API keys | Google AI for Developers'
[3]: https://trac.ffmpeg.org/wiki/Xfade?utm_source=chatgpt.com 'Xfade – FFmpeg'
[4]: https://javascript.plainenglish.io/slimming-down-ffmpeg-for-a-web-app-compiling-a-custom-version-20a06d36ece1?utm_source=chatgpt.com 'Slimming Down FFmpeg for a Web App'
[5]: https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/755?utm_source=chatgpt.com 'Possible to use more than 2/4GB of files? #755'
[6]: https://googleapis.github.io/js-genai/?utm_source=chatgpt.com '@google/genai'
[7]: https://ottverse.com/crossfade-between-videos-ffmpeg-xfade-filter/?utm_source=chatgpt.com "CrossFade, Dissolve, and other Effects using FFmpeg's ..."
