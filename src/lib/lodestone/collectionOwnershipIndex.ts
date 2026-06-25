import type {
  LodestoneCollectionMissingEntry,
  LodestoneCollectionOwnedEntry,
  LodestoneCollectionOwnershipResult,
  LodestoneCollectionUnmatchedEntry,
} from '../../types/lodestoneCollection'
import type {
  LodestoneCollectionCategoryKey,
  LodestoneCollectionsResult,
} from '../../types/lodestoneCollections'

export const COLLECTION_CATEGORY_TO_SEARCH_CATEGORY1: Record<LodestoneCollectionCategoryKey, string> = {
  minions: 'ミニオン',
  mounts: 'マウント',
  emotes: 'エモート',
  faceAccessories: 'フェイスアクセサリー',
}

export const SEARCH_CATEGORY1_TO_COLLECTION_KEY: Record<string, LodestoneCollectionCategoryKey> = {
  ミニオン: 'minions',
  マウント: 'mounts',
  エモート: 'emotes',
  フェイスアクセサリー: 'faceAccessories',
}

export function getCollectionCategoryKeyForSearchCategory1(
  category1: string,
): LodestoneCollectionCategoryKey | null {
  return SEARCH_CATEGORY1_TO_COLLECTION_KEY[category1] ?? null
}

export function isCollectionMissingFilterCategory1(category1: string): boolean {
  return category1 in SEARCH_CATEGORY1_TO_COLLECTION_KEY
}

export type CollectionOwnershipCategoryIndex = {
  owned: LodestoneCollectionOwnedEntry[]
  missing: LodestoneCollectionMissingEntry[]
  unmatchedOwned: LodestoneCollectionUnmatchedEntry[]
  ownedItemIds: Set<number>
  ownedSourceIds: Set<string>
  missingItemIds: Set<number>
  missingSourceIds: Set<string>
}

export type CollectionOwnershipIndex = {
  characterId: string
  generatedAt: string
  categories: Record<LodestoneCollectionCategoryKey, CollectionOwnershipCategoryIndex | null>
}

type OwnableLookupItem = {
  id?: number | null
  sourceDictionaryId?: string | null
  name?: string
}

function addItemId(set: Set<number>, itemId: number | null | undefined) {
  if (itemId != null) {
    set.add(itemId)
  }
}

function addSourceId(set: Set<string>, sourceDictionaryId: string | undefined) {
  if (sourceDictionaryId) {
    set.add(sourceDictionaryId)
  }
}

function buildCategoryIndex(
  ownership: LodestoneCollectionOwnershipResult | undefined,
): CollectionOwnershipCategoryIndex | null {
  if (!ownership) {
    return null
  }

  const ownedItemIds = new Set<number>()
  const ownedSourceIds = new Set<string>()
  const missingItemIds = new Set<number>()
  const missingSourceIds = new Set<string>()

  for (const entry of ownership.owned) {
    addItemId(ownedItemIds, entry.itemId)
    addSourceId(ownedSourceIds, entry.sourceDictionaryId)
  }

  for (const entry of ownership.missing) {
    addItemId(missingItemIds, entry.itemId)
    addSourceId(missingSourceIds, entry.sourceDictionaryId)
  }

  return {
    owned: ownership.owned,
    missing: ownership.missing,
    unmatchedOwned: ownership.unmatchedOwned,
    ownedItemIds,
    ownedSourceIds,
    missingItemIds,
    missingSourceIds,
  }
}

export function buildCollectionOwnershipIndex(
  result: LodestoneCollectionsResult,
): CollectionOwnershipIndex {
  return {
    characterId: result.characterId,
    generatedAt: result.generatedAt,
    categories: {
      minions: buildCategoryIndex(result.collections.minions),
      mounts: buildCategoryIndex(result.collections.mounts),
      emotes: buildCategoryIndex(result.collections.emotes),
      faceAccessories: buildCategoryIndex(result.collections.faceAccessories),
    },
  }
}

export function matchesCollectionOwnershipLookup(
  item: OwnableLookupItem,
  itemIds: Set<number>,
  sourceIds: Set<string>,
): boolean {
  if (item.id != null && itemIds.has(item.id)) {
    return true
  }

  if (item.sourceDictionaryId && sourceIds.has(item.sourceDictionaryId)) {
    return true
  }

  return false
}

export function isItemInCollectionMissing(
  index: CollectionOwnershipIndex,
  categoryKey: LodestoneCollectionCategoryKey,
  item: OwnableLookupItem,
): boolean {
  const category = index.categories[categoryKey]

  if (!category) {
    return false
  }

  return matchesCollectionOwnershipLookup(item, category.missingItemIds, category.missingSourceIds)
}

export function isItemInCollectionOwned(
  index: CollectionOwnershipIndex,
  categoryKey: LodestoneCollectionCategoryKey,
  item: OwnableLookupItem,
): boolean {
  const category = index.categories[categoryKey]

  if (!category) {
    return false
  }

  return matchesCollectionOwnershipLookup(item, category.ownedItemIds, category.ownedSourceIds)
}

export function filterItemsByCollectionMissingOnly<T extends OwnableLookupItem>(
  items: T[],
  index: CollectionOwnershipIndex | null,
  categoryKey: LodestoneCollectionCategoryKey,
  missingOnly: boolean,
): T[] {
  if (!missingOnly || !index) {
    return items
  }

  return items.filter((item) => isItemInCollectionMissing(index, categoryKey, item))
}
