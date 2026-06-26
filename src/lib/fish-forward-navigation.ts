import fishZoneExpansionJson from '../data/reverse-search/manual/fish_zone_expansion_dictionary.json'
import type {
  AcquisitionRoute,
  FishExpansionAreaLabel,
  FishForwardStep2Category,
  SourceDictionaryItem,
} from '../types/card'

export const FISH_FORWARD_STEP2_ORDER = [
  '釣り',
  'ヌシ',
  'オオヌシ',
  'オーシャンフィッシング',
] as const satisfies readonly FishForwardStep2Category[]

export const FISH_EXPANSION_AREA_ORDER = [
  '新生エリア',
  '蒼天エリア',
  '紅蓮エリア',
  '漆黒エリア',
  '暁月エリア',
  '黄金エリア',
  'ディアデム等',
  'その他特殊',
] as const satisfies readonly FishExpansionAreaLabel[]

type FishZoneExpansionEntry = {
  zone?: string
  expansionArea?: string
}

const fishZoneExpansionByZone = new Map<string, FishExpansionAreaLabel>(
  (fishZoneExpansionJson as FishZoneExpansionEntry[])
    .filter((entry) => entry.zone?.trim() && entry.expansionArea?.trim())
    .map((entry) => [entry.zone!.trim(), entry.expansionArea!.trim() as FishExpansionAreaLabel]),
)

const fishExpansionAreaOrder = new Map<FishExpansionAreaLabel, number>(
  FISH_EXPANSION_AREA_ORDER.map((label, index) => [label, index]),
)

const OCEAN_FISHING_PATTERN = /The Endeavor|Ocean Fishing|Spectral Current/i

const fishForwardStep2Order = new Map<FishForwardStep2Category, number>(
  FISH_FORWARD_STEP2_ORDER.map((category, index) => [category, index]),
)

export function isFishForwardSearchCategory1(category1: string | null | undefined): boolean {
  return category1 === '魚'
}

export function isFishForwardStep2Category(value: string): value is FishForwardStep2Category {
  return (FISH_FORWARD_STEP2_ORDER as readonly string[]).includes(value)
}

export function usesFishExpansionAreaNavigation(acquisitionCategory: string): boolean {
  return acquisitionCategory === '釣り'
    || acquisitionCategory === 'ヌシ'
    || acquisitionCategory === 'オオヌシ'
}

export function isFishExpansionAreaLabel(value: string): value is FishExpansionAreaLabel {
  return (FISH_EXPANSION_AREA_ORDER as readonly string[]).includes(value)
}

export function resolveFishZoneExpansionArea(
  contentName: string | null | undefined,
): FishExpansionAreaLabel | null {
  const trimmed = contentName?.trim()

  if (!trimmed) {
    return null
  }

  return fishZoneExpansionByZone.get(trimmed) ?? null
}

export function sortFishExpansionAreaLabels(
  labels: Iterable<FishExpansionAreaLabel>,
): FishExpansionAreaLabel[] {
  return [...new Set(labels)].sort(
    (left, right) => (fishExpansionAreaOrder.get(left) ?? 99) - (fishExpansionAreaOrder.get(right) ?? 99),
  )
}

export function getFishZoneExpansionDictionarySize(): number {
  return fishZoneExpansionByZone.size
}

export function isOceanFishingRoute(route: AcquisitionRoute): boolean {
  const blob = [
    route.contentName,
    route.detail,
    JSON.stringify(route.specialConditions ?? {}),
  ].join(' ')

  return OCEAN_FISHING_PATTERN.test(blob)
}

export function isOceanFishingSource(source: SourceDictionaryItem): boolean {
  return (source.acquisitionRoutes ?? []).some((route) => isOceanFishingRoute(route))
}

export function resolveFishForwardStep2Category(source: SourceDictionaryItem): FishForwardStep2Category {
  if (isOceanFishingSource(source)) {
    return 'オーシャンフィッシング'
  }

  if (source.subCategory === 'オオヌシ') {
    return 'オオヌシ'
  }

  if (source.subCategory === 'ヌシ') {
    return 'ヌシ'
  }

  return '釣り'
}

export function sortFishForwardStep2Categories(
  categories: Iterable<FishForwardStep2Category>,
): FishForwardStep2Category[] {
  return [...new Set(categories)].sort(
    (left, right) => (fishForwardStep2Order.get(left) ?? 99) - (fishForwardStep2Order.get(right) ?? 99),
  )
}

export function getFishForwardStep2CategoriesFromEnrichedItems(
  items: Iterable<{ category1?: string | null; acquisitionCategory: string }>,
): FishForwardStep2Category[] {
  const categories = new Set<FishForwardStep2Category>()

  for (const item of items) {
    if (item.category1 !== '魚') {
      continue
    }

    if (isFishForwardStep2Category(item.acquisitionCategory)) {
      categories.add(item.acquisitionCategory)
    }
  }

  return sortFishForwardStep2Categories(categories)
}
