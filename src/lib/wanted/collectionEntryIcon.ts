import {
  getSearchItemIconUrl,
  resolveIconUrlByItemId,
  resolveSearchDictionaryItemByItemId,
  resolveSearchDictionaryItemBySourceId,
} from '../../components/target/targetSearchHelpers'

export function resolveCollectionEntryIconUrl(entry: {
  itemId: number | null
  sourceDictionaryId?: string
}): string | null {
  if (entry.sourceDictionaryId) {
    const bySourceId = resolveSearchDictionaryItemBySourceId(entry.sourceDictionaryId)

    if (bySourceId) {
      const iconUrl = getSearchItemIconUrl(bySourceId)

      if (iconUrl) {
        return iconUrl
      }
    }
  }

  if (entry.itemId != null) {
    const byItemId = resolveSearchDictionaryItemByItemId(entry.itemId)

    if (byItemId) {
      const iconUrl = getSearchItemIconUrl(byItemId)

      if (iconUrl) {
        return iconUrl
      }
    }

    return resolveIconUrlByItemId(entry.itemId)
  }

  return null
}
