import type { CSSProperties } from 'react'
import type { CollectionOwnershipIndex } from '../../lib/lodestone/collectionOwnershipIndex'
import type { CardSectionName, SearchDictionaryItem, TargetFrameTheme, TargetItem } from '../../types/card'
import { resolveLayoutSectionBackground } from '../../utils/layoutSectionBackground'
import { WantSlotColumn } from './WantSlotColumn'

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
  collectionOwnershipIndex: CollectionOwnershipIndex | null
}

const secondaryRankVariants = ['silver', 'bronze'] as const
const secondaryRankSlots = ['wantRank2', 'wantRank3'] as const

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
  collectionOwnershipIndex,
}: WantSlotPanelProps) {
  return (
    <>
      {targets.slice(1, 3).map((target, relativeIndex) => {
        const targetIndex = relativeIndex + 1

        return (
          <WantSlotColumn
            key={targetIndex}
            targetIndex={targetIndex}
            target={target}
            rankVariant={secondaryRankVariants[relativeIndex] ?? 'bronze'}
            sectionBackgroundStyle={getCardSectionBackgroundStyle(
              resolveLayoutSectionBackground('want', secondaryRankSlots[relativeIndex] ?? 'wantRank3'),
            )}
            targetFrameTheme={targetFrameTheme}
            effectivePreviewMode={effectivePreviewMode}
            targetSearchQuery={targetSearchQueries[targetIndex] ?? ''}
            onTargetSearchQueryChange={(query) => updateTargetSearchQuery(targetIndex, query)}
            onSelectSearchTarget={(item) => selectSearchTarget(targetIndex, item)}
            onSelectUnsupportedTarget={() => selectUnsupportedTarget(targetIndex)}
            onCommentChange={(comment) => updateSecondaryTargetComment(targetIndex, comment)}
            collectionOwnershipIndex={collectionOwnershipIndex}
          />
        )
      })}
    </>
  )
}
