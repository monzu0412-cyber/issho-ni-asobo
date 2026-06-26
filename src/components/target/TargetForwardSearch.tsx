import { useMemo, useState } from 'react'
import type { EnrichedSearchItem, EquipTaxonomyKey, ForwardStep2Category, SearchDictionaryItem } from '../../types/card'
import { formatEquipmentMetadataSummary } from '../../lib/equipment-metadata'
import {
  getCollectionCategoryKeyForSearchCategory1,
  isCollectionMissingFilterCategory1,
  type CollectionOwnershipIndex,
} from '../../lib/lodestone/collectionOwnershipIndex'
import {
  applyCollectionMissingFilterToForwardCandidates,
  getFishForwardExpansionAreasForCollectionMissingFilter,
  getForwardAcquisitionCategoriesForCollectionMissingFilter,
  getForwardContentNamesForCollectionMissingFilter,
} from '../../lib/wanted/collectionMissingFilter'
import { usesFishExpansionAreaNavigation } from '../../lib/fish-forward-navigation'
import {
  groupForwardSearchBySavageSeries,
  isSavageSeriesGroupPilot,
  type SavageSeriesGroup,
} from './savageSeriesGroup'
import { usesCollectibleGroupedForwardContentOptions } from '../../lib/collectible-forward-navigation'
import {
  forwardSearchCategory1Options,
  getForwardDetails,
  getForwardSearchCandidates,
  getForwardTaxonomyOptions,
  getSearchItemIconUrl,
  groupForwardIndexCandidatesBySeries,
  usesForwardSearchIndex,
  usesGroupedForwardContentOptions,
  withResolvedSearchItem,
} from './targetSearchHelpers'

export function TargetForwardSearch({
  onSelect,
  collectionOwnershipIndex,
  missingOnly,
}: {
  onSelect: (item: SearchDictionaryItem) => void
  collectionOwnershipIndex: CollectionOwnershipIndex | null
  missingOnly: boolean
}) {
  const [category1, setCategory1] = useState('')
  const [acquisitionCategory, setAcquisitionCategory] = useState<ForwardStep2Category | ''>('')
  const [expansionArea, setExpansionArea] = useState('')
  const [contentName, setContentName] = useState('')
  const [taxonomy, setTaxonomy] = useState<EquipTaxonomyKey | ''>('')
  const [detail, setDetail] = useState('')
  const [showRelatedSeries, setShowRelatedSeries] = useState(false)

  const collectionCategoryKey = getCollectionCategoryKeyForSearchCategory1(category1)
  const usesCollectionMissingFilter = missingOnly
    && isCollectionMissingFilterCategory1(category1)
    && collectionOwnershipIndex != null

  const acquisitionOptions = useMemo(
    () => getForwardAcquisitionCategoriesForCollectionMissingFilter(
      category1,
      collectionOwnershipIndex,
      collectionCategoryKey,
      missingOnly,
    ),
    [category1, collectionCategoryKey, collectionOwnershipIndex, missingOnly],
  )

  const effectiveAcquisitionCategory = useMemo(() => {
    if (!acquisitionCategory) {
      return ''
    }

    if (usesCollectionMissingFilter && !acquisitionOptions.includes(acquisitionCategory)) {
      return ''
    }

    return acquisitionCategory
  }, [acquisitionCategory, acquisitionOptions, usesCollectionMissingFilter])

  const usesFishExpansionAreaStep = category1 === '魚'
    && usesFishExpansionAreaNavigation(effectiveAcquisitionCategory)

  const expansionAreaOptions = useMemo(
    () => getFishForwardExpansionAreasForCollectionMissingFilter(
      category1,
      effectiveAcquisitionCategory,
      collectionOwnershipIndex,
      collectionCategoryKey,
      missingOnly,
    ),
    [category1, collectionCategoryKey, collectionOwnershipIndex, effectiveAcquisitionCategory, missingOnly],
  )

  const effectiveExpansionArea = useMemo(() => {
    if (!expansionArea || !usesFishExpansionAreaStep) {
      return ''
    }

    if (usesCollectionMissingFilter && !expansionAreaOptions.includes(expansionArea)) {
      return ''
    }

    return expansionArea
  }, [expansionArea, expansionAreaOptions, usesCollectionMissingFilter, usesFishExpansionAreaStep])

  const contentOptions = useMemo(
    () => getForwardContentNamesForCollectionMissingFilter(
      category1,
      effectiveAcquisitionCategory,
      collectionOwnershipIndex,
      collectionCategoryKey,
      missingOnly,
      usesFishExpansionAreaStep ? effectiveExpansionArea : undefined,
    ),
    [
      category1,
      collectionCategoryKey,
      collectionOwnershipIndex,
      effectiveAcquisitionCategory,
      effectiveExpansionArea,
      missingOnly,
      usesFishExpansionAreaStep,
    ],
  )

  const effectiveContentName = useMemo(() => {
    if (!contentName || !effectiveAcquisitionCategory) {
      return ''
    }

    if (usesCollectionMissingFilter && !contentOptions.some((option) => option.key === contentName)) {
      return ''
    }

    return contentName
  }, [contentName, contentOptions, effectiveAcquisitionCategory, usesCollectionMissingFilter])

  const taxonomyOptions = getForwardTaxonomyOptions(category1, effectiveAcquisitionCategory, effectiveContentName)
  const detailOptions = getForwardDetails(category1, effectiveAcquisitionCategory, effectiveContentName)
  const usesEquipmentTaxonomy = category1 === '装備'
  const canShowCandidates = Boolean(effectiveContentName) && (!usesEquipmentTaxonomy || Boolean(taxonomy))

  const candidateFilters = useMemo(() => ({
    category1,
    acquisitionCategory: effectiveAcquisitionCategory,
    contentName: effectiveContentName,
    detail,
    taxonomy,
  }), [category1, detail, effectiveAcquisitionCategory, effectiveContentName, taxonomy])

  const allCandidates = getForwardSearchCandidates(candidateFilters)
  const filteredCandidates = useMemo(
    () => applyCollectionMissingFilterToForwardCandidates(
      allCandidates,
      collectionOwnershipIndex,
      collectionCategoryKey,
      missingOnly,
    ),
    [allCandidates, collectionCategoryKey, collectionOwnershipIndex, missingOnly],
  )
  const usesIndexForwardSearch = usesForwardSearchIndex(category1)
  const usesGroupedContentOptions = (usesIndexForwardSearch && usesGroupedForwardContentOptions(effectiveAcquisitionCategory))
    || (!usesIndexForwardSearch && usesCollectibleGroupedForwardContentOptions(effectiveAcquisitionCategory))

  const groupedContentOptions = useMemo(() => {
    if (!usesGroupedContentOptions) {
      return null
    }

    const groups = new Map<string, typeof contentOptions>()

    for (const option of contentOptions) {
      const groupLabel = option.groupLabel ?? 'その他'
      const bucket = groups.get(groupLabel) ?? []
      bucket.push(option)
      groups.set(groupLabel, bucket)
    }

    return [...groups.entries()]
  }, [contentOptions, usesGroupedContentOptions])
  const indexSeriesGroups = usesIndexForwardSearch && canShowCandidates && filteredCandidates.length > 0
    ? groupForwardIndexCandidatesBySeries(filteredCandidates)
    : null
  const usesSavageSeriesGrouping = !usesIndexForwardSearch && isSavageSeriesGroupPilot({
    category1,
    acquisitionCategory: effectiveAcquisitionCategory,
    contentName: effectiveContentName,
    taxonomy,
  })
  const savageSeriesGroups = usesSavageSeriesGrouping
    ? groupForwardSearchBySavageSeries(filteredCandidates)
    : null
  const candidates = usesSavageSeriesGrouping ? filteredCandidates : filteredCandidates.slice(0, 40)

  const slotTaxonomyOptions = taxonomyOptions.filter((option) => option.kind === 'slot')
  const roleTaxonomyOptions = taxonomyOptions.filter((option) => option.kind === 'role')
  const contentStepNumber = usesFishExpansionAreaStep ? 4 : 3
  const detailStepNumber = usesFishExpansionAreaStep ? 5 : 4
  const candidatesStepNumber = usesEquipmentTaxonomy
    ? (usesFishExpansionAreaStep ? 6 : 5)
    : (usesFishExpansionAreaStep ? 6 : 5)

  function resetSeriesGrouping() {
    setShowRelatedSeries(false)
  }

  function renderCandidateButton(item: EnrichedSearchItem) {
    const iconUrl = item.resolvedIconUrl ?? getSearchItemIconUrl(item)
    const metadataLine = item.equipLevel != null && item.itemLevel != null && item.equipRole
      ? formatEquipmentMetadataSummary({
          equipLevel: item.equipLevel,
          itemLevel: item.itemLevel,
          equipRole: item.equipRole,
          equipSlot: item.equipSlot,
        })
      : null

    return (
      <button
        key={`${item.sourceDictionaryId}-${item.name}`}
        type="button"
        onClick={() => onSelect(withResolvedSearchItem(item))}
      >
        {iconUrl && <img src={iconUrl} alt="" />}
        <span>{item.name}</span>
        {metadataLine ? <small className="forwardSearchMeta">{metadataLine}</small> : null}
        <small>{item.category} / {item.subCategory}</small>
      </button>
    )
  }

  function renderIndexSeriesGroup(group: { seriesKey: string; items: EnrichedSearchItem[] }) {
    return (
      <section key={group.seriesKey} className="forwardSearchSeriesGroup">
        <h4 className="forwardSearchSeriesGroupTitle">
          {group.seriesKey}
          <span>（{group.items.length}）</span>
        </h4>
        <div className="searchResultList forwardSearchResultList forwardSearchSeriesResultList">
          {group.items.map((item) => renderCandidateButton(item))}
        </div>
      </section>
    )
  }

  function renderSeriesGroup(group: SavageSeriesGroup, heading: string) {
    return (
      <section key={group.seriesPrefix} className="forwardSearchSeriesGroup">
        <h4 className="forwardSearchSeriesGroupTitle">
          {heading}: {group.seriesPrefix}
          <span>（{group.items.length}）</span>
        </h4>
        <div className="searchResultList forwardSearchResultList forwardSearchSeriesResultList">
          {group.items.map((item) => renderCandidateButton(item))}
        </div>
      </section>
    )
  }

  return (
    <div className="forwardSearchPanel">
      <label>
        ① 種類
        <select
          value={category1}
          onChange={(event) => {
            setCategory1(event.target.value)
            setAcquisitionCategory('')
            setExpansionArea('')
            setContentName('')
            setTaxonomy('')
            setDetail('')
            resetSeriesGrouping()
          }}
        >
          <option value="">選択してください</option>
          {forwardSearchCategory1Options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      <label>
        ② 入手カテゴリ
        <select
          value={effectiveAcquisitionCategory}
          disabled={!category1}
          onChange={(event) => {
            setAcquisitionCategory(event.target.value as ForwardStep2Category | '')
            setExpansionArea('')
            setContentName('')
            setTaxonomy('')
            setDetail('')
            resetSeriesGrouping()
          }}
        >
          <option value="">選択してください</option>
          {acquisitionOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      {usesFishExpansionAreaStep && (
        <label>
          ③ 拡張エリア
          <select
            value={effectiveExpansionArea}
            disabled={!effectiveAcquisitionCategory}
            onChange={(event) => {
              setExpansionArea(event.target.value)
              setContentName('')
              setTaxonomy('')
              setDetail('')
              resetSeriesGrouping()
            }}
          >
            <option value="">選択してください</option>
            {expansionAreaOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        {contentStepNumber} コンテンツ
        <select
          value={effectiveContentName}
          disabled={!effectiveAcquisitionCategory || (usesFishExpansionAreaStep && !effectiveExpansionArea)}
          onChange={(event) => {
            setContentName(event.target.value)
            setTaxonomy('')
            setDetail('')
            resetSeriesGrouping()
          }}
        >
          <option value="">選択してください</option>
          {groupedContentOptions
            ? groupedContentOptions.map(([groupLabel, options]) => (
              <optgroup key={groupLabel} label={groupLabel}>
                {options.map((option) => (
                  <option key={option.key} value={option.key}>{option.displayName}</option>
                ))}
              </optgroup>
            ))
            : contentOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.displayName}</option>
            ))}
        </select>
      </label>

      {usesEquipmentTaxonomy && effectiveContentName && taxonomyOptions.length > 0 && (
        <label>
          {detailStepNumber} 分類
          <select
            value={taxonomy}
            onChange={(event) => {
              setTaxonomy(event.target.value as EquipTaxonomyKey | '')
              setDetail('')
              resetSeriesGrouping()
            }}
          >
            <option value="">選択してください</option>
            {slotTaxonomyOptions.length > 0 && (
              <optgroup label="部位">
                {slotTaxonomyOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.displayName}</option>
                ))}
              </optgroup>
            )}
            {roleTaxonomyOptions.length > 0 && (
              <optgroup label="ロール">
                {roleTaxonomyOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.displayName}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      )}

      {!usesEquipmentTaxonomy && detailOptions.length > 0 && (
        <label>
          {detailStepNumber} 詳細
          <select
            value={detail}
            disabled={!effectiveContentName}
            onChange={(event) => setDetail(event.target.value)}
          >
            <option value="">指定なし</option>
            {detailOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.displayName}</option>
            ))}
          </select>
        </label>
      )}

      <div className="forwardSearchCandidates">
        <div className="forwardSearchCandidatesTitle">
          {candidatesStepNumber} 候補
          {canShowCandidates && (
            <span>
              {filteredCandidates.length}件
              {missingOnly && isCollectionMissingFilterCategory1(category1) ? '（未所持のみ）' : ''}
              {!usesSavageSeriesGrouping && filteredCandidates.length > candidates.length
                ? `（先頭${candidates.length}件を表示）`
                : ''}
              {missingOnly
                && isCollectionMissingFilterCategory1(category1)
                && allCandidates.length !== filteredCandidates.length
                ? ` / フィルター前 ${allCandidates.length} 件`
                : ''}
            </span>
          )}
        </div>

        {usesCollectionMissingFilter && category1 && acquisitionOptions.length === 0 && (
          <p className="forwardSearchHint">未所持がある入手カテゴリはありません。</p>
        )}

        {usesCollectionMissingFilter && acquisitionCategory && effectiveAcquisitionCategory && usesFishExpansionAreaStep && expansionAreaOptions.length === 0 && (
          <p className="forwardSearchHint">未所持がある拡張エリアはありません。</p>
        )}

        {usesCollectionMissingFilter && acquisitionCategory && effectiveAcquisitionCategory && contentOptions.length === 0 && (
          <p className="forwardSearchHint">未所持があるコンテンツはありません。</p>
        )}

        {usesFishExpansionAreaStep && effectiveAcquisitionCategory && !effectiveExpansionArea && (
          <p className="forwardSearchHint">拡張エリアを選ぶとゾーン一覧が表示されます。</p>
        )}

        {!usesFishExpansionAreaStep && !effectiveContentName && (
          <p className="forwardSearchHint">種類・入手カテゴリ・コンテンツを選ぶと候補が表示されます。</p>
        )}

        {usesFishExpansionAreaStep && effectiveExpansionArea && !effectiveContentName && (
          <p className="forwardSearchHint">ゾーンを選ぶと候補が表示されます。</p>
        )}

        {effectiveContentName && usesEquipmentTaxonomy && !taxonomy && (
          <p className="forwardSearchHint">分類を選ぶと装備一覧が表示されます。</p>
        )}

        {canShowCandidates && allCandidates.length > 0 && filteredCandidates.length === 0 && (
          <p className="forwardSearchHint">
            {missingOnly && isCollectionMissingFilterCategory1(category1)
              ? 'この条件の未所持はありません。'
              : '条件に一致する候補がありません。'}
          </p>
        )}

        {canShowCandidates && filteredCandidates.length > 0 && indexSeriesGroups && (
          <div className="forwardSearchSeriesPanel">
            {indexSeriesGroups.map((group) => renderIndexSeriesGroup(group))}
          </div>
        )}

        {canShowCandidates && filteredCandidates.length > 0 && savageSeriesGroups && (
          <div className="forwardSearchSeriesPanel">
            <div className="forwardSearchSeriesToolbar">
              <button
                type="button"
                className="forwardSearchSeriesToggle"
                onClick={() => setShowRelatedSeries((current) => !current)}
              >
                {showRelatedSeries ? '基本系列のみ表示' : '関連系列も表示'}
              </button>
            </div>

            {savageSeriesGroups.baseGroups.map((group) => renderSeriesGroup(group, '基本系列'))}

            {!showRelatedSeries && savageSeriesGroups.relatedGroups.length > 0 && (
              <p className="forwardSearchSeriesCollapsedSummary">
                関連系列:
                {' '}
                {savageSeriesGroups.relatedGroups
                  .map((group) => `${group.seriesPrefix}（${group.items.length}）`)
                  .join('、')}
              </p>
            )}

            {showRelatedSeries && savageSeriesGroups.relatedGroups.length > 0 && (
              <div className="forwardSearchSeriesRelatedSection">
                <h4 className="forwardSearchSeriesSectionHeading">関連系列</h4>
                {savageSeriesGroups.relatedGroups.map((group) => renderSeriesGroup(group, '関連系列'))}
              </div>
            )}

            {savageSeriesGroups.ungroupedItems.length > 0 && (
              <section className="forwardSearchSeriesGroup">
                <h4 className="forwardSearchSeriesGroupTitle">
                  その他
                  <span>（{savageSeriesGroups.ungroupedItems.length}）</span>
                </h4>
                <div className="searchResultList forwardSearchResultList forwardSearchSeriesResultList">
                  {savageSeriesGroups.ungroupedItems.map((item) => renderCandidateButton(item))}
                </div>
              </section>
            )}
          </div>
        )}

        {canShowCandidates && filteredCandidates.length > 0 && !indexSeriesGroups && !savageSeriesGroups && (
          <div className="searchResultList forwardSearchResultList">
            {candidates.map((item) => renderCandidateButton(item))}
          </div>
        )}
      </div>
    </div>
  )
}
