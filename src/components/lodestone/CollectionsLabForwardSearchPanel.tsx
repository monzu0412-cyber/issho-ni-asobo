import { useMemo, useState } from 'react'
import type { ForwardStep2Category } from '../../types/card'
import type { LodestoneCollectionCategoryKey } from '../../types/lodestoneCollections'
import type { CollectionOwnershipCategoryIndex, CollectionOwnershipIndex } from '../../lib/lodestone/collectionOwnershipIndex'
import { COLLECTION_CATEGORY_TO_SEARCH_CATEGORY1 } from '../../lib/lodestone/collectionOwnershipIndex'
import { applyCollectionMissingFilterToForwardCandidates } from '../../lib/wanted/collectionMissingFilter'
import {
  getForwardAcquisitionCategories,
  getForwardContentNames,
  getForwardSearchCandidates,
  getSearchItemIconUrl,
} from '../target/targetSearchHelpers'

type CollectionsLabForwardSearchPanelProps = {
  categoryKey: LodestoneCollectionCategoryKey
  ownershipIndex: CollectionOwnershipIndex
  categoryOwnership: CollectionOwnershipCategoryIndex | null
}

type FaceAccessoryBrowseEntry = {
  key: string
  name: string
  itemId: number | null
  sourceDictionaryId?: string
  owned: boolean
}

function buildFaceAccessoryBrowseEntries(
  categoryOwnership: CollectionOwnershipCategoryIndex | null,
): FaceAccessoryBrowseEntry[] {
  if (!categoryOwnership) {
    return []
  }

  const entries = new Map<string, FaceAccessoryBrowseEntry>()

  for (const entry of categoryOwnership.owned) {
    const key = entry.sourceDictionaryId ?? `item:${entry.itemId ?? entry.name}`
    entries.set(key, {
      key,
      name: entry.name,
      itemId: entry.itemId,
      sourceDictionaryId: entry.sourceDictionaryId,
      owned: true,
    })
  }

  for (const entry of categoryOwnership.missing) {
    const key = entry.sourceDictionaryId ?? `item:${entry.itemId ?? entry.name}`
    entries.set(key, {
      key,
      name: entry.name,
      itemId: entry.itemId,
      sourceDictionaryId: entry.sourceDictionaryId,
      owned: false,
    })
  }

  return [...entries.values()].sort((left, right) => left.name.localeCompare(right.name, 'ja'))
}

export function CollectionsLabForwardSearchPanel({
  categoryKey,
  ownershipIndex,
  categoryOwnership,
}: CollectionsLabForwardSearchPanelProps) {
  const [missingOnly, setMissingOnly] = useState(false)
  const [acquisitionCategory, setAcquisitionCategory] = useState<ForwardStep2Category | ''>('')
  const [contentName, setContentName] = useState('')

  const category1 = COLLECTION_CATEGORY_TO_SEARCH_CATEGORY1[categoryKey]
  const isFaceAccessory = categoryKey === 'faceAccessories'

  const acquisitionOptions = useMemo(
    () => (isFaceAccessory ? [] : getForwardAcquisitionCategories(category1)),
    [category1, isFaceAccessory],
  )

  const contentOptions = useMemo(
    () => (isFaceAccessory || !acquisitionCategory ? [] : getForwardContentNames(category1, acquisitionCategory)),
    [acquisitionCategory, category1, isFaceAccessory],
  )

  const allCandidates = useMemo(() => {
    if (isFaceAccessory || !acquisitionCategory || !contentName) {
      return []
    }

    return getForwardSearchCandidates({
      category1,
      acquisitionCategory,
      contentName,
      detail: '',
      taxonomy: '',
    })
  }, [acquisitionCategory, category1, contentName, isFaceAccessory])

  const filteredCandidates = useMemo(
    () => applyCollectionMissingFilterToForwardCandidates(
      allCandidates,
      ownershipIndex,
      categoryKey,
      missingOnly,
    ),
    [allCandidates, categoryKey, missingOnly, ownershipIndex],
  )

  const faceAccessoryEntries = useMemo(
    () => buildFaceAccessoryBrowseEntries(categoryOwnership),
    [categoryOwnership],
  )

  const filteredFaceAccessoryEntries = useMemo(
    () => (missingOnly
      ? faceAccessoryEntries.filter((entry) => !entry.owned)
      : faceAccessoryEntries),
    [faceAccessoryEntries, missingOnly],
  )

  function handleAcquisitionChange(value: string) {
    setAcquisitionCategory(value as ForwardStep2Category | '')
    setContentName('')
  }

  return (
    <section className="collectionsLabForwardSearch">
      <div className="collectionsLabForwardSearchHeader">
        <h4>順引き検索 + 未所持フィルター検証</h4>
        <label className="collectionsLabMissingFilterToggle">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(event) => setMissingOnly(event.target.checked)}
          />
          未所持のみ表示
        </label>
      </div>

      <p className="collectionsLabCategoryMessage collectionsLabCategoryMessage--info">
        分類構造（{category1} → 入手カテゴリ → コンテンツ）はそのまま。未所持は横断フィルターとして適用します。
      </p>

      {!isFaceAccessory ? (
        <>
          <div className="collectionsLabForwardSearchFilters">
            <label className="collectionsLabForwardSearchField">
              入手カテゴリ
              <select
                value={acquisitionCategory}
                onChange={(event) => handleAcquisitionChange(event.target.value)}
              >
                <option value="">選択してください</option>
                {acquisitionOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="collectionsLabForwardSearchField">
              コンテンツ
              <select
                value={contentName}
                disabled={!acquisitionCategory}
                onChange={(event) => setContentName(event.target.value)}
              >
                <option value="">選択してください</option>
                {contentOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.displayName}</option>
                ))}
              </select>
            </label>
          </div>

          {!acquisitionCategory || !contentName ? (
            <p className="collectionsLabEmpty">入手カテゴリとコンテンツを選ぶと候補が表示されます。</p>
          ) : filteredCandidates.length > 0 ? (
            <>
              <p className="collectionsLabForwardSearchCounts">
                表示 {filteredCandidates.length} 件
                {missingOnly ? '（未所持のみ）' : '（全件）'}
                {allCandidates.length !== filteredCandidates.length && (
                  <> / フィルター前 {allCandidates.length} 件</>
                )}
              </p>
              <ul className="collectionsLabForwardSearchResults">
                {filteredCandidates.map((item) => {
                  const iconUrl = item.resolvedIconUrl ?? getSearchItemIconUrl(item)

                  return (
                    <li key={`${item.sourceDictionaryId ?? 'item'}-${item.name}`}>
                      {iconUrl ? <img src={iconUrl} alt="" /> : null}
                      <span className="collectionsLabItemName">{item.name}</span>
                      <span className="collectionsLabItemMeta">
                        {item.acquisitionCategory} / {item.contentDisplayName || item.contentName}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="collectionsLabEmpty">
              {missingOnly
                ? 'この条件の未所持はありません。'
                : '条件に一致する候補がありません。'}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="collectionsLabCategoryMessage collectionsLabCategoryMessage--info">
            フェイスアクセサリーは順引き辞書未登録のため、{category1} 直下の一覧でフィルターを検証します。
          </p>
          <p className="collectionsLabForwardSearchCounts">
            表示 {filteredFaceAccessoryEntries.length} 件
            {missingOnly ? '（未所持のみ）' : '（辞書照合済み 全件）'}
          </p>
          {filteredFaceAccessoryEntries.length > 0 ? (
            <ul className="collectionsLabForwardSearchResults">
              {filteredFaceAccessoryEntries.map((entry) => (
                <li key={entry.key}>
                  <span className="collectionsLabItemName">{entry.name}</span>
                  <span className="collectionsLabItemMeta">
                    {entry.owned ? '所持' : '未所持'}
                    {entry.sourceDictionaryId ? ` / ${entry.sourceDictionaryId}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="collectionsLabEmpty">
              {missingOnly ? '未所持はありません。' : '表示できるアイテムがありません。'}
            </p>
          )}
        </>
      )}
    </section>
  )
}
