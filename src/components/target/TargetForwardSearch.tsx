import { useMemo, useState } from 'react'
import type { EquipTaxonomyKey, ForwardAcquisitionCategory, SearchDictionaryItem } from '../../types/card'
import {
  forwardSearchCategory1Options,
  getForwardAcquisitionCategories,
  getForwardContentNames,
  getForwardDetails,
  getForwardSearchCandidates,
  getForwardTaxonomyOptions,
  getSearchItemIconUrl,
  withResolvedSearchItem,
} from './targetSearchHelpers'

export function TargetForwardSearch({
  onSelect,
}: {
  onSelect: (item: SearchDictionaryItem) => void
}) {
  const [category1, setCategory1] = useState('')
  const [acquisitionCategory, setAcquisitionCategory] = useState<ForwardAcquisitionCategory | ''>('')
  const [contentName, setContentName] = useState('')
  const [taxonomy, setTaxonomy] = useState<EquipTaxonomyKey | ''>('')
  const [detail, setDetail] = useState('')

  const acquisitionOptions = getForwardAcquisitionCategories(category1)
  const contentOptions = getForwardContentNames(category1, acquisitionCategory)
  const taxonomyOptions = getForwardTaxonomyOptions(category1, acquisitionCategory, contentName)
  const detailOptions = getForwardDetails(category1, acquisitionCategory, contentName)
  const usesEquipmentTaxonomy = category1 === '装備'

  const candidateFilters = useMemo(() => ({
    category1,
    acquisitionCategory,
    contentName,
    detail,
    taxonomy,
  }), [category1, acquisitionCategory, contentName, detail, taxonomy])

  const allCandidates = getForwardSearchCandidates(candidateFilters)
  const candidates = allCandidates.slice(0, 40)

  const slotTaxonomyOptions = taxonomyOptions.filter((option) => option.kind === 'slot')
  const roleTaxonomyOptions = taxonomyOptions.filter((option) => option.kind === 'role')

  const canShowCandidates = Boolean(contentName) && (!usesEquipmentTaxonomy || Boolean(taxonomy))

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
            setAcquisitionCategory(event.target.value as ForwardAcquisitionCategory | '')
            setContentName('')
            setTaxonomy('')
            setDetail('')
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
          }}
        >
          <option value="">選択してください</option>
          {contentOptions.map((option) => (
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
              {allCandidates.length > candidates.length ? `（先頭${candidates.length}件を表示）` : ''}
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

        {canShowCandidates && allCandidates.length > 0 && (
          <div className="searchResultList forwardSearchResultList">
            {candidates.map((item) => {
              const iconUrl = item.resolvedIconUrl ?? getSearchItemIconUrl(item)

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
        )}
      </div>
    </div>
  )
}
