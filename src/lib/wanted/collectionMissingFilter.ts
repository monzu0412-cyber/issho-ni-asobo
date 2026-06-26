import type { EnrichedSearchItem, ForwardContentOption, SearchDictionaryItem } from '../../types/card'
import type { LodestoneCollectionCategoryKey } from '../../types/lodestoneCollections'
import {
  getFishForwardExpansionAreaOptions,
  getForwardAcquisitionCategories,
  getForwardContentNames,
  getForwardSearchCandidates,
} from '../../components/target/targetSearchHelpers'
import {
  filterItemsByCollectionMissingOnly,
  getCollectionCategoryKeyForSearchCategory1,
  type CollectionOwnershipIndex,
} from '../lodestone/collectionOwnershipIndex'

function hasMissingForwardCandidates(
  category1: string,
  acquisitionCategory: string,
  contentName: string,
  index: CollectionOwnershipIndex,
  categoryKey: LodestoneCollectionCategoryKey,
): boolean {
  const candidates = getForwardSearchCandidates({
    category1,
    acquisitionCategory,
    contentName,
    detail: '',
    taxonomy: '',
  })

  return filterItemsByCollectionMissingOnly(candidates, index, categoryKey, true).length > 0
}

export function filterForwardAcquisitionCategoriesForMissingOnly(
  category1: string,
  acquisitionCategories: string[],
  index: CollectionOwnershipIndex | null,
  categoryKey: LodestoneCollectionCategoryKey | null,
  missingOnly: boolean,
): string[] {
  if (!missingOnly || !index || !categoryKey || !category1) {
    return acquisitionCategories
  }

  return acquisitionCategories.filter((acquisitionCategory) => {
    const contentOptions = getForwardContentNames(category1, acquisitionCategory)

    return contentOptions.some((content) => (
      hasMissingForwardCandidates(category1, acquisitionCategory, content.key, index, categoryKey)
    ))
  })
}

export function filterForwardContentOptionsForMissingOnly(
  category1: string,
  acquisitionCategory: string,
  contentOptions: ForwardContentOption[],
  index: CollectionOwnershipIndex | null,
  categoryKey: LodestoneCollectionCategoryKey | null,
  missingOnly: boolean,
): ForwardContentOption[] {
  if (!missingOnly || !index || !categoryKey || !category1 || !acquisitionCategory) {
    return contentOptions
  }

  return contentOptions.filter((content) => (
    hasMissingForwardCandidates(category1, acquisitionCategory, content.key, index, categoryKey)
  ))
}

export function getForwardAcquisitionCategoriesForCollectionMissingFilter(
  category1: string,
  index: CollectionOwnershipIndex | null,
  categoryKey: LodestoneCollectionCategoryKey | null,
  missingOnly: boolean,
): string[] {
  const acquisitionCategories = getForwardAcquisitionCategories(category1)

  return filterForwardAcquisitionCategoriesForMissingOnly(
    category1,
    acquisitionCategories,
    index,
    categoryKey,
    missingOnly,
  )
}

export function getForwardContentNamesForCollectionMissingFilter(
  category1: string,
  acquisitionCategory: string,
  index: CollectionOwnershipIndex | null,
  categoryKey: LodestoneCollectionCategoryKey | null,
  missingOnly: boolean,
  expansionArea?: string,
): ForwardContentOption[] {
  const contentOptions = getForwardContentNames(category1, acquisitionCategory, expansionArea)

  return filterForwardContentOptionsForMissingOnly(
    category1,
    acquisitionCategory,
    contentOptions,
    index,
    categoryKey,
    missingOnly,
  )
}

export function getFishForwardExpansionAreasForCollectionMissingFilter(
  category1: string,
  acquisitionCategory: string,
  index: CollectionOwnershipIndex | null,
  categoryKey: LodestoneCollectionCategoryKey | null,
  missingOnly: boolean,
): string[] {
  const expansionAreas = getFishForwardExpansionAreaOptions(category1, acquisitionCategory)

  if (!missingOnly || !index || !categoryKey || !category1 || !acquisitionCategory) {
    return expansionAreas
  }

  return expansionAreas.filter((expansionArea) => (
    getForwardContentNamesForCollectionMissingFilter(
      category1,
      acquisitionCategory,
      index,
      categoryKey,
      missingOnly,
      expansionArea,
    ).length > 0
  ))
}

export function applyCollectionMissingFilterToForwardCandidates(
  items: EnrichedSearchItem[],
  index: CollectionOwnershipIndex | null,
  categoryKey: LodestoneCollectionCategoryKey | null,
  missingOnly: boolean,
): EnrichedSearchItem[] {
  if (!categoryKey) {
    return items
  }

  return filterItemsByCollectionMissingOnly(items, index, categoryKey, missingOnly)
}

export function applyCollectionMissingFilterToSearchResults(
  items: SearchDictionaryItem[],
  index: CollectionOwnershipIndex | null,
  missingOnly: boolean,
): SearchDictionaryItem[] {
  if (!missingOnly || !index) {
    return items
  }

  return items.filter((item) => {
    const categoryKey = getCollectionCategoryKeyForSearchCategory1(item.category1 ?? '')

    if (!categoryKey) {
      return true
    }

    return filterItemsByCollectionMissingOnly([item], index, categoryKey, true).length > 0
  })
}
