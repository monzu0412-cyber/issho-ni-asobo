# ロードマップ

## 収集カテゴリ Phase 進捗

| Phase | カテゴリ | 状態 |
|---|---|---|
| E | エモート | 現時点FIX（198/198） |
| F | 髪型 | FIX（49/49） |
| G | ファッションアクセサリー | FIX（34/34） |
| H | 魚 | FIX（2399/2399 確定可能・参照2460） |

### Phase H 最終（FIX）

| 項目 | 件数 |
|---|---|
| 登録済 | 2399 / 2399（確定可能分） |
| 参照母数 | 2460（Teamcraft `fishes.json`） |
| 登録対象外 | 39（地図16 + phantom6 + 用途17） |
| deprecated | 2（Thief Betta / Peteinosaur） |
| 更新待ち | 20（`source_unresolved`・未登録） |
| review | 0 |
| unclassified | 0 |

2460/2460 とは表記しない。辞書外61件は理由別に管理する（登録対象外39 + deprecated2 + 更新待ち20）。

| マイルストーン | 件数 | 内訳 |
|---|---|---|
| 開始 | 660/2460 | ヌシ 611 + オオヌシ 49 |
| バッチ1 | 1000/2460 | +340 通常魚（fishing-sources） |
| バッチ2 | 1500/2460 | +500 通常魚（fishing-sources） |
| バッチ3 | 2000/2460 | +249 sources + 251 spots fallback |
| バッチ4 | 2399/2460 | +399 spots fallback |
| FIX | 2399/2399 | 確定可能分を全登録 |

生成スクリプト: `scripts/generate-fish-source-dictionary.ts`

## 魚完了後の固定順序

装備フェーズへは直接進まない。以下の順序を固定とする。

```
魚完了
  ↓
全体監査
  ↓
仮実装
  ↓
テスター確認
  ↓
改善反映
  ↓
装備方針判断
```

## 方針

- 外部データ（Collect / Teamcraft / XIVAPI / Wiki / Lodestone）は参照元。正本はプロジェクト辞書。
- 検索体験と入手経路の理解を優先する（翻訳率ではない）。
- 未配布コンテンツは `watch_pending_release` + 日本語 placeholder route で整理する。
