import {
  buildCollectionOwnershipResult,
  parseCollectionListPage,
  parseCollectionTooltipName,
  type ParsedCollectionListItem,
  type ResolvedLodestoneCollectionItem,
} from './parseCollectionOwnership.js'
import type {
  LodestoneMountOwnershipResult,
  LodestoneMountUnmatchedEntry,
} from '../../types/lodestoneMount.js'

const CATEGORY = 'マウント'
const LIST_PAGE_CONFIG = {
  category1: CATEGORY,
  listPath: 'mount' as const,
  totalClassNames: ['mount__sort__total', 'minion__sort__total'],
  tooltipLabelClass: 'mount__header__label',
}

export type ParsedMountListItem = ParsedCollectionListItem

export function parseMountListPage(html: string) {
  return parseCollectionListPage(html, LIST_PAGE_CONFIG)
}

export function parseMountTooltipName(html: string): string | null {
  return parseCollectionTooltipName(html, LIST_PAGE_CONFIG.tooltipLabelClass)
}

export type ResolvedLodestoneMount = ResolvedLodestoneCollectionItem

export function buildMountOwnershipResult(
  characterId: string,
  totalOnLodestone: number,
  lodestoneMounts: ResolvedLodestoneMount[],
  unmatchedFromFetch: LodestoneMountUnmatchedEntry[],
): LodestoneMountOwnershipResult {
  return buildCollectionOwnershipResult(
    CATEGORY,
    characterId,
    totalOnLodestone,
    lodestoneMounts,
    unmatchedFromFetch,
  )
}
