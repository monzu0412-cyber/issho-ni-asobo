import {
  buildCollectionOwnershipResult,
  parseCollectionListPage,
  parseCollectionTooltipName,
  type ParsedCollectionListItem,
  type ResolvedLodestoneCollectionItem,
} from './parseCollectionOwnership.js'
import {
  getFaceAccessoryDictionaryEntries,
  lookupFaceAccessoryDictionaryEntry,
  FACE_ACCESSORY_DICTIONARY_CATEGORY,
} from './faceAccessoryDictionary.js'
import type {
  LodestoneFaceAccessoryOwnershipResult,
  LodestoneFaceAccessoryUnmatchedEntry,
} from '../../types/lodestoneFaceAccessory.js'

const CATEGORY = FACE_ACCESSORY_DICTIONARY_CATEGORY
const LIST_PAGE_CONFIG = {
  category1: CATEGORY,
  listPath: 'faceaccessory' as const,
  totalClassNames: ['faceaccessory__sort__total'],
  tooltipLabelClass: 'faceaccessory__header__label',
}

export type ParsedFaceAccessoryListItem = ParsedCollectionListItem

export function parseFaceAccessoryListPage(html: string) {
  return parseCollectionListPage(html, LIST_PAGE_CONFIG)
}

export function parseFaceAccessoryTooltipName(html: string): string | null {
  return parseCollectionTooltipName(html, LIST_PAGE_CONFIG.tooltipLabelClass)
}

export type ResolvedLodestoneFaceAccessory = ResolvedLodestoneCollectionItem

export function buildFaceAccessoryOwnershipResult(
  characterId: string,
  totalOnLodestone: number,
  lodestoneFaceAccessories: ResolvedLodestoneFaceAccessory[],
  unmatchedFromFetch: LodestoneFaceAccessoryUnmatchedEntry[],
): LodestoneFaceAccessoryOwnershipResult {
  return buildCollectionOwnershipResult(
    CATEGORY,
    characterId,
    totalOnLodestone,
    lodestoneFaceAccessories,
    unmatchedFromFetch,
    {
      lookup: lookupFaceAccessoryDictionaryEntry,
      getEntries: getFaceAccessoryDictionaryEntries,
    },
  )
}
