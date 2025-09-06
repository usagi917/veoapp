目的: tone "energetic" を script 長さ見積もり(estimateCps)で fast 相当(8cps)として扱えるようにする。

やることの流れ:

1. 失敗するテストを追加する（Vitest + RTL ではなく単体テスト）。
2. 実装でテストをパスさせる。
3. 実行: pnpm format && pnpm lint && pnpm typecheck && pnpm test。
4. すべて合格したらコミット。
5. この plan と TODO を更新。
6. いったん停止して、続行可否を確認する。

進捗:

- [x] テスト追加: src/lib/script.cps.test.ts（estimateCps('energetic') => 8）
- [x] 実装更新: src/lib/script.ts（energetic を fast 扱いに）
- [x] format/lint/typecheck/test 全て合格
- [x] コミット作成
- [x] plan/todo 更新
- [ ] 確認待ち（次へ進めて良いか）
