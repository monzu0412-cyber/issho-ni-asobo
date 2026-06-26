# データ保護ルール（DATA PROTECTION）

**目的:** 魚検索事故と同種の「削除・上書き・再生成による意図しない喪失」を繰り返さない。

**適用順序（固定）:**

```
復元調査完了
  ↓
保護ルール FIX（本ドキュメント + ベースライン検証）
  ↓
Master / Cursor 相互確認
  ↓
魚検索の再構築（または復元）
```

**本ドキュメント更新前に、魚 forward search の再実装・再配線へ進まない。**

---

## 1. 保護対象の洗い出し

### Tier A — 正本（失われると復旧コストが最大）

手編集・監査完了済み。**無差別な再生成・一括 apply 禁止。**

| 資産 | パス | 現行ベースライン（2026-06-26） | 喪失時の影響 |
|---|---|---|---|
| 入手元辞書（全体） | `src/data/reverse-search/manual/source_dictionary.json` | 7966件（下表内訳） | 検索・カード詳細・順引きの根拠が全滅 |
| ├ 魚 | 同上 `category1=魚` / `id=source_fish_*` | **2399**（魚1739 / ヌシ611 / オオヌシ49） | 釣り条件・②分類のデータ根拠 |
| ├ ミニオン | 同上 | 571 | 収集検索 |
| ├ マウント | 同上 | 346 | 収集検索 |
| ├ エモート | 同上 | 198（Phase E FIX） | 収集検索 |
| ├ 髪型 | 同上 | 49（Phase F FIX） | 収集検索 |
| ├ ファッションアクセサリー | 同上 | 34（Phase G FIX） | 収集検索 |
| ├ 譜面 | 同上 | 862 | 収集検索 |
| └ 装備 | 同上 | 3507（拡張作業中・凍結対象） | 装備 forward index・メタデータ |
| コンテンツ辞書 | `manual/content_dictionary.json` | navigationPath 含む | 装備③④・収集 exchange 分類 |
| シリーズ辞書 | `manual/series_dictionary.json` | 装備 series 紐づけ | 装備分類 |
| item override | `manual/item_override_dictionary.json` | item ID 単位確定 | 曖昧装備の誤分類 |
| 魚用語翻訳 | `manual/fish_term_translation_dictionary.json` | 餌・天候・伝承録等 | 魚カード表示 |
| 場所翻訳 | `manual/location_translation_dictionary.json` | 404件 | 魚・順引き③の日本語化 |
| コンテンツ翻訳 | `manual/content_translation_dictionary.json` | マウント/譜面等 | 順引き③日本語化 |
| アイテム名辞書 | `manual/item_name_dictionary.json` | 検索名・日本語名 | 逆引き候補 |
| チェーン registry | `manual/acquisition_chain_registry.json` | verified chains | 装備 forward index |
| 検証記録（頭） | `manual/verification_records/head/*.json` | 外部照合証跡 | 装備監査の再現不可 |
| invite 辞書 | `src/data/invite/inviteContentDictionary.ts` | 誘って！中項目 | カード募集表示（魚中項目は別系統） |
| 興味ツリー | `src/data/contentCategories.ts` | 釣り含む14大分類 | 興味・invite 抽出元 |

### Tier B — 生成物（再生成可能だが、正本変更後にのみ更新）

| 資産 | パス | 生成元 |
|---|---|---|
| 検索辞書 | `generated/search_dictionary.generated.json` | `scripts/generate-reverse-search.ts` |
| base items | `generated/base_items.generated.json` | 同上 |
| unclassified | `generated/unclassified_items.generated.json` | 同上 |
| forward index | `generated/forward_search_index.generated.json` | `scripts/generate-forward-search-index.ts`（**装備のみ**） |
| equip slot map | `generated/equip_slot_by_item_id.generated.json` | `scripts/generate-equip-slot-by-item-id.ts` |
| equipment metadata | `generated/equipment_metadata_by_item_id.generated.json` | `scripts/generate-equipment-metadata-by-item-id.ts` |
| item icons | `generated/item_icon_by_item_id.generated.json` | generate-reverse-search 内 |

**ルール:** Tier B だけの変更では Tier A の意図を変えない。Tier A を変えたらベースライン検証 → 必要な生成のみ。

### Tier C — スキーマ・ポリシー（変更は設計判断）

`src/data/reverse-search/schema/*.json` — enum・publication gate・forward index policy 等。

### Tier D — 検索 UI ロジック（カテゴリ横断変更の影響大）

| 領域 | 主要ファイル | 分離要件 |
|---|---|---|
| 収集系 forward ② | `src/lib/collectible-forward-acquisition.ts` | 魚は `mapLegacyAcquisitionCategory` 経由のみ |
| 収集系 forward ③④ | `src/lib/collectible-forward-navigation.ts` | 魚 category1 では未使用 |
| 装備 forward | `src/lib/forward-search-index.ts` | **装備のみ**。魚を混ぜない |
| 汎用順引き | `src/components/target/targetSearchHelpers.ts` | 魚・装備・収集の分岐を壊さない |
| 魚詳細表示 | `src/components/target/TargetDetails.tsx` | `FishRouteDetails` |

**将来の魚 forward ② 専用化時:** `fish-forward-navigation.ts` 等新規ファイルで分離し、収集系・装備系へ触れない。

---

## 2. 削除・上書き・再生成から守るルール

### R1. 正本は `manual/`。外部 API は参照のみ

- Teamcraft / XIVAPI / Lodestone / Wiki は**参照元**。
- 正本は `docs/ROADMAP.md` 方針どおりプロジェクト辞書。

### R2. カテゴリスコープを越えない

| 操作 | 触ってよい範囲 | 触ってはいけない範囲 |
|---|---|---|
| 魚生成 `generate-fish-source-dictionary.ts` | `source_fish_*` の追加・マージ | 装備・収集他カテゴリのエントリ |
| 装備 apply `apply-phase-l*.ts` | 対象 item ID / series のみ | `category1=魚` エントリ |
| 収集 forward UI 変更 | collectible-forward-* | 魚の legacy マップ・装備 index |
| `generate-reverse-search.ts` | Tier B 全体再生成 | manual 直接編集の代替に使わない |

### R3. 一括書き込みの前に必ず dry-run とベースライン

1. `node --experimental-strip-types scripts/verify-data-protection-baseline.ts` を**実行前**に PASS
2. 生成系は `--dry-run` があれば必ず先に実行
3. 実行後、再度ベースライン検証
4. 差分は `category1` / `id`  prefix 単位で目視確認

### R4. `source_dictionary.json` の魚エントリ保護

- 魚 ID 形式: `source_fish_{itemId}`
- `generate-fish-source-dictionary.ts` は実行時に**全 fish 行を一度除外してから再結合**する実装のため、誤実行リスクが高い
- **魚バッチ再実行は Master 明示指示 + ベースライン前後確認がある場合のみ**

### R5. 装備フェーズ凍結（ROADMAP 既存ルールの厳守）

`docs/ROADMAP.md` 装備検索 凍結ルールをそのまま適用:

- **禁止:** 新 series / 新部位 / source 再分類 / forward index 件数増加 / 装備 UI 大改修
- **許可:** 明確な不具合修正 / 表示崩れ / 監査期待値更新 / ドキュメント

### R6. git・作業ツリー

- 大規模辞書変更前にコミット（または Master が指定するスナップショット手段）
- `git stash` による辞書のみの一時退避は、魚・装備混在時は避ける
- dangling commit `7dae68d` 型（装備大量追加・魚不変）のような未コミット差分は、保護確認前にマージしない

### R7. 実装順序の固定

1. 復元調査の完了宣言
2. 本保護ルール + ベースライン検証の PASS
3. Master OK
4. 魚の復元 or 再配線（**新規分類の設計決めは復元不能が確定してから**）

### R8. 調査完了前の禁止事項（再掲）

- 魚 forward ② の新規分類設計・実装
- 収集系ロジックへの魚混在
- 装備辞書・forward index への影響を伴う変更
- ベースライン未検証での `generate-*` / `apply-*` 本番実行

---

## 3. 再生成パイプライン（安全な順序）

```
manual/ 辞書の意図した変更（スコープ限定）
  ↓
verify-data-protection-baseline.ts  （Tier A 件数）
  ↓
必要な generate-* のみ（スコープ確認）
  ↓
verify-data-protection-baseline.ts  （Tier A + Tier B）
  ↓
npm run build && npm run lint
  ↓
カテゴリ別 verify-* （装備・収集・魚は分離）
```

---

## 4. 相互確認チェックリスト（Master × Cursor）

作業セッション開始時・辞書変更後に実施。

| # | 確認項目 | 手段 | 担当 |
|---|---|---|---|
| 1 | 魚 2399件・内訳不変 | `verify-data-protection-baseline.ts` | Cursor 実行 → Master 結果確認 |
| 2 | 収集 FIX 件数（198/49/34 等）不変 | 同上 | 同上 |
| 3 | 装備 source 件数が凍結方針と矛盾しない | 同上 + ROADMAP | Master 判断 |
| 4 | 変更ファイルが R2 スコープ内か | `git diff --stat` で category 確認 | Cursor 報告 → Master OK |
| 5 | 収集 UI 変更が魚 legacy マップを触っていない | diff で `mapLegacyAcquisitionCategory` / 魚分岐 | Cursor |
| 6 | forward index 件数増加なし（凍結時） | `verify-phase61-forward-index.ts` 等 | Cursor |
| 7 | 本番反映前の localhost 確認 | Master ブラウザ | Master |

**PASS 基準:** ベースライン検証が exit 0。スコープ違反 diff なし。Master がセッション OK を明示。

---

## 5. ベースライン検証コマンド

```bash
node --experimental-strip-types scripts/verify-data-protection-baseline.ts
```

出力: `scripts/output/data-protection-baseline-verify.json`

件数が意図的に変わる場合は、**本ドキュメントのベースライン表とスクリプト内定数を同時に更新**し、Master OK 後にのみ変更する。

---

## 6. 今回の魚事故からの教訓（記録）

- **データ本体（2399件）は repo 内に残存**していたが、forward ② の期待表示と乖離し「失われた」ように見えた
- 原因は単一ファイル削除より、**(a) UI 未配線 (b) カテゴリ系統の混同 (c) 保護ルール未整備**の複合
- `海釣り` / `通常魚` は invite・contentCategories 系には近いが、forward search ② としては git / Local History に存在しなかった
- 今後は **Tier A ベースライン + カテゴリ分離 + 調査完了ゲート** で同種事故を防ぐ

---

## 7. 関連ドキュメント

- `docs/ROADMAP.md` — Phase 進捗・装備凍結・魚 FIX 件数
- `src/data/reverse-search/schema/publication_gate_policy.json` — 装備公開ゲート
- `src/data/reverse-search/schema/forward_search_index_policy.json` — 装備 forward index 範囲
