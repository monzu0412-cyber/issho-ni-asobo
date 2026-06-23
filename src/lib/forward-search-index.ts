import forwardSearchIndexJson from '../data/reverse-search/generated/forward_search_index.generated.json'
import type {
  EnrichedSearchItem,
  EquipRole,
  EquipSlot,
  EquipTaxonomyKey,
  ForwardContentOption,
  ForwardIndexContent,
  ForwardIndexEquipment,
  ForwardIndexItem,
  ForwardIndexSeriesGroup,
  ForwardStep2Category,
  ForwardTaxonomyOption,
} from '../types/card'

type ForwardSearchIndexFile = {
  version?: number
  type?: string
  equipment?: ForwardIndexEquipment
}

const forwardSearchIndex = forwardSearchIndexJson as ForwardSearchIndexFile
const navigationRoots = forwardSearchIndex.equipment?.navigationRoots ?? []

const EQUIP_SLOT_ORDER: EquipSlot[] = ['頭', '胴', '手', '脚', '足']
const EQUIP_ROLE_ORDER: EquipRole[] = ['タンク', 'ヒーラー', 'メレー', 'レンジ', 'キャスター', '共通']

const step2CategoryOrder = new Map<ForwardStep2Category, number>([
  ['零式', 0],
  ['ノーマルレイド', 1],
  ['極', 2],
  ['ID', 3],
  ['地図', 4],
  ['交換', 5],
  ['釣り', 6],
  ['PvP', 7],
  ['その他', 8],
  ['探索', 9],
])

function isEquipSlotKey(key: string): key is EquipSlot {
  return (EQUIP_SLOT_ORDER as string[]).includes(key)
}

function isEquipRoleKey(key: string): key is EquipRole {
  return (EQUIP_ROLE_ORDER as string[]).includes(key)
}

function flattenContents(): ForwardIndexContent[] {
  return navigationRoots
    .flatMap((root) => root.navigationGroups)
    .flatMap((group) => group.contents)
}

function flattenIndexItems(): ForwardIndexItem[] {
  return flattenContents()
    .flatMap((content) => content.chains)
    .flatMap((chain) => chain.series)
    .flatMap((series) => series.items)
}

function findContent(step2Category: string, contentName: string): ForwardIndexContent | undefined {
  if (step2Category === '探索') {
    const explorationRoot = navigationRoots.find((root) => root.navigationRoot === '探索')

    return explorationRoot?.navigationGroups
      .flatMap((group) => group.contents)
      .find((content) => content.contentName === contentName)
  }

  const battleRoot = navigationRoots.find((root) => root.navigationRoot === '戦闘コンテンツ')

  return battleRoot?.navigationGroups
    .flatMap((group) => group.contents)
    .find((content) => content.contentName === contentName && content.acquisitionCategory === step2Category)
}

export function usesForwardSearchIndex(category1: string): boolean {
  return category1 === '装備'
}

export function isExplorationStep2Category(step2Category: string): boolean {
  return step2Category === '探索'
}

export function isIdStep2Category(step2Category: string): boolean {
  return step2Category === 'ID'
}

export function isExchangeStep2Category(step2Category: string): boolean {
  return step2Category === '交換'
}

export function usesGroupedForwardContentOptions(step2Category: string): boolean {
  return isExplorationStep2Category(step2Category)
    || isIdStep2Category(step2Category)
    || isExchangeStep2Category(step2Category)
}

function sortGroupedContentOptions(left: ForwardContentOption, right: ForwardContentOption): number {
  const groupCompare = (left.groupLabel ?? '').localeCompare(right.groupLabel ?? '', 'ja')

  if (groupCompare !== 0) {
    return groupCompare
  }

  return left.displayName.localeCompare(right.displayName, 'ja')
}

export function getForwardIndexContentNames(step2Category: string): ForwardContentOption[] {
  if (step2Category === '探索') {
    const explorationRoot = navigationRoots.find((root) => root.navigationRoot === '探索')

    if (!explorationRoot) {
      return []
    }

    return explorationRoot.navigationGroups
      .flatMap((group) => group.contents.map((content) => ({
        key: content.contentName,
        displayName: content.contentDisplayName || content.contentName,
        groupLabel: group.navigationGroup,
      })))
      .sort(sortGroupedContentOptions)
  }

  const battleRoot = navigationRoots.find((root) => root.navigationRoot === '戦闘コンテンツ')

  if (!battleRoot) {
    return []
  }

  if (step2Category === 'ID') {
    return battleRoot.navigationGroups
      .filter((group) => group.acquisitionCategory === 'ID')
      .flatMap((group) => group.contents
        .filter((content) => content.acquisitionCategory === step2Category)
        .map((content) => ({
          key: content.contentName,
          displayName: content.contentDisplayName || content.contentName,
          groupLabel: group.navigationGroup,
        })))
      .sort(sortGroupedContentOptions)
  }

  if (step2Category === '交換') {
    return battleRoot.navigationGroups
      .filter((group) => group.acquisitionCategory === '交換')
      .flatMap((group) => group.contents
        .filter((content) => content.acquisitionCategory === step2Category)
        .map((content) => ({
          key: content.contentName,
          displayName: content.contentDisplayName || content.contentName,
          groupLabel: group.navigationGroup,
        })))
      .sort(sortGroupedContentOptions)
  }

  return battleRoot.navigationGroups
    .flatMap((group) => group.contents)
    .filter((content) => content.acquisitionCategory === step2Category)
    .map((content) => ({
      key: content.contentName,
      displayName: content.contentDisplayName || content.contentName,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ja'))
}

export function getForwardIndexAcquisitionCategories(): ForwardStep2Category[] {
  const categories = new Set<ForwardStep2Category>()

  const battleRoot = navigationRoots.find((root) => root.navigationRoot === '戦闘コンテンツ')

  if (battleRoot) {
    for (const content of battleRoot.navigationGroups.flatMap((group) => group.contents)) {
      categories.add(content.acquisitionCategory)
    }
  }

  const explorationRoot = navigationRoots.find((root) => root.navigationRoot === '探索')

  if (explorationRoot && explorationRoot.navigationGroups.some((group) => group.contents.length > 0)) {
    categories.add('探索')
  }

  return [...categories].sort(
    (left, right) => (step2CategoryOrder.get(left) ?? 99) - (step2CategoryOrder.get(right) ?? 99),
  )
}

export function getForwardIndexTaxonomyOptions(
  step2Category: string,
  contentName: string,
): ForwardTaxonomyOption[] {
  const items = getForwardIndexItems({
    step2Category,
    contentName,
  })

  const slotCounts = new Map<EquipSlot, number>()
  const roleCounts = new Map<EquipRole, number>()

  for (const item of items) {
    if (item.slot) {
      slotCounts.set(item.slot, (slotCounts.get(item.slot) ?? 0) + 1)
    }

    roleCounts.set(item.role, (roleCounts.get(item.role) ?? 0) + 1)
  }

  const options: ForwardTaxonomyOption[] = []

  for (const slot of EQUIP_SLOT_ORDER) {
    const count = slotCounts.get(slot) ?? 0

    if (count === 0) {
      continue
    }

    options.push({
      key: slot,
      displayName: `${slot}（${count}）`,
      kind: 'slot',
      count,
    })
  }

  for (const role of EQUIP_ROLE_ORDER) {
    const count = roleCounts.get(role) ?? 0

    if (count === 0) {
      continue
    }

    options.push({
      key: role,
      displayName: `${role}（${count}）`,
      kind: 'role',
      count,
    })
  }

  return options
}

export function getForwardIndexItems(filters: {
  step2Category: string
  contentName: string
  taxonomy?: EquipTaxonomyKey | ''
}): ForwardIndexItem[] {
  const content = findContent(filters.step2Category, filters.contentName)

  if (!content) {
    return []
  }

  return content.chains
    .flatMap((chain) => chain.series)
    .flatMap((series) => series.items)
    .filter((item) => {
      if (!filters.taxonomy) {
        return true
      }

      if (isEquipSlotKey(filters.taxonomy)) {
        return item.slot === filters.taxonomy
      }

      if (isEquipRoleKey(filters.taxonomy)) {
        return item.role === filters.taxonomy
      }

      return true
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'ja'))
}

export function groupForwardIndexCandidatesBySeries(items: EnrichedSearchItem[]): ForwardIndexSeriesGroup[] {
  const groups = new Map<string, EnrichedSearchItem[]>()

  for (const item of items) {
    const seriesKey = item.name.split('・')[0]?.trim() ?? item.name
    const bucket = groups.get(seriesKey) ?? []
    bucket.push(item)
    groups.set(seriesKey, bucket)
  }

  return [...groups.entries()]
    .map(([seriesKey, groupedItems]) => ({
      seriesKey,
      items: groupedItems.sort((left, right) => left.name.localeCompare(right.name, 'ja')),
    }))
    .sort((left, right) => left.seriesKey.localeCompare(right.seriesKey, 'ja'))
}

export function getForwardIndexCounts() {
  const items = flattenIndexItems()
  const chains = flattenContents().flatMap((content) => content.chains)
  const contents = flattenContents()
  const series = chains.flatMap((chain) => chain.series)

  return {
    items: items.length,
    chains: chains.length,
    contents: contents.length,
    series: series.length,
    navigationRoots: navigationRoots.length,
  }
}

export function getForwardIndexVersion(): number {
  return forwardSearchIndex.version ?? 1
}
