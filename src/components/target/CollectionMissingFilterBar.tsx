import type { CollectionOwnershipIndex } from '../../lib/lodestone/collectionOwnershipIndex'

type CollectionMissingFilterBarProps = {
  collectionOwnershipIndex: CollectionOwnershipIndex | null
  missingOnly: boolean
  onMissingOnlyChange: (value: boolean) => void
  activeCategory1?: string
}

export function CollectionMissingFilterBar({
  collectionOwnershipIndex,
  missingOnly,
  onMissingOnlyChange,
  activeCategory1,
}: CollectionMissingFilterBarProps) {
  const hasOwnership = collectionOwnershipIndex != null

  return (
    <div className="collectionMissingFilterBar">
      <label className="collectionMissingFilterToggle">
        <input
          type="checkbox"
          checked={missingOnly}
          disabled={!hasOwnership}
          onChange={(event) => onMissingOnlyChange(event.target.checked)}
        />
        未所持のみ表示
      </label>
      {!hasOwnership ? (
        <p className="collectionMissingFilterHint">
          未所持フィルターを使うには、先にロードストーン取得を行ってください。
        </p>
      ) : activeCategory1 ? (
        <p className="collectionMissingFilterHint">
          {activeCategory1} の候補に未所持フィルターを適用します（カテゴリ階層は変えません）。
        </p>
      ) : (
        <p className="collectionMissingFilterHint">
          ミニオン・マウント・エモート・フェイスアクセサリーに横断フィルターとして適用します。
        </p>
      )}
    </div>
  )
}
