import type { CSSProperties } from 'react'
import { SECONDARY_TARGET_COMMENT_MAX_LENGTH } from '../../utils/cardDraftStorage'
import type { CardSectionName, SearchDictionaryItem, TargetFrameTheme, TargetItem } from '../../types/card'
import { getImageCrossOrigin, getTargetFrameUrl, getWantTitleSizeClass } from '../../utils/cardDisplayUtils'
import { TargetDetails } from '../target/TargetDetails'
import { TargetSearch } from '../target/TargetSearch'

type WantSlotPanelProps = {
  targets: TargetItem[]
  targetFrameTheme: TargetFrameTheme
  effectivePreviewMode: boolean
  targetSearchQueries: string[]
  getCardSectionBackgroundStyle: (section: CardSectionName) => CSSProperties
  updateSecondaryTargetComment: (targetIndex: number, comment: string) => void
  updateTargetSearchQuery: (targetIndex: number, query: string) => void
  selectSearchTarget: (targetIndex: number, item: SearchDictionaryItem) => void
  selectUnsupportedTarget: (targetIndex: number) => void
}

export function WantSlotPanel({
  targets,
  targetFrameTheme,
  effectivePreviewMode,
  targetSearchQueries,
  getCardSectionBackgroundStyle,
  updateSecondaryTargetComment,
  updateTargetSearchQuery,
  selectSearchTarget,
  selectUnsupportedTarget,
}: WantSlotPanelProps) {
  return (
    <>
      {targets.slice(1, 3).map((target, relativeIndex) => {
        const index = relativeIndex + 1
        const slotBackgrounds: CardSectionName[] = ['row2_center', 'row2_right']
        const wantSlotFrameUrl = getTargetFrameUrl(target, targetFrameTheme)

        return (
          <section
            className="activityColumn wantSlotColumn"
            key={index}
            style={getCardSectionBackgroundStyle(slotBackgrounds[relativeIndex] ?? 'row2_right')}
          >
            <div
              className={`sectionTitle wantRankTitle--${relativeIndex === 0 ? 'silver' : 'bronze'}`}
            >
              ほしいもの{index + 1}位！
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
              <TargetDetails target={target} />

              <div className="targetEditForm">
                <label>
                  一言コメント
                  <input
                    type="text"
                    maxLength={SECONDARY_TARGET_COMMENT_MAX_LENGTH}
                    value={target.comment ?? ''}
                    onChange={(event) => updateSecondaryTargetComment(index, event.target.value)}
                    placeholder="例: 余裕あればお譲りください"
                  />
                </label>

                <TargetSearch
                  query={targetSearchQueries[index] ?? ''}
                  onQueryChange={(query) => updateTargetSearchQuery(index, query)}
                  onSelect={(item) => selectSearchTarget(index, item)}
                  onSelectUnsupported={() => selectUnsupportedTarget(index)}
                />
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}
