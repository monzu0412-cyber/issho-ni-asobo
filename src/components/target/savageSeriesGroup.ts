import type { EnrichedSearchItem, EquipTaxonomyKey, ForwardAcquisitionCategory } from '../../types/card'

/** L-10.23b pilot: 覚醒編 head only. Dictionary/contentName unchanged. */
export const SAVAGE_SERIES_GROUP_PILOT = {
  acquisitionCategory: '零式' as const satisfies ForwardAcquisitionCategory,
  contentName: '希望の園エデン零式：覚醒編',
  equipSlot: '頭' as const satisfies EquipTaxonomyKey,
  baseSeriesPrefixes: ['エデンゲート'] as const,
  relatedSeriesPrefixes: [] as const,
}

export type SavageSeriesGroupKind = 'base' | 'related'

export type SavageSeriesGroup = {
  kind: SavageSeriesGroupKind
  seriesPrefix: string
  items: EnrichedSearchItem[]
}

export type SavageSeriesGroupedCandidates = {
  contentName: string
  baseGroups: SavageSeriesGroup[]
  relatedGroups: SavageSeriesGroup[]
  ungroupedItems: EnrichedSearchItem[]
}

export function extractEquipmentSeriesPrefix(name: string) {
  return name.split('・')[0]?.trim() ?? name
}

export function isSavageSeriesGroupPilot(filters: {
  category1: string
  acquisitionCategory: string
  contentName: string
  taxonomy: EquipTaxonomyKey | ''
}) {
  const pilot = SAVAGE_SERIES_GROUP_PILOT
  return filters.category1 === '装備'
    && filters.acquisitionCategory === pilot.acquisitionCategory
    && filters.contentName === pilot.contentName
    && filters.taxonomy === pilot.equipSlot
}

export function groupForwardSearchBySavageSeries(
  items: EnrichedSearchItem[],
): SavageSeriesGroupedCandidates | null {
  const pilot = SAVAGE_SERIES_GROUP_PILOT
  const byPrefix = new Map<string, EnrichedSearchItem[]>()

  for (const item of items) {
    const seriesPrefix = extractEquipmentSeriesPrefix(item.name)
    const bucket = byPrefix.get(seriesPrefix) ?? []
    bucket.push(item)
    byPrefix.set(seriesPrefix, bucket)
  }

  const baseGroups = pilot.baseSeriesPrefixes
    .map((seriesPrefix) => ({
      kind: 'base' as const,
      seriesPrefix,
      items: byPrefix.get(seriesPrefix) ?? [],
    }))
    .filter((group) => group.items.length > 0)

  const relatedGroups = pilot.relatedSeriesPrefixes
    .map((seriesPrefix) => ({
      kind: 'related' as const,
      seriesPrefix,
      items: byPrefix.get(seriesPrefix) ?? [],
    }))
    .filter((group) => group.items.length > 0)

  const groupedPrefixes = new Set<string>([
    ...pilot.baseSeriesPrefixes,
    ...pilot.relatedSeriesPrefixes,
  ])
  const ungroupedItems = items.filter(
    (item) => !groupedPrefixes.has(extractEquipmentSeriesPrefix(item.name)),
  )

  if (baseGroups.length === 0 && relatedGroups.length === 0) {
    return null
  }

  return {
    contentName: pilot.contentName,
    baseGroups,
    relatedGroups,
    ungroupedItems,
  }
}
