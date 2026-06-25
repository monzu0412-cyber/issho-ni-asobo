import {
  buildCollectionOwnershipResult,
  parseCollectionListPage,
  parseCollectionTooltipName,
  type ParsedCollectionListItem,
  type ResolvedLodestoneCollectionItem,
} from './parseCollectionOwnership.js'
import type {
  LodestoneMinionOwnershipResult,
  LodestoneMinionUnmatchedEntry,
} from '../../types/lodestoneMinion.js'

const CATEGORY = 'ミニオン'
const LIST_PAGE_CONFIG = {
  category1: CATEGORY,
  listPath: 'minion' as const,
  totalClassNames: ['minion__sort__total'],
  tooltipLabelClass: 'minion__header__label',
}

export type ParsedMinionListItem = ParsedCollectionListItem

export function parseMinionListPage(html: string) {
  return parseCollectionListPage(html, LIST_PAGE_CONFIG)
}

export function parseMinionTooltipName(html: string): string | null {
  return parseCollectionTooltipName(html, LIST_PAGE_CONFIG.tooltipLabelClass)
}

export type ResolvedLodestoneMinion = ResolvedLodestoneCollectionItem

export function buildMinionOwnershipResult(
  characterId: string,
  totalOnLodestone: number,
  lodestoneMinions: ResolvedLodestoneMinion[],
  unmatchedFromFetch: LodestoneMinionUnmatchedEntry[],
): LodestoneMinionOwnershipResult {
  return buildCollectionOwnershipResult(
    CATEGORY,
    characterId,
    totalOnLodestone,
    lodestoneMinions,
    unmatchedFromFetch,
  )
}
