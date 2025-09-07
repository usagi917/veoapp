Pictalk — しゃべる写真の動画ジェネレーター（MVP）

このリポジトリは、1枚の人物写真から日本語セリフで口パク＋まばたきする短尺動画（8秒/16秒）を生成・ダウンロードするWebアプリのMVP実装です。

- フロントエンド: React + Vite + TypeScript
- テスト: Vitest + React Testing Library（単体/結合）、Playwright（E2E）
- 品質: ESLint + Prettier + TypeScript 型チェック
- 方針: BYOK（ユーザー自身の Google Gemini API キーを一時セッション保持）

## 必要環境

- Node.js 18 以上（推奨: Node 20）
- pnpm 8+（`corepack enable` で有効化可）

## セットアップ

1. 依存関係をインストール

- `pnpm install`

2. 環境変数を設定（サーバー相当コードをテストする場合）

- `.env.example` を `.env` にコピーして必要値を設定
- `SESSION_SECRET`, `KV_URL`, `KV_TOKEN`

3. Playwright（E2E用ブラウザ）をインストール（E2Eを実行する場合）

- `pnpm e2e:install`

## よく使うコマンド

- 開発サーバー起動（Vite）: `pnpm dev`
- プレビューサーバー（本番ビルドの確認）: `pnpm exec vite build && pnpm preview`
  - 備考: `vite preview` は本番用サーバーではなく、ローカルでビルド済み成果物（通常は `dist/`）を配信します（デフォルトポート: 4173）。
- フォーマット: `pnpm format`
- Lint: `pnpm lint`
- 型チェック: `pnpm typecheck`
- 単体/結合テスト（Vitest）: `pnpm test`
- まとめCIラン: `pnpm codex:ci`（format → lint → typecheck → test）

## テスト運用

- 単体/結合テスト（Vitest + RTL）
  - 全件実行: `pnpm test`
  - テスト名で絞り込み: `pnpm test -- -t "キーワード"`
  - 設定: `vitest.config.ts`（`environment: 'jsdom'`）
- E2E（Playwright）
  - 事前準備: `pnpm exec vite build`
  - 実行: `pnpm test:e2e`
  - 設定: `playwright.config.ts`（`webServer: pnpm preview`, `baseURL: http://localhost:4173`）

## ディレクトリ構成（抜粋）

- `src/app/` UI（React）
- `src/api/` サーバー関数相当の純関数群（テストしやすい形で実装）
- `src/lib/` ドメインロジック/ユーティリティ
- `e2e/` Playwright E2E テスト
- `spec.md` プロダクト仕様（MVPの要件）
- `prompt_plan.md`, `todo.md` 開発タスク・プロンプト計画

## 開発方針（TDDワークフロー）

AGENTS.md のルールに従い、次の順で作業します。

1. 失敗するテストを書く（Vitest + RTL）
2. テストに合格するコードを実装
3. `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
4. すべて合格したらコミット
5. `prompt_plan.md` と `todo.md` を更新

Codex CLI で「go」と指示した場合、上記の未完了ステップを1つずつ自動で進めます（詳細は `AGENTS.md`）。

## 環境変数（.env）

- `SESSION_SECRET` CSRF/署名用の秘密（十分な長さの乱数）
- `KV_URL`, `KV_TOKEN` 短寿命KVの接続情報（セッションID → APIキー、TTL=60分想定）
- BYOKのため、Google Gemini の自前APIキーはサーバー側でのみ扱い、フロントには保存しません。

## 補足・参考

- Vite の `preview` はビルド済み成果物をローカル配信するためのコマンドです（デフォルトポートは `4173`。本番運用向けではありません）。
- Vitest のCLIは `-t`/`--testNamePattern` でテスト名フィルターが使えます。
- ライセンスは `LICENSE` を参照してください。

## トラブルシュート

- `pnpm preview` 実行時に 404 などが出る → 先に `pnpm exec vite build` を実行してください。
- E2Eでブラウザが見つからない → `pnpm e2e:install` を実行してください。
- Node の型や `Buffer` が見つからない → Node 18+ を使用しているか確認してください。

---

このREADMEは、Vite/Vitestの公式ドキュメント確認に基づいて作成されています。プレビューはローカル検証専用、テスト名フィルタは `-t` が利用可能です。
