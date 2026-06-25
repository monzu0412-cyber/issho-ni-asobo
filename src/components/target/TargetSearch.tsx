import { useMemo, useState } from 'react'
import type { SearchDictionaryItem } from '../../types/card'
import type { CollectionOwnershipIndex } from '../../lib/lodestone/collectionOwnershipIndex'
import { applyCollectionMissingFilterToSearchResults } from '../../lib/wanted/collectionMissingFilter'
import { CollectionMissingFilterBar } from './CollectionMissingFilterBar'
import {
  getSearchItemIconUrl,
  getSearchResults,
  normalizeSearchText,
  withResolvedSearchItem,
} from './targetSearchHelpers'
import { TargetForwardSearch } from './TargetForwardSearch'

export function TargetSearch({
  query,
  onQueryChange,
  onSelect,
  onSelectUnsupported,
  collectionOwnershipIndex,
}: {
  query: string
  onQueryChange: (value: string) => void
  onSelect: (item: SearchDictionaryItem) => void
  onSelectUnsupported: () => void
  collectionOwnershipIndex: CollectionOwnershipIndex | null
}) {
  const [isForwardOpen, setIsForwardOpen] = useState(false)
  const [missingOnly, setMissingOnly] = useState(false)
  const hasSearchQuery = normalizeSearchText(query).length > 0
  const results = useMemo(() => {
    const rawResults = getSearchResults(query)

    return applyCollectionMissingFilterToSearchResults(
      rawResults,
      collectionOwnershipIndex,
      missingOnly,
    )
  }, [collectionOwnershipIndex, missingOnly, query])

  return (
    <div className="targetSearch">
      <label>
        欲しいものを検索
        <input
          type="search"
          value={query}
          placeholder="アイテム名・コンテンツ名で検索"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <button
        className="unsupportedTargetSelect"
        type="button"
        onClick={onSelectUnsupported}
      >
        辞書にないもの → 未対応アイテム
      </button>

      <button
        className="forwardSearchToggle"
        type="button"
        onClick={() => setIsForwardOpen((current) => !current)}
      >
        {isForwardOpen ? '閉じる' : '条件から探す'}
      </button>

      <CollectionMissingFilterBar
        collectionOwnershipIndex={collectionOwnershipIndex}
        missingOnly={missingOnly}
        onMissingOnlyChange={setMissingOnly}
      />

      {isForwardOpen ? (
        <TargetForwardSearch
          collectionOwnershipIndex={collectionOwnershipIndex}
          missingOnly={missingOnly}
          onSelect={(item) => {
            onSelect(withResolvedSearchItem(item))
            setIsForwardOpen(false)
          }}
        />
      ) : hasSearchQuery ? (
        <div className="searchResultList">
          {results.length === 0 ? (
            <p className="forwardSearchHint">
              {missingOnly && collectionOwnershipIndex
                ? '未所持に一致する候補がありません。'
                : '一致する候補がありません。'}
            </p>
          ) : null}
          {results.map((item) => {
            const iconUrl = getSearchItemIconUrl(item)

            return (
            <button
              key={`${item.sourceDictionaryId}-${item.name}`}
              type="button"
              onClick={() => onSelect(withResolvedSearchItem(item))}
            >
              {iconUrl && <img src={iconUrl} alt="" />}
              <span>{item.name}</span>
              <small>{item.category} / {item.subCategory}</small>
            </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
