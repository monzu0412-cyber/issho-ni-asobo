import fishItemIconByItemIdJson from '../data/reverse-search/generated/fish_item_icon_by_item_id.generated.json'

type FishItemIconRecord = {
  itemId: number
  iconUrl: string
}

type FishItemIconFile = {
  items?: FishItemIconRecord[]
}

const fishItemIconByItemId = new Map<number, string>()

function loadFishItemIconByItemId() {
  const raw = fishItemIconByItemIdJson as FishItemIconFile | FishItemIconRecord[]
  const items = Array.isArray(raw) ? raw : raw.items ?? []

  for (const item of items) {
    if (item.iconUrl) {
      fishItemIconByItemId.set(item.itemId, item.iconUrl)
    }
  }
}

loadFishItemIconByItemId()

export function resolveFishItemIconUrl(itemId: number | null | undefined): string | null {
  if (itemId == null) {
    return null
  }

  return fishItemIconByItemId.get(itemId) ?? null
}

export function getFishItemIconLookupSize(): number {
  return fishItemIconByItemId.size
}
