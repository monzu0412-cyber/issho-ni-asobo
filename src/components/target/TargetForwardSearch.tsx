import { useMemo, useState } from 'react'
import type { EnrichedSearchItem, EquipTaxonomyKey, ForwardStep2Category, SearchDictionaryItem } from '../../types/card'
import { formatEquipmentMetadataSummary } from '../../lib/equipment-metadata'
import {
  groupForwardSearchBySavageSeries,
  isSavageSeriesGroupPilot,
  type SavageSeriesGroup,
} from './savageSeriesGroup'
import {
  forwardSearchCategory1Options,
  getForwardAcquisitionCategories,
  getForwardContentNames,
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
}: {
  onSelect: (item: SearchDictionaryItem) => void
}) {
  const [category1, setCategory1] = useState('')
  const [acquisitionCategory, setAcquisitionCategory] = useState<ForwardStep2Category | ''>('')
  const [contentName, setContentName] = useState('')
  const [taxonomy, setTaxonomy] = useState<EquipTaxonomyKey | ''>('')
  const [detail, setDetail] = useState('')
  const [showRelatedSeries, setShowRelatedSeries] = useState(false)

  const acquisitionOptions = getForwardAcquisitionCategories(category1)
  const contentOptions = getForwardContentNames(category1, acquisitionCategory)
  const taxonomyOptions = getForwardTaxonomyOptions(category1, acquisitionCategory, contentName)
  const detailOptions = getForwardDetails(category1, acquisitionCategory, contentName)
  const usesEquipmentTaxonomy = category1 === '装備'
  const canShowCandidates = Boolean(contentName) && (!usesEquipmentTaxonomy || Boolean(taxonomy))

  const candidateFilters = useMemo(() => ({
    category1,
    acquisitionCategory,
    contentName,
    detail,
    taxonomy,
  }), [category1, acquisitionCategory, contentName, detail, taxonomy])

  const allCandidates = getForwardSearchCandidates(candidateFilters)
  const usesIndexForwardSearch = usesForwardSearchIndex(category1)
  const usesGroupedContentOptions = usesIndexForwardSearch && usesGroupedForwardContentOptions(acquisitionCategory)

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
  const indexSeriesGroups = usesIndexForwardSearch && canShowCandidates && allCandidates.length > 0
    ? groupForwardIndexCandidatesBySeries(allCandidates)
    : null
  const usesSavageSeriesGrouping = !usesIndexForwardSearch && isSavageSeriesGroupPilot({
    category1,
    acquisitionCategory,
    contentName,
    taxonomy,
  })
  const savageSeriesGroups = usesSavageSeriesGrouping
    ? groupForwardSearchBySavageSeries(allCandidates)
    : null
  const candidates = usesSavageSeriesGrouping ? allCandidates : allCandidates.slice(0, 40)

  const slotTaxonomyOptions = taxonomyOptions.filter((option) => option.kind === 'slot')
  const roleTaxonomyOptions = taxonomyOptions.filter((option) => option.kind === 'role')

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
          value={acquisitionCategory}
          disabled={!category1}
          onChange={(event) => {
            setAcquisitionCategory(event.target.value as ForwardStep2Category | '')
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

      <label>
        ③ コンテンツ
        <select
          value={contentName}
          disabled={!acquisitionCategory}
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

      {usesEquipmentTaxonomy && contentName && taxonomyOptions.length > 0 && (
        <label>
          ④ 分類
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
          ④ 詳細
          <select
            value={detail}
            disabled={!contentName}
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
          {usesEquipmentTaxonomy ? '⑤ 候補' : '⑤ 候補'}
          {canShowCandidates && (
            <span>
              {allCandidates.length}件
              {!usesSavageSeriesGrouping && allCandidates.length > candidates.length
                ? `（先頭${candidates.length}件を表示）`
                : ''}
            </span>
          )}
        </div>

        {!contentName && (
          <p className="forwardSearchHint">種類・入手カテゴリ・コンテンツを選ぶと候補が表示されます。</p>
        )}

        {contentName && usesEquipmentTaxonomy && !taxonomy && (
          <p className="forwardSearchHint">分類を選ぶと装備一覧が表示されます。</p>
        )}

        {canShowCandidates && allCandidates.length === 0 && (
          <p className="forwardSearchHint">条件に一致する候補がありません。</p>
        )}

        {canShowCandidates && allCandidates.length > 0 && indexSeriesGroups && (
          <div className="forwardSearchSeriesPanel">
            {indexSeriesGroups.map((group) => renderIndexSeriesGroup(group))}
          </div>
        )}

        {canShowCandidates && allCandidates.length > 0 && savageSeriesGroups && (
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

        {canShowCandidates && allCandidates.length > 0 && !indexSeriesGroups && !savageSeriesGroups && (
          <div className="searchResultList forwardSearchResultList">
            {candidates.map((item) => renderCandidateButton(item))}
          </div>
        )}
      </div>
    </div>
  )
}
