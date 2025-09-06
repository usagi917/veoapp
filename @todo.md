現在のTODO:

- [x] estimateCps に energetic を fast 相当(8cps)で対応する。
- [x] API: /api/generate にて script が空文字（trim後）なら 400 invalid_input を返すガードを追加する（要TDD）。
- [x] UI: トーンの選択肢説明（例: energetic=元気/ハキハキ）をヘルプ文言として追加（要テスト）。

メモ:

- energetic というUIのラベルに対して、内部CPSが normal のままだと分割ロジックと一致しない可能性があったため、まずはスクリプト層で整合を取りました。
