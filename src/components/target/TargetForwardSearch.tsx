import { useState } from 'react'
import type { ForwardAcquisitionCategory, SearchDictionaryItem } from '../../types/card'
import {
  forwardSearchCategory1Options,
  getForwardAcquisitionCategories,
  getForwardContentNames,
  getForwardDetails,
  getForwardSearchCandidates,
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
  const [detail, setDetail] = useState('')

  const acquisitionOptions = getForwardAcquisitionCategories(category1)
  const contentOptions = getForwardContentNames(category1, acquisitionCategory)
  const detailOptions = getForwardDetails(category1, acquisitionCategory, contentName)
  const candidates = getForwardSearchCandidates({
    category1,
    acquisitionCategory,
    contentName,
    detail,
  }).slice(0, 40)

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
            setDetail('')
          }}
        >
          <option value="">選択してください</option>
          {contentOptions.map((option) => (
            <option key={option.key} value={option.key}>{option.displayName}</option>
          ))}
        </select>
      </label>

      {detailOptions.length > 0 && (
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
          ⑤ 候補
          {contentName && <span>{candidates.length}件</span>}
        </div>

        {!contentName && (
          <p className="forwardSearchHint">種類・入手カテゴリ・コンテンツを選ぶと候補が表示されます。</p>
        )}

        {contentName && candidates.length === 0 && (
          <p className="forwardSearchHint">条件に一致する候補がありません。</p>
        )}

        {contentName && candidates.length > 0 && (
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
