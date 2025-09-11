# リポジトリガイドライン

## プロジェクト構成とモジュール配置
- アプリコードは `src/app`（Next.js App Router）にあります。
  - ページ: `src/app/page.tsx`、レイアウト: `src/app/layout.tsx`。
  - API ルート: `src/app/api/**/route.ts`（例: `generate-video`, `placeholder-video`）。
  - グローバルスタイル: `src/app/globals.css`（Tailwind 有効）。
- 設定: `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`。
- 環境変数: `env.example` を `.env.local` にコピーし `NEXT_PUBLIC_GEMINI_API_KEY` を設定。
- パスエイリアス: `@/…`（`src/*` にマップ）でインポート。

## ビルド・テスト・開発コマンド
- `pnpm dev`（または `npm run dev`）: ローカル開発サーバー `http://localhost:3000` を起動。
- `pnpm build`（または `npm run build`）: 本番ビルド。
- `pnpm start`（または `npm run start`）: 本番サーバーを起動。
- `pnpm lint`（または `npm run lint`）: ESLint チェックを実行。

## コーディング規約と命名
- 言語: TypeScript（`strict` 有効）。インデント: 2 スペース。
- ESLint（`eslint-config-next`）を使用。PR 前に安全な修正を適用。
- コンポーネント: `PascalCase.tsx`。フック: `useSomething.ts`。
- API ルートは `route.ts`、フォルダはケバブケース（例: `generate-video`）。
- 可能ならパスエイリアスを使用: `import X from "@/app/..."`。
- スタイルは Tailwind。ユーティリティは整理し、繰り返しは小さなコンポーネントへ抽出。

## テスト方針
- まだテストランナーは未設定。追加する場合は Vitest + React Testing Library を推奨。
- テスト名: `*.test.ts` / `*.test.tsx`。コードと同階層または `src/__tests__` 配下。
- スナップショットに依存せず、コンポーネントの振る舞いと API ハンドラのロジックを重視。

## コミットおよび PR ガイドライン
- Conventional Commits を推奨: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`, `test:`。
  - 例: `feat(api): add status polling endpoint`, `fix(ui): handle HEIC preview fallback`。日本語でわかりやすいコミット内容にすること
- PR には以下を含める:
  - 変更内容と背景（必要なら Issue へのリンク）。
  - UI 変更はスクショ/GIF。
  - `pnpm lint` と `pnpm build` が通ること。環境変数を変更した場合は `env.example` も更新。

## セキュリティと設定のヒント
- `.env.local` や API キーはコミットしない。クライアントに露出する変数は `NEXT_PUBLIC_` 接頭辞が必要。
- 機密処理は `src/app/api` 配下（サーバー専用）に置く。秘密情報をログ出力しない。
- デプロイ（例: Vercel）では `NEXT_PUBLIC_GEMINI_API_KEY` をプロジェクト設定に追加。
