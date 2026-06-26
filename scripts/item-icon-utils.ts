export type ItemIconRecord = {
  itemId: number
  iconPath: string
  iconPathHr1: string
  iconUrl: string
}

export type ItemIconLookup = Map<number, ItemIconRecord>

export function getBaseIconPath(iconPathHr1: string): string {
  return iconPathHr1.replace('_hr1.tex', '.tex')
}

export function getIconUrl(iconPathHr1: string): string {
  return `https://v2.xivapi.com/api/asset?path=${iconPathHr1}&format=png`
}

export function buildIconPathHr1FromIconId(iconId: number): string {
  const folder = String(Math.floor(iconId / 1000) * 1000).padStart(6, '0')
  const file = String(iconId).padStart(6, '0')

  return `ui/icon/${folder}/${file}_hr1.tex`
}

export function buildItemIconRecord(itemId: number, iconId: number): ItemIconRecord {
  const iconPathHr1 = buildIconPathHr1FromIconId(iconId)

  return {
    itemId,
    iconPath: getBaseIconPath(iconPathHr1),
    iconPathHr1,
    iconUrl: getIconUrl(iconPathHr1),
  }
}

export function parseGarlandIconField(icon: unknown): number | null {
  if (typeof icon === 'number' && Number.isFinite(icon)) {
    return icon
  }

  if (typeof icon !== 'string') {
    return null
  }

  const trimmed = icon.trim()

  if (!trimmed) {
    return null
  }

  const thumbnailMatch = trimmed.match(/^t\/(\d+)$/i)

  if (thumbnailMatch) {
    return Number(thumbnailMatch[1])
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  return null
}

export async function fetchGarlandItemIcon(itemId: number): Promise<ItemIconRecord | null> {
  const response = await fetch(
    `https://garlandtools.org/api/get.php?type=item&version=3&id=${itemId}&lang=en`,
    { signal: AbortSignal.timeout(15000) },
  )

  if (!response.ok) {
    return null
  }

  const payload = await response.json() as { item?: { icon?: number | string } }
  const iconId = parseGarlandIconField(payload.item?.icon)

  if (iconId == null) {
    return null
  }

  return buildItemIconRecord(itemId, iconId)
}

export function mergeIconLookups(...lookups: ItemIconLookup[]): ItemIconLookup {
  const merged: ItemIconLookup = new Map()

  for (const lookup of lookups) {
    for (const [itemId, record] of lookup) {
      merged.set(itemId, record)
    }
  }

  return merged
}
