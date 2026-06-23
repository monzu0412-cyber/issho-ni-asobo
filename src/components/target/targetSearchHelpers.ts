import searchDictionary from '../../data/reverse-search/generated/search_dictionary.generated.json'
import equipSlotByItemIdJson from '../../data/reverse-search/generated/equip_slot_by_item_id.generated.json'
import locationTranslationDictionary from '../../data/reverse-search/manual/location_translation_dictionary.json'
import fishTermTranslationDictionary from '../../data/reverse-search/manual/fish_term_translation_dictionary.json'
import contentTranslationDictionary from '../../data/reverse-search/manual/content_translation_dictionary.json'
import sourceDictionary from '../../data/reverse-search/manual/source_dictionary.json'
import { buildChainBackedContentNames, passesChainForwardGuard, resolveSourceChainId } from '../../lib/chain-forward-guard'
import {
  getEquipmentMetadataSearchNamesForItem,
  isEquipmentMetadataSearchToken,
} from '../../lib/equipment-metadata'
import {
  getForwardIndexAcquisitionCategories,
  getForwardIndexContentNames,
  getForwardIndexItems,
  getForwardIndexTaxonomyOptions,
  usesForwardSearchIndex,
} from '../../lib/forward-search-index'
import { isCardUiPublicSearchItem } from '../../lib/publication-gate'
import { formatCurrencyDisplayText } from '../../lib/currency-display.ts'
import type {
  AcquisitionRoute,
  ActivityCategory,
  ConditionStep,
  EnrichedSearchItem,
  EquipRole,
  EquipSlot,
  EquipTaxonomyKey,
  ForwardAcquisitionCategory,
  ForwardContentOption,
  ForwardDetailOption,
  ForwardTaxonomyOption,
  SearchDictionaryItem,
  SourceDictionaryItem,
  TargetItem,
} from '../../types/card'

type LocationTranslationEntry = {
  en: string
  ja: string
}

type FishTermTranslationEntry = {
  en: string
  ja: string
  aliases?: string[]
}

type ContentTranslationEntry = {
  en: string
  ja: string
}

type DictionaryMetadata = {
  type?: string
}

const locationTranslationMap = new Map(
  (locationTranslationDictionary as Array<LocationTranslationEntry | { type: string }>)
    .filter((entry): entry is LocationTranslationEntry => 'en' in entry && 'ja' in entry)
    .map((entry) => [entry.en, entry.ja]),
)

const fishTermTranslationMap = new Map<string, string>()

for (const entry of fishTermTranslationDictionary as Array<FishTermTranslationEntry | { type: string }>) {
  if (!('en' in entry) || !('ja' in entry)) {
    continue
  }

  fishTermTranslationMap.set(entry.en, entry.ja)
  fishTermTranslationMap.set(entry.en.trim(), entry.ja)

  for (const alias of entry.aliases ?? []) {
    fishTermTranslationMap.set(alias, entry.ja)
    fishTermTranslationMap.set(alias.trim(), entry.ja)
  }
}

const contentTranslationMap = new Map(
  (contentTranslationDictionary as Array<ContentTranslationEntry | { type: string }>)
    .filter((entry): entry is ContentTranslationEntry => 'en' in entry && 'ja' in entry)
    .map((entry) => [entry.en, entry.ja]),
)

const equipmentRouteDetailMap = new Map<string, string>([
  ['Blade\'s Gear Exchange (Resistance Supplier)', 'ブレイズ装備交換（レジスタンス補給兵）'],
  ['Blade\'s Gear Exchange', 'ブレイズ装備交換'],
])

export const forwardSearchCategory1Options = [
  '装備',
  'マウント',
  'ミニオン',
  '魚',
  '譜面',
  '髪型',
  'エモート',
  'ファッションアクセサリー',
] as const

const forwardAcquisitionCategoryOptions: ForwardAcquisitionCategory[] = [
  '零式',
  'ノーマルレイド',
  '極',
  'ID',
  '地図',
  '交換',
  '釣り',
  'PvP',
  'その他',
]

const forwardAcquisitionCategoryOrder = new Map(
  forwardAcquisitionCategoryOptions.map((category, index) => [category, index]),
)

const EQUIP_SLOT_ORDER: EquipSlot[] = ['頭', '胴', '手', '脚', '足']

const EQUIP_ROLE_ORDER: EquipRole[] = ['タンク', 'ヒーラー', 'メレー', 'レンジ', 'キャスター', '共通']

const EQUIP_ROLE_PATTERNS: Array<[EquipRole, string[]]> = [
  ['タンク', ['ディフェンダー']],
  ['メレー', ['スレイヤー', 'ストライカー']],
  ['レンジ', ['レンジャー', 'スカウト']],
  ['ヒーラー', ['ヒーラー']],
  ['キャスター', ['キャスター', 'ソーサラー']],
]

const equipSlotByItemId = new Map<number, EquipSlot>(
  Object.entries(equipSlotByItemIdJson as Record<string, EquipSlot>).map(([itemId, slot]) => [Number(itemId), slot]),
)

function mapRawCategoryToEquipSlot(rawCategory: string | null | undefined): EquipSlot | null {
  if (!rawCategory) {
    return null
  }

  if (rawCategory.includes('頭')) {
    return '頭'
  }

  if (rawCategory.includes('胴')) {
    return '胴'
  }

  if (rawCategory.includes('手')) {
    return '手'
  }

  if (rawCategory.includes('脚')) {
    return '脚'
  }

  if (rawCategory.includes('足')) {
    return '足'
  }

  return null
}

function resolveEquipSlot(item: SearchDictionaryItem): EquipSlot | null {
  if (item.id != null) {
    const fromPrototype = equipSlotByItemId.get(item.id)

    if (fromPrototype) {
      return fromPrototype
    }
  }

  return mapRawCategoryToEquipSlot(item.rawCategory)
}

function resolveEquipRole(name: string): EquipRole {
  for (const [role, patterns] of EQUIP_ROLE_PATTERNS) {
    if (patterns.some((pattern) => name.includes(pattern))) {
      return role
    }
  }

  return '共通'
}

function isEquipSlotKey(key: string): key is EquipSlot {
  return (EQUIP_SLOT_ORDER as string[]).includes(key)
}

function isEquipRoleKey(key: string): key is EquipRole {
  return (EQUIP_ROLE_ORDER as string[]).includes(key)
}

const sourceItems = (sourceDictionary as Array<SourceDictionaryItem & DictionaryMetadata>)
  .filter((item) => item.type !== 'metadata')

export const sourceItemById = new Map(sourceItems.map((item) => [item.id, item]))

const chainBackedContentNames = buildChainBackedContentNames(sourceItems)

function shouldIncludeInForwardSearch(item: EnrichedSearchItem): boolean {
  const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined

  return passesChainForwardGuard(item.contentName, sourceItem, chainBackedContentNames)
}

export function isChainBackedForwardContentName(contentName: string | null | undefined): boolean {
  const key = contentName?.trim()

  if (!key) {
    return false
  }

  return chainBackedContentNames.has(key)
}

export function getSourceChainId(sourceDictionaryId: string | null | undefined): string | null {
  if (!sourceDictionaryId) {
    return null
  }

  return resolveSourceChainId(sourceItemById.get(sourceDictionaryId))
}

const rawSearchItems = (searchDictionary as Array<SearchDictionaryItem & DictionaryMetadata>)
  .filter((item) => item.type !== 'metadata' && item.sourceDictionaryId)

export const searchItems = rawSearchItems.filter((item) => {
  const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined

  return isCardUiPublicSearchItem(item.category1, sourceItem)
})

const searchItemsBySourceId = new Map(
  searchItems
    .filter((item) => item.sourceDictionaryId)
    .map((item) => [item.sourceDictionaryId as string, item]),
)

function pickIconUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed || null
}

function buildIconUrlFromPath(iconPathHr1: string | null | undefined): string | null {
  const path = iconPathHr1?.trim()

  if (!path) {
    return null
  }

  return `https://v2.xivapi.com/api/asset?path=${path}&format=png`
}

function buildIconUrlByItemIdLookup(items: SearchDictionaryItem[]) {
  const iconUrlByItemId = new Map<number, string>()

  for (const item of items) {
    if (item.id == null) {
      continue
    }

    const iconUrl = pickIconUrl(item.iconUrl) ?? buildIconUrlFromPath(item.iconPathHr1)

    if (iconUrl) {
      iconUrlByItemId.set(item.id, iconUrl)
    }
  }

  return iconUrlByItemId
}

const iconUrlByItemId = buildIconUrlByItemIdLookup(searchItems)

export function resolveTargetIconUrl(
  searchItem: SearchDictionaryItem,
  sourceItem?: SourceDictionaryItem,
  existingIconUrl?: string | null,
): string | null {
  const directIconUrl = pickIconUrl(searchItem.iconUrl)

  if (directIconUrl) {
    return directIconUrl
  }

  const searchItemIcon = pickIconUrl(searchItem.icon)

  if (searchItemIcon && /^https?:\/\//.test(searchItemIcon)) {
    return searchItemIcon
  }

  const iconUrlFromPath = buildIconUrlFromPath(searchItem.iconPathHr1)

  if (iconUrlFromPath) {
    return iconUrlFromPath
  }

  const sourceIconUrl = pickIconUrl(sourceItem?.iconUrl)

  if (sourceIconUrl) {
    return sourceIconUrl
  }

  const sourceIcon = pickIconUrl(sourceItem?.icon)

  if (sourceIcon && /^https?:\/\//.test(sourceIcon)) {
    return sourceIcon
  }

  const sourceImageUrl = pickIconUrl(sourceItem?.imageUrl)

  if (sourceImageUrl) {
    return sourceImageUrl
  }

  const sourceImage = pickIconUrl(sourceItem?.image)

  if (sourceImage && /^https?:\/\//.test(sourceImage)) {
    return sourceImage
  }

  const itemId = searchItem.id ?? sourceItem?.itemId ?? null

  if (itemId != null) {
    const iconUrlFromItemId = iconUrlByItemId.get(itemId)

    if (iconUrlFromItemId) {
      return iconUrlFromItemId
    }
  }

  const existing = pickIconUrl(existingIconUrl)

  if (existing) {
    return existing
  }

  return null
}

export function getSearchItemIconUrl(item: SearchDictionaryItem): string | null {
  const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined

  return resolveTargetIconUrl(item, sourceItem)
}

export function withResolvedSearchItem(item: SearchDictionaryItem): SearchDictionaryItem {
  const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined
  const iconUrl = resolveTargetIconUrl(item, sourceItem)

  if (!iconUrl || iconUrl === item.iconUrl) {
    return item
  }

  return {
    ...item,
    iconUrl,
  }
}

function mapToAcquisitionCategory(category2: string | null | undefined): ForwardAcquisitionCategory {
  if (!category2) {
    return 'その他'
  }

  if (category2 === 'トレジャーハント') {
    return '地図'
  }

  if ((forwardAcquisitionCategoryOptions as string[]).includes(category2)) {
    return category2 as ForwardAcquisitionCategory
  }

  return 'その他'
}

function mapRawCategoryToDetail(rawCategory: string | null | undefined): string | null {
  if (!rawCategory) {
    return null
  }

  if (rawCategory.includes('頭')) {
    return '頭'
  }

  if (rawCategory.includes('胴')) {
    return '胴'
  }

  if (rawCategory.includes('手')) {
    return '手'
  }

  if (rawCategory.includes('脚')) {
    return '脚'
  }

  if (rawCategory.includes('足')) {
    return '足'
  }

  if (rawCategory.includes('武器')) {
    return '武器'
  }

  if (rawCategory.includes('盾')) {
    return '盾'
  }

  return null
}

function enrichSearchItem(item: SearchDictionaryItem): EnrichedSearchItem {
  const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined
  const category1 = item.category1 ?? sourceItem?.category1 ?? ''
  const category2 = item.category2 ?? sourceItem?.category2 ?? null
  const contentName = item.contentName ?? sourceItem?.contentName ?? null
  const details = new Set<string>()

  for (const route of sourceItem?.acquisitionRoutes ?? []) {
    if (route.detail?.trim()) {
      details.add(route.detail.trim())
    }
  }

  const rawDetail = mapRawCategoryToDetail(item.rawCategory)
  if (rawDetail) {
    details.add(rawDetail)
  }

  const enrichedItem = {
    ...item,
    category1,
    category2,
    contentName,
    acquisitionCategory: mapToAcquisitionCategory(category2),
    details: [...details].sort((a, b) => a.localeCompare(b, 'ja')),
  }

  return {
    ...enrichedItem,
    contentDisplayName: resolveJapaneseContentName({
      category1,
      subCategory: item.subCategory ?? sourceItem?.subCategory,
      contentName,
      sourceItem,
    }),
    resolvedIconUrl: resolveTargetIconUrl(enrichedItem, sourceItem),
    equipSlot: category1 === '装備' ? resolveEquipSlot(item) : null,
    equipRole: category1 === '装備' ? resolveEquipRole(item.name) : null,
  }
}

const enrichedSearchItems = searchItems.map(enrichSearchItem)

function sortAcquisitionCategories(categories: Iterable<ForwardAcquisitionCategory>) {
  return [...new Set(categories)].sort(
    (left, right) => (forwardAcquisitionCategoryOrder.get(left) ?? 99) - (forwardAcquisitionCategoryOrder.get(right) ?? 99),
  )
}

export function getForwardAcquisitionCategories(category1: string) {
  if (!category1) {
    return []
  }

  if (usesForwardSearchIndex(category1)) {
    return getForwardIndexAcquisitionCategories()
  }

  return sortAcquisitionCategories(
    enrichedSearchItems
      .filter((item) => item.category1 === category1)
      .map((item) => item.acquisitionCategory),
  )
}

function resolveEnrichedItemsFromForwardIndex(filters: {
  step2Category: string
  contentName: string
  taxonomy?: EquipTaxonomyKey | ''
}): EnrichedSearchItem[] {
  const indexItems = getForwardIndexItems({
    step2Category: filters.step2Category,
    contentName: filters.contentName,
    taxonomy: filters.taxonomy,
  })
  const resolved: EnrichedSearchItem[] = []

  for (const indexItem of indexItems) {
    const searchItem = searchItemsBySourceId.get(indexItem.sourceDictionaryId)

    if (!searchItem) {
      continue
    }

    const enriched = enrichSearchItem(searchItem)

    resolved.push({
      ...enriched,
      equipSlot: indexItem.equipSlot ?? indexItem.slot ?? enriched.equipSlot,
      equipRole: indexItem.equipRole ?? indexItem.role,
      equipLevel: indexItem.equipLevel,
      itemLevel: indexItem.itemLevel,
      equipJobs: indexItem.equipJobs,
      equipJobsJa: indexItem.equipJobsJa,
      itemUiCategory: indexItem.itemUiCategory,
      classJobCategoryId: indexItem.classJobCategoryId,
      roleSource: indexItem.roleSource,
      slotSource: indexItem.slotSource,
    })
  }

  return resolved
}

export {
  groupForwardIndexCandidatesBySeries,
  isExchangeStep2Category,
  isExplorationStep2Category,
  isIdStep2Category,
  usesForwardSearchIndex,
  usesGroupedForwardContentOptions,
} from '../../lib/forward-search-index'

export function getForwardContentNames(category1: string, acquisitionCategory: string): ForwardContentOption[] {
  if (!category1 || !acquisitionCategory) {
    return []
  }

  if (usesForwardSearchIndex(category1)) {
    return getForwardIndexContentNames(acquisitionCategory)
  }

  const options = new Map<string, string>()

  for (const item of enrichedSearchItems) {
    if (item.category1 !== category1 || item.acquisitionCategory !== acquisitionCategory) {
      continue
    }

    if (!shouldIncludeInForwardSearch(item)) {
      continue
    }

    const key = item.contentName?.trim()

    if (!key) {
      continue
    }

    options.set(key, item.contentDisplayName || resolveJapaneseContentName({
      category1: item.category1,
      subCategory: item.subCategory,
      contentName: item.contentName,
      sourceItem: item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined,
    }))
  }

  return [...options.entries()]
    .map(([key, displayName]) => ({ key, displayName }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ja'))
}

export function getForwardTaxonomyOptions(
  category1: string,
  acquisitionCategory: string,
  contentName: string,
): ForwardTaxonomyOption[] {
  if (category1 !== '装備' || !acquisitionCategory || !contentName) {
    return []
  }

  if (usesForwardSearchIndex(category1)) {
    return getForwardIndexTaxonomyOptions(acquisitionCategory, contentName)
  }

  const slotCounts = new Map<EquipSlot, number>()
  const roleCounts = new Map<EquipRole, number>()

  for (const item of enrichedSearchItems) {
    if (
      item.category1 !== category1
      || item.acquisitionCategory !== acquisitionCategory
      || item.contentName !== contentName
    ) {
      continue
    }

    if (!shouldIncludeInForwardSearch(item)) {
      continue
    }

    if (item.equipSlot) {
      slotCounts.set(item.equipSlot, (slotCounts.get(item.equipSlot) ?? 0) + 1)
    }

    if (item.equipRole) {
      roleCounts.set(item.equipRole, (roleCounts.get(item.equipRole) ?? 0) + 1)
    }
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

export function getForwardDetails(
  category1: string,
  acquisitionCategory: string,
  contentName: string,
): ForwardDetailOption[] {
  if (category1 === '装備') {
    return []
  }

  if (!category1 || !acquisitionCategory || !contentName) {
    return []
  }

  const options = new Map<string, string>()

  for (const item of enrichedSearchItems) {
    if (
      item.category1 !== category1
      || item.acquisitionCategory !== acquisitionCategory
      || item.contentName !== contentName
    ) {
      continue
    }

    if (!shouldIncludeInForwardSearch(item)) {
      continue
    }

    const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined

    for (const detailKey of item.details) {
      options.set(detailKey, resolveJapaneseDetailName({
        detail: detailKey,
        category1: item.category1,
        subCategory: item.subCategory,
        contentName: item.contentName,
        sourceItem,
        rawCategory: item.rawCategory,
      }))
    }
  }

  return [...options.entries()]
    .map(([key, displayName]) => ({ key, displayName }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ja'))
}

export function getForwardSearchCandidates(filters: {
  category1: string
  acquisitionCategory: string
  contentName: string
  detail: string
  taxonomy?: EquipTaxonomyKey | ''
}) {
  if (usesForwardSearchIndex(filters.category1)) {
    if (!filters.acquisitionCategory || !filters.contentName) {
      return []
    }

    return resolveEnrichedItemsFromForwardIndex({
      step2Category: filters.acquisitionCategory,
      contentName: filters.contentName,
      taxonomy: filters.taxonomy,
    })
  }

  return enrichedSearchItems.filter((item) => {
    if (!shouldIncludeInForwardSearch(item)) {
      return false
    }

    if (filters.category1 && item.category1 !== filters.category1) {
      return false
    }

    if (filters.acquisitionCategory && item.acquisitionCategory !== filters.acquisitionCategory) {
      return false
    }

    if (filters.contentName && item.contentName !== filters.contentName) {
      return false
    }

    if (filters.category1 === '装備' && filters.taxonomy) {
      if (isEquipSlotKey(filters.taxonomy) && item.equipSlot !== filters.taxonomy) {
        return false
      }

      if (isEquipRoleKey(filters.taxonomy) && item.equipRole !== filters.taxonomy) {
        return false
      }
    }

    if (filters.detail && !item.details.includes(filters.detail)) {
      return false
    }

    return true
  })
}

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase()
}

export function tokenizeSearchQuery(value: string): string[] {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean)
}

function searchTokenMatchesItem(item: SearchDictionaryItem, token: string): boolean {
  const metadataExactMatch = getEquipmentMetadataSearchNamesForItem(item).some(
    (searchName) => searchName.toLowerCase() === token,
  )

  if (isEquipmentMetadataSearchToken(token)) {
    return metadataExactMatch
  }

  if (item.name.toLowerCase().includes(token)) {
    return true
  }

  if ((item.searchNames ?? []).some((searchName) => searchName.toLowerCase().includes(token))) {
    return true
  }

  return metadataExactMatch
}

export function itemMatchesSearchQuery(item: SearchDictionaryItem, normalizedQuery: string) {
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

  if (tokens.length === 0) {
    return false
  }

  return tokens.every((token) => searchTokenMatchesItem(item, token))
}

export function isSearchTargetCardUiPublic(
  item: SearchDictionaryItem,
  sourceItem: SourceDictionaryItem | undefined,
): boolean {
  return isCardUiPublicSearchItem(item.category1, sourceItem)
}

export function getSearchResults(query: string) {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) {
    return []
  }

  return searchItems
    .filter((item) => itemMatchesSearchQuery(item, normalizedQuery))
    .slice(0, 8)
}

export function getActivityCategoryFromDictionary(category: string | undefined): ActivityCategory {
  if (category === '釣り') {
    return '釣り'
  }

  if (category === '戦闘') {
    return '戦闘'
  }

  if (category === 'ギャザクラ') {
    return 'ギャザラー'
  }

  return '収集'
}

function getTargetFallbackIcon(item: SearchDictionaryItem) {
  switch (item.subCategory ?? item.category1) {
    case 'マウント':
      return '🐎'
    case 'ミニオン':
      return '🐣'
    case '譜面':
      return '🎵'
    case '髪型':
      return '✂'
    case 'エモート':
      return '🎭'
    case 'ファッションアクセサリー':
      return '☂'
    case 'ヌシ':
    case 'オオヌシ':
      return '🐟'
    default:
      return '🎁'
  }
}

export function getTargetIconFromDictionary(item: SearchDictionaryItem, sourceItem?: SourceDictionaryItem) {
  if (resolveTargetIconUrl(item, sourceItem)) {
    return ''
  }

  return getTargetFallbackIcon(item)
}

export function formatConditionValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatConditionValue).filter(Boolean).join(' / ')
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .map(([key, nestedValue]) => `${key}: ${formatConditionValue(nestedValue)}`)
      .filter((entry) => entry.trim() !== '')

    return entries.join(' / ')
  }

  if (typeof value === 'boolean') {
    return value ? 'あり' : 'なし'
  }

  if (typeof value === 'string') {
    return normalizeDisplayText(value)
  }

  return value == null ? '' : String(value)
}

function normalizeBilingualJa(text: string): string {
  const trimmed = text.trim()

  if (!trimmed) {
    return ''
  }

  const bilingualMatch = trimmed.match(/^(.+?)（[^）]+）$/)

  if (bilingualMatch && isJapaneseText(bilingualMatch[1])) {
    return bilingualMatch[1].trim()
  }

  return trimmed
}

function normalizeDisplayText(text: string): string {
  const trimmed = text.trim()

  if (!trimmed) {
    return ''
  }

  const normalized = normalizeBilingualJa(trimmed)

  if (isJapaneseText(normalized)) {
    return formatCurrencyDisplayText(normalized)
  }

  return translateEquipmentRouteDetail(normalized)
}

function translateEquipmentRouteDetail(text: string): string {
  const trimmed = text.trim()

  if (!trimmed) {
    return ''
  }

  return equipmentRouteDetailMap.get(trimmed)
    ?? contentTranslationMap.get(trimmed)
    ?? trimmed
}

function localizeRouteDetail(detail: string, translateContent: boolean): string {
  const trimmed = detail.trim()

  if (!trimmed || isInternalRouteMemo(trimmed)) {
    return trimmed
  }

  const normalized = normalizeBilingualJa(trimmed)

  if (isJapaneseText(normalized)) {
    return normalized
  }

  if (translateContent) {
    return translateContentName(normalized, true)
  }

  return translateEquipmentRouteDetail(normalized)
}

function translateLocationName(value: unknown): string {
  const english = formatConditionValue(value)

  if (!english) {
    return ''
  }

  return locationTranslationMap.get(english) ?? english
}

export function translateFishTerm(value: unknown): string {
  if (value == null) {
    return ''
  }

  const english = String(value)

  if (!english.trim()) {
    return ''
  }

  return fishTermTranslationMap.get(english)
    ?? fishTermTranslationMap.get(english.trim())
    ?? english.trim()
}

function translateFishTermList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => translateFishTerm(item)).filter(Boolean).join(' / ')
  }

  return translateFishTerm(value)
}

export function getConditionLabel(key: string) {
  const labels: Record<string, string> = {
    area: 'エリア',
    location: '場所',
    weather: '天候',
    time: '時間',
    bait: '餌',
    mooch: '泳がせ',
    intuition: '直感',
    folklore: '伝承録',
    gig: 'ギグ',
    snagging: '引掛釣り',
    fishEyes: '魚眼',
    surfaceSlap: '撒き餌',
    prizeCatch: '大物狙い',
    reward: '必要通貨',
  }

  return labels[key] ?? key
}

export function getStepLabel(type: string | undefined) {
  const labels: Record<string, string> = {
    bait: '餌',
    mooch: '泳がせ',
    intuition: '直感',
    surfaceSlap: '撒き餌',
    prizeCatch: '大物狙い',
    gig: 'ギグ',
    currency_earn: '通貨獲得',
  }

  return type ? labels[type] ?? type : '条件'
}

export function isFishTarget(target: TargetItem) {
  return target.category === '釣り' || ['魚', 'ヌシ', 'オオヌシ'].includes(target.subcategory)
}

function isContentTranslationCategory(
  category1?: string | null,
  subCategory?: string | null,
): boolean {
  return category1 === '譜面'
    || category1 === 'マウント'
    || category1 === 'ミニオン'
    || category1 === 'エモート'
    || ['譜面', 'マウント', 'ミニオン', 'エモート'].includes(subCategory ?? '')
}

export function isContentTranslationTarget(target: TargetItem) {
  if (isContentTranslationCategory(undefined, target.subcategory)) {
    return true
  }

  if (target.sourceDictionaryId) {
    const sourceItem = sourceItemById.get(target.sourceDictionaryId)
    return isContentTranslationCategory(sourceItem?.category1, sourceItem?.subCategory)
  }

  return false
}

function isJapaneseText(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

export function translateContentName(value: unknown, enabled: boolean) {
  const text = String(value ?? '').trim()

  if (!enabled || !text) {
    return text
  }

  if (isJapaneseText(text)) {
    return text
  }

  return contentTranslationMap.get(text) ?? text
}

type ResolveJapaneseContentNameInput = {
  category1?: string | null
  subCategory?: string | null
  contentName?: string | null
  sourceItem?: SourceDictionaryItem
}

function resolveJapaneseContentName({
  category1,
  subCategory,
  contentName,
  sourceItem,
}: ResolveJapaneseContentNameInput): string {
  const normalizedContentName = contentName?.trim() ?? ''

  if (!normalizedContentName) {
    return ''
  }

  if (category1 === '魚') {
    const localizedContentName = translateLocationName(normalizedContentName)

    if (localizedContentName !== normalizedContentName) {
      return localizedContentName
    }

    for (const route of sourceItem?.acquisitionRoutes ?? []) {
      const area = translateLocationName(route.specialConditions?.area)

      if (area) {
        return area
      }
    }

    return normalizedContentName
  }

  const translateContent = isContentTranslationCategory(category1, subCategory)

  if (translateContent) {
    return translateContentName(normalizedContentName, true)
  }

  if (isJapaneseText(normalizedContentName)) {
    return normalizedContentName
  }

  const translatedContentName = translateContentName(normalizedContentName, true)

  if (translatedContentName !== normalizedContentName) {
    return translatedContentName
  }

  const translatedLocationName = translateLocationName(normalizedContentName)

  if (translatedLocationName !== normalizedContentName) {
    return translatedLocationName
  }

  return normalizedContentName
}

function isInternalRouteMemo(text: string | undefined) {
  if (!text) {
    return false
  }

  return /カード表示(?:では)?(?:まとめる)?|辞書管理|内部メモ|GC別分岐はカード表示/.test(text)
}

function hasD1SplitContent(route: AcquisitionRoute) {
  const contentName = route.contentName?.trim() ?? ''
  const detail = route.detail?.trim() ?? ''

  return !!contentName
    && !!detail
    && contentName !== detail
    && !isInternalRouteMemo(contentName)
    && !isInternalRouteMemo(detail)
}

function isD1ExcludedRoute(route: AcquisitionRoute) {
  const contentName = route.contentName?.trim() ?? ''

  if (route.type === '友好部族') {
    return true
  }

  if (contentName === 'Tribal' || contentName === 'Hunts') {
    return true
  }

  if (contentName === 'トライバル' || contentName === 'モブハント') {
    return true
  }

  if (/^(Tribal|Hunts|MGP|Purchase|Gathering|Crafting)$/.test(contentName) && / - .+ - \d+/.test(route.detail ?? '')) {
    return true
  }

  return false
}

function isD1CoreSplitRoute(route: AcquisitionRoute) {
  if (!hasD1SplitContent(route) || isD1ExcludedRoute(route)) {
    return false
  }

  const blob = `${route.contentName} ${route.detail} ${route.type}`

  if (/Wondrous Tails|Khloe|Faux Leaves|Certificate of Commendation|クロの空想|幻の葉|賞状/.test(blob)) {
    return true
  }

  if (route.type === 'FATE') {
    return true
  }

  if (route.type === 'ヴァリアント') {
    return true
  }

  if (route.type === 'ディープダンジョン') {
    return true
  }

  if (/Bozja|ボズヤ|Zadnor|Delubrum|Dalriada|Southern Front Lockbox|Bozjan Clusters/i.test(blob)) {
    return true
  }

  if (/Eureka|エウレカ|Occult Crescent|蜃気楼|Orthos|オルト・エウレカ|Enlightenment|Sanguinite|Hydatos|Anemos|Pagos|Pyros|South Horn/i.test(blob)) {
    return true
  }

  return false
}

type D2RouteDisplay = {
  contentName: string
  detail: string
  compositeKey: string
}

const D2B_COMPRESSED_DISPLAYS: Record<string, D2RouteDisplay> = {
  'The Baldesion Arsenal (Eureka Hydatos) - Absolute Virtue Chest': {
    contentName: 'The Baldesion Arsenal (Eureka Hydatos)',
    detail: 'Absolute Virtue Chest',
    compositeKey: 'The Baldesion Arsenal (Eureka Hydatos) - Absolute Virtue Chest',
  },
  'Eureka Hydatos - The Baldesion Arsenal': {
    contentName: 'Eureka Hydatos',
    detail: 'The Baldesion Arsenal',
    compositeKey: 'Eureka Hydatos - The Baldesion Arsenal',
  },
  'Eureka Hydatos - Moisture-warped Lockbox': {
    contentName: 'Eureka Hydatos',
    detail: 'Moisture-warped Lockbox',
    compositeKey: 'Eureka Hydatos - Moisture-warped Lockbox',
  },
  'Moisture-warped Lockbox - Eureka Hydatos': {
    contentName: 'Moisture-warped Lockbox',
    detail: 'Eureka Hydatos',
    compositeKey: 'Moisture-warped Lockbox - Eureka Hydatos',
  },
}

function parseD2RouteDisplay(route: AcquisitionRoute) {
  const contentName = route.contentName?.trim() ?? ''
  const detail = route.detail?.trim() ?? ''

  if (isInternalRouteMemo(contentName) || isInternalRouteMemo(detail)) {
    return null
  }

  const finalBossMatch = detail.match(/^(Dalriada|Delubrum Reginae) - (Final Boss Chests?)$/i)

  if (finalBossMatch) {
    return {
      contentName: finalBossMatch[1],
      detail: finalBossMatch[2],
      compositeKey: detail,
    } satisfies D2RouteDisplay
  }

  if (contentName === detail && contentName === 'Zadnor - The Dalriada') {
    return {
      contentName: 'Zadnor',
      detail: 'The Dalriada',
      compositeKey: contentName,
    } satisfies D2RouteDisplay
  }

  if (contentName === detail && D2B_COMPRESSED_DISPLAYS[contentName]) {
    return D2B_COMPRESSED_DISPLAYS[contentName]
  }

  return null
}

function translateD2RouteDisplay(display: D2RouteDisplay, translateContent: boolean) {
  const composite = translateContentName(display.compositeKey, translateContent)
  const separator = ' - '
  const separatorIndex = composite.indexOf(separator)

  if (separatorIndex !== -1) {
    return {
      contentName: composite.slice(0, separatorIndex),
      detail: composite.slice(separatorIndex + separator.length),
    }
  }

  return {
    contentName: translateContentName(display.contentName, translateContent),
    detail: translateContentName(display.detail, translateContent),
  }
}

export function getSplitRouteDisplay(route: AcquisitionRoute, translateContent: boolean) {
  const d2Display = parseD2RouteDisplay(route)

  if (d2Display) {
    return translateD2RouteDisplay(d2Display, translateContent)
  }

  if (isD1CoreSplitRoute(route)) {
    return {
      contentName: translateContentName(route.contentName, translateContent),
      detail: localizeRouteDetail(route.detail ?? '', translateContent),
    }
  }

  return null
}

export function usesSplitRouteDisplay(route: AcquisitionRoute) {
  return parseD2RouteDisplay(route) !== null || isD1CoreSplitRoute(route)
}

export function getRouteDisplayText(route: AcquisitionRoute, options?: { translateContent?: boolean }) {
  const translateContent = options?.translateContent ?? false

  if (route.detail && !isInternalRouteMemo(route.detail)) {
    return localizeRouteDetail(route.detail, translateContent)
  }

  if (route.contentName && !isInternalRouteMemo(route.contentName)) {
    return localizeRouteDetail(route.contentName, translateContent)
  }

  return `${route.type}入手`
}

function resolveRouteDetailDisplayName(route: AcquisitionRoute): string | null {
  const splitDisplay = getSplitRouteDisplay(route, true)

  if (splitDisplay?.detail?.trim()) {
    return splitDisplay.detail.trim()
  }

  const routeDetail = route.detail?.trim() ?? ''

  if (routeDetail && !isInternalRouteMemo(routeDetail)) {
    const displayText = getRouteDisplayText(route, { translateContent: true })

    if (displayText && displayText !== `${route.type}入手`) {
      return displayText
    }
  }

  return null
}

type ResolveJapaneseDetailNameInput = {
  detail: string
  category1?: string | null
  subCategory?: string | null
  contentName?: string | null
  sourceItem?: SourceDictionaryItem
  rawCategory?: string | null
}

function translateDetailToJapanese(detail: string, category1?: string | null): string {
  const normalized = detail.trim()

  if (!normalized || isJapaneseText(normalized)) {
    return normalized
  }

  if (category1 === '魚') {
    const localizedLocation = translateLocationName(normalized)

    if (localizedLocation !== normalized) {
      return localizedLocation
    }

    const translatedFishTerm = translateFishTerm(normalized)

    if (translatedFishTerm !== normalized) {
      return translatedFishTerm
    }
  }

  const translatedContent = translateContentName(normalized, true)

  if (translatedContent !== normalized) {
    return translatedContent
  }

  const translatedEquipmentRoute = translateEquipmentRouteDetail(normalized)

  if (translatedEquipmentRoute !== normalized) {
    return translatedEquipmentRoute
  }

  const translatedLocation = translateLocationName(normalized)

  if (translatedLocation !== normalized) {
    return translatedLocation
  }

  const translatedFishTerm = translateFishTerm(normalized)

  if (translatedFishTerm !== normalized) {
    return translatedFishTerm
  }

  return normalized
}

function resolveJapaneseDetailName({
  detail,
  category1,
  sourceItem,
  rawCategory,
}: ResolveJapaneseDetailNameInput): string {
  const normalizedDetail = detail.trim()

  if (!normalizedDetail) {
    return ''
  }

  if (isJapaneseText(normalizedDetail)) {
    return normalizedDetail
  }

  const mappedRawDetail = mapRawCategoryToDetail(rawCategory)

  if (mappedRawDetail === normalizedDetail) {
    return mappedRawDetail
  }

  for (const route of sourceItem?.acquisitionRoutes ?? []) {
    const routeDetail = route.detail?.trim() ?? ''
    const routeContentName = route.contentName?.trim() ?? ''

    if (routeDetail !== normalizedDetail && routeContentName !== normalizedDetail) {
      continue
    }

    const routeDisplayName = resolveRouteDetailDisplayName(route)

    if (routeDisplayName) {
      return translateDetailToJapanese(routeDisplayName, category1)
    }
  }

  return translateDetailToJapanese(normalizedDetail, category1)
}

function getRouteCardKey(route: AcquisitionRoute) {
  const specialConditionsKey = route.specialConditions
    ? JSON.stringify(route.specialConditions, Object.keys(route.specialConditions).sort())
    : ''
  const conditionStepsKey = route.conditionSteps ? JSON.stringify(route.conditionSteps) : ''

  return [
    route.type,
    route.contentName?.trim() ?? '',
    route.detail?.trim() ?? '',
    specialConditionsKey,
    conditionStepsKey,
  ].join('|')
}

export function deduplicateAcquisitionRoutes(routes: AcquisitionRoute[]) {
  const seen = new Set<string>()
  const deduped: AcquisitionRoute[] = []

  for (const route of routes) {
    const key = getRouteCardKey(route)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(route)
  }

  return deduped
}

export function formatFishingWeather(value: unknown) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const weather = value as { previous?: unknown; current?: unknown }
    const previous = translateFishTermList(weather.previous)
    const current = translateFishTermList(weather.current)

    return previous && current ? `${previous}→${current}` : current || previous
  }

  return translateFishTermList(value)
}

export function formatFishStepText(step: ConditionStep) {
  const target = step.target?.trim() ?? ''

  if (/^\d+$/.test(target)) {
    const count = step.count ?? Number(target)

    if (step.type === 'prizeCatch') {
      return `大物狙い x${count}`
    }

    if (step.type === 'surfaceSlap') {
      return `トレードリリース x${count}`
    }

    return `${getStepLabel(step.type)} x${count}`
  }

  const label = getStepLabel(step.type)
  const translatedTarget = translateFishTerm(step.target)

  if (!translatedTarget) {
    return label
  }

  if (step.count != null && step.count > 0) {
    return `${label}: ${translatedTarget} x${step.count}`
  }

  return `${label}: ${translatedTarget}`
}

export function getConditionStepText(steps: ConditionStep[] | undefined) {
  if (!steps?.length) {
    return ''
  }

  if (steps.length === 1 && ['bait', 'mooch'].includes(steps[0].type ?? '')) {
    return ''
  }

  return steps.map((step) => formatFishStepText(step)).join(' → ')
}

export function formatFolklore(value: unknown) {
  const text = formatConditionValue(value)

  if (!text) {
    return ''
  }

  return translateFishTerm(text) || '必要'
}

export function formatIntuitionFish(value: unknown) {
  if (!Array.isArray(value)) {
    return ''
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      return ''
    }

    const fishName = translateFishTerm((item as { fish?: string }).fish)
    const count = (item as { count?: number }).count

    if (!fishName) {
      return ''
    }

    return count ? `${fishName} x${count}` : fishName
  }).filter(Boolean).join(' / ')
}

export function getFishPlaceDisplay(route: AcquisitionRoute) {
  const conditions = route.specialConditions ?? {}
  const area = translateLocationName(conditions.area)
  const location = translateLocationName(conditions.location)

  return [area, location].filter(Boolean).join(': ')
}

export const ROUTE_PRIORITY_SPECIAL_CONDITION_KEYS = ['area', 'location', 'weather', 'time'] as const
export const ROUTE_PROMOTED_SPECIAL_CONDITION_KEYS = ['reward'] as const

export function getRouteRequiredCurrency(route: AcquisitionRoute): string | null {
  const reward = route.specialConditions?.reward

  if (reward == null) {
    return null
  }

  const formatted = formatConditionValue(reward)

  return formatted || null
}

export function hasRouteRequiredCurrency(route: AcquisitionRoute): boolean {
  return getRouteRequiredCurrency(route) != null
}

export function getRouteCurrencyEarnSteps(route: AcquisitionRoute): ConditionStep[] {
  return (route.conditionSteps ?? []).filter((step) => step.type === 'currency_earn')
}

export function getRouteCollapsibleSpecialConditions(route: AcquisitionRoute): Array<[string, unknown]> {
  const conditions = route.specialConditions ?? {}

  return Object.entries(conditions).filter(([key, value]) => {
    if ((ROUTE_PRIORITY_SPECIAL_CONDITION_KEYS as readonly string[]).includes(key)) {
      return false
    }

    if ((ROUTE_PROMOTED_SPECIAL_CONDITION_KEYS as readonly string[]).includes(key)) {
      return false
    }

    return Boolean(formatConditionValue(value))
  })
}

export function getRouteCollapsibleConditionSteps(route: AcquisitionRoute): ConditionStep[] {
  return (route.conditionSteps ?? []).filter((step) => step.type !== 'currency_earn')
}

export function shouldShowRouteExtraConditions(route: AcquisitionRoute): boolean {
  return getRouteCollapsibleSpecialConditions(route).length > 0
    || getRouteCollapsibleConditionSteps(route).length > 0
}

export function getRoutePrimaryContentLabel(route: AcquisitionRoute, translateContent: boolean): string {
  const contentName = route.contentName?.trim()

  if (contentName) {
    return translateContentName(contentName, translateContent)
  }

  return getRouteDisplayText(route, { translateContent })
}
