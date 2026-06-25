import type { CSSProperties } from 'react'
import { SECONDARY_TARGET_COMMENT_MAX_LENGTH } from '../../utils/cardDraftStorage'
import type { CollectionOwnershipIndex } from '../../lib/lodestone/collectionOwnershipIndex'
import type { SearchDictionaryItem, TargetFrameTheme, TargetItem } from '../../types/card'
import { targetFrameThemeOptions } from '../../types/card'
import { getImageCrossOrigin, getTargetFrameUrl, getWantTitleSizeClass } from '../../utils/cardDisplayUtils'
import { TargetDetails } from '../target/TargetDetails'
import { TargetSearch } from '../target/TargetSearch'

type WantRankVariant = 'gold' | 'silver' | 'bronze'

type WantSlotColumnProps = {
  targetIndex: number
  target: TargetItem
  rankVariant: WantRankVariant
  sectionBackgroundStyle: CSSProperties
  targetFrameTheme: TargetFrameTheme
  effectivePreviewMode: boolean
  targetSearchQuery: string
  onTargetSearchQueryChange: (query: string) => void
  onSelectSearchTarget: (item: SearchDictionaryItem) => void
  onSelectUnsupportedTarget: () => void
  onCommentChange: (comment: string) => void
  showFrameThemeSelect?: boolean
  onTargetFrameThemeChange?: (theme: TargetFrameTheme) => void
  collectionOwnershipIndex: CollectionOwnershipIndex | null
}

export function WantSlotColumn({
  targetIndex,
  target,
  rankVariant,
  sectionBackgroundStyle,
  targetFrameTheme,
  effectivePreviewMode,
  targetSearchQuery,
  onTargetSearchQueryChange,
  onSelectSearchTarget,
  onSelectUnsupportedTarget,
  onCommentChange,
  showFrameThemeSelect = false,
  onTargetFrameThemeChange,
  collectionOwnershipIndex,
}: WantSlotColumnProps) {
  const wantSlotFrameUrl = getTargetFrameUrl(target, targetFrameTheme)

  return (
    <section
      className="activityColumn wantSlotColumn"
      style={sectionBackgroundStyle}
    >
      <div className={`sectionTitle wantRankTitle--${rankVariant}`}>
        ほしいもの{targetIndex + 1}位！
      </div>
      <div
        className={`targetItem wantSlotItem${wantSlotFrameUrl ? ' hasWantSlotFrame' : ''}`}
      >
        {wantSlotFrameUrl && (
          <img
            className="wantSlotFrame"
            src={wantSlotFrameUrl}
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        )}
        <div className={`wantSlotTitleGroup ${getWantTitleSizeClass(target.title)}`}>
          {effectivePreviewMode && (
            target.iconUrl ? (
              <img className="wantSlotIcon" src={target.iconUrl} alt="" crossOrigin={getImageCrossOrigin(target.iconUrl)} />
            ) : target.icon ? (
              <span className="wantSlotIconFallback" aria-hidden="true">{target.icon}</span>
            ) : null
          )}
          <strong className="wantSlotTitle">{target.title}</strong>
        </div>
        {effectivePreviewMode && target.comment?.trim() ? (
          <p className="wantSlotComment">{target.comment.trim()}</p>
        ) : null}
        <div className={`wantSlotCategory ${getWantTitleSizeClass(`${target.category} / ${target.subcategory}`)}`}>
          {target.category} / {target.subcategory}
        </div>
        <TargetDetails
          target={target}
          showEquipmentMetadata={!effectivePreviewMode}
          showCurrencyEarn={!effectivePreviewMode}
        />

        <div className="targetEditForm">
          <label>
            一言コメント
            <input
              type="text"
              maxLength={SECONDARY_TARGET_COMMENT_MAX_LENGTH}
              value={target.comment ?? ''}
              onChange={(event) => onCommentChange(event.target.value)}
              placeholder="例: 余裕あればお譲りください"
            />
          </label>

          <TargetSearch
            query={targetSearchQuery}
            onQueryChange={onTargetSearchQueryChange}
            onSelect={onSelectSearchTarget}
            onSelectUnsupported={onSelectUnsupportedTarget}
            collectionOwnershipIndex={collectionOwnershipIndex}
          />

          {showFrameThemeSelect && onTargetFrameThemeChange && (
            <label>
              フレーム
              <select
                value={targetFrameTheme}
                onChange={(event) => onTargetFrameThemeChange(event.target.value as TargetFrameTheme)}
              >
                {targetFrameThemeOptions.map((theme) => (
                  <option key={theme.value} value={theme.value}>{theme.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
    </section>
  )
}
