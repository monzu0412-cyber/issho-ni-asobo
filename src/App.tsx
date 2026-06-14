import { type CSSProperties, type SyntheticEvent, useEffect, useRef, useState } from 'react'
import { getActivityPurposeItem, getActivityPurposeItems } from './data/invite/activityPurposeDictionary'
import { getXPostIntentUrl } from './data/postShareTemplate'
import {
  getInviteMajorCategory,
  getInviteMiddleItem,
  getInviteMiddleItems,
  inviteMajorCategories,
} from './data/invite/inviteContentDictionary'
import type { InviteContentSelection, InviteMajorId } from './data/invite/inviteDictionaryTypes'
import searchDictionary from './data/reverse-search/generated/search_dictionary.generated.json'
import locationTranslationDictionary from './data/reverse-search/manual/location_translation_dictionary.json'
import fishTermTranslationDictionary from './data/reverse-search/manual/fish_term_translation_dictionary.json'
import contentTranslationDictionary from './data/reverse-search/manual/content_translation_dictionary.json'
import sourceDictionary from './data/reverse-search/manual/source_dictionary.json'
import './App.css'
import { HelpModal } from './components/HelpModal'
import {
  buildCharacterDraft,
  CARD_DRAFT_VERSION,
  clearCardDraft,
  readCardDraft,
  readSaveEnabled,
  writeCardDraft,
  writeSaveEnabled,
  type CardDraft,
  type CharacterDraft,
} from './utils/cardDraftStorage'
import { exportCardPng } from './utils/exportCardPng'

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

const worldsByDc = {
  Elemental: ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'],
  Gaia: ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
  Mana: ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan'],
  Meteor: ['Belias', 'Mandragora', 'Ramuh', 'Shinryu', 'Unicorn', 'Valefor', 'Yojimbo', 'Zeromus'],
} as const

type DataCenter = keyof typeof worldsByDc

const dataCenters = Object.keys(worldsByDc) as DataCenter[]

const voiceChatOptions = ['VC OK', '聞き専', 'VCなし'] as const

type VoiceChat = typeof voiceChatOptions[number]

const cardColorThemeOptions = [
  'white',
  'blue',
  'lightblue',
  'red',
  'pink',
  'green',
  'lime',
  'yellow',
  'beige',
] as const

type CardColorTheme = typeof cardColorThemeOptions[number]

const cardBaseBackgroundOptions = [
  { value: '01', label: '01' },
  { value: '02', label: '02' },
  { value: '03', label: '03' },
  { value: '04', label: '04' },
  { value: '05', label: '05' },
] as const

type CardBaseBackground = typeof cardBaseBackgroundOptions[number]['value']

const cardSectionThemeOptions = [
  { value: 'fish', label: '魚' },
  { value: 'mount', label: 'マウント' },
  { value: 'minion', label: 'ミニオン' },
  { value: 'music', label: '音楽' },
  { value: 'housing', label: 'ハウジング' },
  { value: 'adventure', label: '冒険' },
] as const

const cardSectionStyleOptions = [
  { value: 'simple', label: 'シンプル' },
  { value: 'cute', label: 'かわいい' },
  { value: 'stylish', label: 'おしゃれ' },
] as const

type CardSectionTheme = typeof cardSectionThemeOptions[number]['value']
type CardSectionStyle = typeof cardSectionStyleOptions[number]['value']

type CardSectionName =
  | 'row2_left'
  | 'row2_center'
  | 'row2_right'
  | 'row3_left'
  | 'row3_center'
  | 'row3_right'
  | 'row4'

const cardSectionNames: CardSectionName[] = [
  'row2_left',
  'row2_center',
  'row2_right',
  'row3_left',
  'row3_center',
  'row3_right',
  'row4',
]

const sectionBackgroundBaseStyle: CSSProperties = {
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
}

const row3SectionNames = new Set<CardSectionName>(['row3_left', 'row3_center', 'row3_right'])

function buildCardSectionBackgroundUrl(
  theme: CardSectionTheme,
  style: CardSectionStyle,
  section: CardSectionName,
) {
  return `/backgrounds/card_sections/${theme}/${style}/${theme}_${style}_${section}.png`
}

function useCardSectionBackgroundStyles(theme: CardSectionTheme, style: CardSectionStyle) {
  const [styles, setStyles] = useState<Partial<Record<CardSectionName, CSSProperties>>>({})
  const loadIdRef = useRef(0)

  useEffect(() => {
    loadIdRef.current += 1
    const loadId = loadIdRef.current

    let pending = cardSectionNames.length
    const nextStyles: Partial<Record<CardSectionName, CSSProperties>> = {}

    const finalize = () => {
      pending -= 1
      if (pending === 0 && loadIdRef.current === loadId) {
        setStyles({ ...nextStyles })
      }
    }

    cardSectionNames.forEach((section) => {
      const imageUrl = buildCardSectionBackgroundUrl(theme, style, section)
      const image = new Image()

      image.onload = () => {
        if (loadIdRef.current !== loadId) {
          return
        }

        if (row3SectionNames.has(section)) {
          nextStyles[section] = {
            ['--section-bg-image' as string]: `url("${imageUrl}")`,
          }
        } else {
          nextStyles[section] = {
            ...sectionBackgroundBaseStyle,
            backgroundImage: `url("${imageUrl}")`,
          }
        }
        finalize()
      }

      image.onerror = () => {
        if (loadIdRef.current !== loadId) {
          return
        }

        finalize()
      }

      image.src = imageUrl
    })
  }, [theme, style])

  return (section: CardSectionName): CSSProperties => styles[section] ?? {}
}

function getCardBaseBackgroundStyle(background: CardBaseBackground): CSSProperties {
  return {
    backgroundImage: `url("/backgrounds/card_base/${background}.png")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  }
}

type ActivityCategory =
  | '戦闘'
  | '収集'
  | '釣り'
  | '地図'
  | 'クラフター'
  | 'ギャザラー'
  | 'SS'
  | 'ハウジング'
  | 'ミラプリ'
  | '演奏'
  | 'PvP'
  | '交流'
  | 'RP'
  | '金策'
  | 'モブハント'
  | 'その他'

type TodoItem = {
  title: string
  category?: string
  major?: string
  middle?: string
  comment?: string
}

type ContentSelection = InviteContentSelection

type TargetItem = {
  title: string
  category: ActivityCategory
  subcategory: string
  icon: string
  comment?: string
  iconUrl?: string | null
  sourceDictionaryId?: string
  contentName?: string | null
  acquisitionRoutes?: AcquisitionRoute[]
}

type DictionaryMetadata = {
  type?: string
}

type SearchDictionaryItem = {
  name: string
  searchNames?: string[]
  id?: number | null
  icon?: string | null
  iconPath?: string | null
  iconPathHr1?: string | null
  iconUrl?: string | null
  category?: string
  subCategory?: string
  sourceDictionaryId?: string
  category1?: string
  category2?: string | null
  contentName?: string | null
  rawCategory?: string | null
}

type ForwardAcquisitionCategory = '零式' | '極' | 'ID' | '地図' | '交換' | '釣り' | 'PvP' | 'その他'

type EnrichedSearchItem = SearchDictionaryItem & {
  acquisitionCategory: ForwardAcquisitionCategory
  details: string[]
  contentDisplayName: string
  resolvedIconUrl: string | null
}

type ForwardContentOption = {
  key: string
  displayName: string
}

type ForwardDetailOption = {
  key: string
  displayName: string
}

const forwardSearchCategory1Options = [
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

type SourceDictionaryItem = {
  id: string
  itemId?: number | null
  name: string
  category1: string
  category2: string | null
  category: string
  subCategory: string
  contentName: string | null
  acquisitionRoutes: AcquisitionRoute[]
  status: string
  icon?: string | null
  iconUrl?: string | null
  image?: string | null
  imageUrl?: string | null
}

type AcquisitionRoute = {
  routeId: string
  type: string
  contentName: string
  detail?: string
  specialConditions?: Record<string, unknown>
  conditionSteps?: ConditionStep[]
  needsReview?: boolean
}

type ConditionStep = {
  type?: string
  target?: string
  count?: number
  note?: string
}

type InterestItem = {
  iconUrl?: string
  name: ActivityCategory
  level: number
}

type TimeRange = {
  start: number
  end: number
}

type PlayTime = {
  weekday: TimeRange
  holiday: TimeRange
}

type ImageSettings = {
  scale: number
  x: number
  y: number
}

type ImageFrameTheme = 'simple' | 'cute' | 'stylish' | 'cool' | 'mechanical'
type TargetFrameTheme = 'simple' | 'cute' | 'stylish'
type TargetFrameCategory = 'fish' | 'mount' | 'minion' | 'gear' | 'music' | 'housing'

const targetFrameThemeOptions: Array<{ value: TargetFrameTheme; label: string }> = [
  { value: 'simple', label: 'シンプル' },
  { value: 'cute', label: 'かわいい' },
  { value: 'stylish', label: 'おしゃれ' },
]

const sectionTitleOptions = {
  target: ['狙ってるもの', 'ほしいもの', 'ほしい！', 'ターゲット'],
  want: ['誘って！', '手伝って！', '連れてって！', '拉致歓迎！'],
  help: ['手伝える！', 'いける！', 'ついていきます。', '護衛可能'],
} as const

type SectionTitleKey = keyof typeof sectionTitleOptions

type SectionTitles = {
  [Key in SectionTitleKey]: typeof sectionTitleOptions[Key][number]
}

const timeOptions = Array.from({ length: 25 }, (_, hour) => hour)

const interestIconUrls: Record<ActivityCategory, string> = {
  戦闘: '/icons/interests/combat.png',
  収集: '/icons/interests/collection.png',
  釣り: '/icons/interests/fishing.png',
  地図: '/icons/interests/treasure.png',
  クラフター: '/icons/interests/crafter.png',
  ギャザラー: '/icons/interests/gatherer.png',
  SS: '/icons/interests/screenshot.png',
  ハウジング: '/icons/interests/housing.png',
  ミラプリ: '/icons/interests/glamour.png',
  演奏: '/icons/interests/performance.png',
  PvP: '/icons/interests/pvp.png',
  交流: '/icons/interests/social.png',
  RP: '/icons/interests/rp.png',
  金策: '/icons/interests/gil.png',
  モブハント: '/icons/interests/other.png',
  その他: '/icons/interests/other.png',
}

const searchItems = (searchDictionary as Array<SearchDictionaryItem & DictionaryMetadata>)
  .filter((item) => item.type !== 'metadata' && item.sourceDictionaryId)

const sourceItems = (sourceDictionary as Array<SourceDictionaryItem & DictionaryMetadata>)
  .filter((item) => item.type !== 'metadata')

const sourceItemById = new Map(sourceItems.map((item) => [item.id, item]))

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

function resolveTargetIconUrl(
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

function getSearchItemIconUrl(item: SearchDictionaryItem): string | null {
  const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined

  return resolveTargetIconUrl(item, sourceItem)
}

function withResolvedSearchItem(item: SearchDictionaryItem): SearchDictionaryItem {
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
  }
}

const enrichedSearchItems = searchItems.map(enrichSearchItem)

function sortAcquisitionCategories(categories: Iterable<ForwardAcquisitionCategory>) {
  return [...new Set(categories)].sort(
    (left, right) => (forwardAcquisitionCategoryOrder.get(left) ?? 99) - (forwardAcquisitionCategoryOrder.get(right) ?? 99),
  )
}

function getForwardAcquisitionCategories(category1: string) {
  if (!category1) {
    return []
  }

  return sortAcquisitionCategories(
    enrichedSearchItems
      .filter((item) => item.category1 === category1)
      .map((item) => item.acquisitionCategory),
  )
}

function getForwardContentNames(category1: string, acquisitionCategory: string): ForwardContentOption[] {
  if (!category1 || !acquisitionCategory) {
    return []
  }

  const options = new Map<string, string>()

  for (const item of enrichedSearchItems) {
    if (item.category1 !== category1 || item.acquisitionCategory !== acquisitionCategory) {
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

function getForwardDetails(
  category1: string,
  acquisitionCategory: string,
  contentName: string,
): ForwardDetailOption[] {
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

function getForwardSearchCandidates(filters: {
  category1: string
  acquisitionCategory: string
  contentName: string
  detail: string
}) {
  return enrichedSearchItems.filter((item) => {
    if (filters.category1 && item.category1 !== filters.category1) {
      return false
    }

    if (filters.acquisitionCategory && item.acquisitionCategory !== filters.acquisitionCategory) {
      return false
    }

    if (filters.contentName && item.contentName !== filters.contentName) {
      return false
    }

    if (filters.detail && !item.details.includes(filters.detail)) {
      return false
    }

    return true
  })
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase()
}

function itemMatchesSearchQuery(item: SearchDictionaryItem, normalizedQuery: string) {
  if (item.name.toLowerCase().includes(normalizedQuery)) {
    return true
  }

  return (item.searchNames ?? []).some((searchName) => searchName.toLowerCase().includes(normalizedQuery))
}

function getSearchResults(query: string) {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) {
    return []
  }

  return searchItems
    .filter((item) => itemMatchesSearchQuery(item, normalizedQuery))
    .slice(0, 8)
}

function getActivityCategoryFromDictionary(category: string | undefined): ActivityCategory {
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

function getTargetIconFromDictionary(item: SearchDictionaryItem, sourceItem?: SourceDictionaryItem) {
  if (resolveTargetIconUrl(item, sourceItem)) {
    return ''
  }

  return getTargetFallbackIcon(item)
}

function formatConditionValue(value: unknown): string {
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

  return value == null ? '' : String(value)
}

function translateLocationName(value: unknown): string {
  const english = formatConditionValue(value)

  if (!english) {
    return ''
  }

  return locationTranslationMap.get(english) ?? english
}

function translateFishTerm(value: unknown): string {
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

function getConditionLabel(key: string) {
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
  }

  return labels[key] ?? key
}

function getStepLabel(type: string | undefined) {
  const labels: Record<string, string> = {
    bait: '餌',
    mooch: '泳がせ',
    intuition: '直感',
    surfaceSlap: '撒き餌',
    prizeCatch: '大物狙い',
    gig: 'ギグ',
  }

  return type ? labels[type] ?? type : '条件'
}

const IMAGE_SCALE_MIN = 1
const IMAGE_SCALE_MAX = 4.5
const CARD_CONTENT_DISPLAY_LIMIT = 5
const EDIT_CONTENT_DISPLAY_LIMIT = 5

const defaultInterestNames: ActivityCategory[] = [
  '戦闘',
  '収集',
  '釣り',
  '地図',
  'クラフター',
  'ギャザラー',
  'SS',
  'ハウジング',
  'ミラプリ',
  '演奏',
  'PvP',
  '交流',
  'RP',
  '金策',
  'モブハント',
]

function createDefaultInterests(): InterestItem[] {
  return defaultInterestNames.map((name) => ({
    iconUrl: interestIconUrls[name],
    name,
    level: 1,
  }))
}

function createEmptyTarget(): TargetItem {
  return {
    title: '',
    category: 'その他',
    subcategory: '',
    icon: '🎯',
    comment: '',
  }
}

function normalizeTargets(targets: TargetItem[] | undefined): TargetItem[] {
  const normalized = [...(targets ?? [])]

  while (normalized.length < 3) {
    normalized.push(createEmptyTarget())
  }

  return normalized.slice(0, 3)
}

function updateTargetAtIndex(
  targets: TargetItem[] | undefined,
  targetIndex: number,
  updater: (target: TargetItem) => TargetItem,
): TargetItem[] {
  const normalized = normalizeTargets(targets)
  normalized[targetIndex] = updater(normalized[targetIndex] ?? createEmptyTarget())
  return normalized
}

type CharacterState = {
  name: string
  dc: DataCenter
  world: string
  imageUrl: string
  imageSettings: ImageSettings
  imageFrameTheme: ImageFrameTheme
  targetFrameTheme: TargetFrameTheme
  roles: {
    tank: boolean
    healer: boolean
    dps: boolean
  }
  playTime: PlayTime
  vc: VoiceChat
  interests: InterestItem[]
  targets: TargetItem[]
  todoList: TodoItem[]
  unfinishedList: TodoItem[]
  sectionTitles: SectionTitles
  tags: string[]
  message: string
}

function createEmptyCharacter(): CharacterState {
  const defaultDc: DataCenter = 'Elemental'

  return {
    name: '',
    dc: defaultDc,
    world: worldsByDc[defaultDc][0],
    imageUrl: '',
    imageSettings: {
      scale: 1,
      x: 0,
      y: 0,
    },
    imageFrameTheme: 'simple',
    targetFrameTheme: 'simple',
    roles: {
      tank: false,
      healer: false,
      dps: false,
    },
    playTime: {
      weekday: { start: 21, end: 24 },
      holiday: { start: 12, end: 3 },
    },
    vc: 'VC OK',
    interests: createDefaultInterests(),
    targets: normalizeTargets([]),
    todoList: [],
    unfinishedList: [],
    sectionTitles: {
      target: '狙ってるもの',
      want: '誘って！',
      help: '手伝える！',
    },
    tags: [],
    message: '',
  }
}

const initialCharacter = createEmptyCharacter()

type RoleKey = keyof CharacterState['roles']

function createDefaultCardDraft(): CardDraft {
  return {
    version: CARD_DRAFT_VERSION,
    character: buildCharacterDraft(initialCharacter),
    cardColorTheme: 'beige',
    cardBaseBackground: '01',
    cardSectionTheme: 'fish',
    cardSectionStyle: 'simple',
    targetSearchQueries: ['', '', ''],
    contentSelections: {
      todoList: getInitialContentSelection(),
      unfinishedList: getInitialContentSelection(),
    },
  }
}

function restoreCharacterFromDraft(characterDraft: CharacterDraft): CharacterState {
  const emptyCharacter = createEmptyCharacter()

  return {
    ...emptyCharacter,
    ...characterDraft,
    imageUrl: '',
    interests: (characterDraft.interests.length > 0 ? characterDraft.interests : emptyCharacter.interests).map((interest) => ({
      ...interest,
      iconUrl: interestIconUrls[interest.name],
    })),
    targets: normalizeTargets(characterDraft.targets.map((target) => ({
      ...target,
      acquisitionRoutes: (target.acquisitionRoutes ?? []) as AcquisitionRoute[],
    }))),
  }
}

function loadPersistedAppState() {
  const defaultDraft = createDefaultCardDraft()
  const isSaveEnabled = readSaveEnabled()

  if (!isSaveEnabled) {
    return {
      isSaveEnabled: false,
      restoredFromDraft: false,
      character: createEmptyCharacter(),
      cardColorTheme: defaultDraft.cardColorTheme,
      cardBaseBackground: defaultDraft.cardBaseBackground,
      cardSectionTheme: defaultDraft.cardSectionTheme,
      cardSectionStyle: defaultDraft.cardSectionStyle,
      targetSearchQueries: [...defaultDraft.targetSearchQueries],
      contentSelections: { ...defaultDraft.contentSelections },
    }
  }

  const draft = readCardDraft(defaultDraft)

  if (!draft) {
    return {
      isSaveEnabled: true,
      restoredFromDraft: false,
      character: createEmptyCharacter(),
      cardColorTheme: defaultDraft.cardColorTheme,
      cardBaseBackground: defaultDraft.cardBaseBackground,
      cardSectionTheme: defaultDraft.cardSectionTheme,
      cardSectionStyle: defaultDraft.cardSectionStyle,
      targetSearchQueries: [...defaultDraft.targetSearchQueries],
      contentSelections: { ...defaultDraft.contentSelections },
    }
  }

  return {
    isSaveEnabled: true,
    restoredFromDraft: true,
    character: restoreCharacterFromDraft(draft.character),
    cardColorTheme: draft.cardColorTheme,
    cardBaseBackground: draft.cardBaseBackground,
    cardSectionTheme: draft.cardSectionTheme,
    cardSectionStyle: draft.cardSectionStyle,
    targetSearchQueries: [...draft.targetSearchQueries],
    contentSelections: { ...draft.contentSelections },
  }
}

let initialAppStateCache: ReturnType<typeof loadPersistedAppState> | null = null

function getInitialAppState() {
  initialAppStateCache ??= loadPersistedAppState()
  return initialAppStateCache
}

function Stars({
  level,
  isEditable = false,
  onChange,
}: {
  level: number
  isEditable?: boolean
  onChange?: (level: number) => void
}) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((starLevel) => (
        <button
          className={starLevel <= level ? 'filled' : ''}
          type="button"
          key={starLevel}
          disabled={!isEditable}
          aria-label={`興味度${starLevel}`}
          onClick={() => onChange?.(starLevel)}
        >
          {starLevel <= level ? '★' : '☆'}
        </button>
      ))}
    </span>
  )
}

function normalizePlayTime(playTime: PlayTime | string[]): PlayTime {
  if (Array.isArray(playTime)) {
    return {
      weekday: { start: 21, end: 24 },
      holiday: { start: 12, end: 3 },
    }
  }

  return playTime
}

function formatHour(hour: number) {
  return `${hour}時`
}

function formatTimeRange(range: TimeRange) {
  return `${formatHour(range.start)}〜${formatHour(range.end)}`
}

function isActiveHour(hour: number, range: TimeRange) {
  const endHour = range.end === 24 ? 24 : range.end

  if (range.start === endHour) {
    return false
  }

  if (range.start < endHour) {
    return hour >= range.start && hour < endHour
  }

  return hour >= range.start || hour < endHour
}

function PlayTimeMeter({ label, range }: { label: string; range: TimeRange }) {
  return (
    <div className="playTimeMeter">
      <span>{label}</span>
      <div className="playTimeTrack">
        <div className="timeScale" aria-hidden="true">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
        <div className="timeBlocks" aria-label={`${label} ${formatTimeRange(range)}`}>
          {Array.from({ length: 24 }, (_, hour) => (
            <i
              className={isActiveHour(hour, range) ? 'active' : ''}
              key={hour}
              title={`${hour}時`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function getInterestIconUrl(interest: InterestItem) {
  return interest.iconUrl ?? interestIconUrls[interest.name]
}

function normalizeContentList(items: Array<TodoItem | string>): TodoItem[] {
  return items.map((item) => (
    typeof item === 'string' ? { title: item } : item
  ))
}

function getImageCrossOrigin(src: string | undefined | null) {
  if (!src) {
    return undefined
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    return 'anonymous' as const
  }

  return undefined
}

function getInitialContentSelection(): ContentSelection {
  const firstMajor = inviteMajorCategories[0]
  const firstMiddle = firstMajor.middleItems[0]
  const firstPurpose = getActivityPurposeItems(firstMajor.id)[0]

  return {
    majorId: firstMajor.id,
    middleId: firstMiddle.id,
    purposeId: firstPurpose.id,
  }
}

function getInviteMajorOption(majorId: InviteMajorId) {
  return getInviteMajorCategory(majorId)
}

function getInviteMiddleOptions(majorId: InviteMajorId) {
  return getInviteMiddleItems(majorId)
}

function getInviteMiddleOption(selection: Pick<ContentSelection, 'majorId' | 'middleId'>) {
  return getInviteMiddleItem(selection.majorId, selection.middleId)
}

function getInvitePurposeOptions(selection: Pick<ContentSelection, 'majorId'>) {
  return getActivityPurposeItems(selection.majorId)
}

function getInvitePurposeOption(selection: ContentSelection) {
  return getActivityPurposeItem(selection.majorId, selection.purposeId)
}

function getTodoItemKey(item: TodoItem) {
  return `${item.middle ?? ''}|${item.title}`
}

function renderTodoItemLines(item: TodoItem) {
  if (item.middle) {
    return (
      <>
        <strong>{item.middle}</strong>
        <span>{item.title}</span>
      </>
    )
  }

  return (
    <>
      <strong>{item.title}</strong>
      {item.category && <span>{item.category}</span>}
    </>
  )
}

function InviteContentPicker({
  selection,
  onSelectionChange,
  onAdd,
}: {
  selection: ContentSelection
  onSelectionChange: (field: keyof ContentSelection, value: string) => void
  onAdd: () => void
}) {
  return (
    <div className="contentPicker editForm">
      <label>
        大項目
        <select
          value={selection.majorId}
          onChange={(event) => onSelectionChange('majorId', event.target.value)}
        >
          {inviteMajorCategories.map((category) => (
            <option key={category.id} value={category.id}>{category.label}</option>
          ))}
        </select>
      </label>

      <label>
        中項目
        <select
          value={selection.middleId}
          onChange={(event) => onSelectionChange('middleId', event.target.value)}
        >
          {getInviteMiddleOptions(selection.majorId).map((group) => (
            <option key={group.id} value={group.id}>{group.label}</option>
          ))}
        </select>
      </label>

      <label>
        小項目
        <select
          value={selection.purposeId}
          onChange={(event) => onSelectionChange('purposeId', event.target.value)}
        >
          {getInvitePurposeOptions(selection).map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>

      <button type="button" onClick={onAdd}>
        追加
      </button>
    </div>
  )
}

function getTargetFrameCategory(target: TargetItem): TargetFrameCategory | null {
  const sourceItem = target.sourceDictionaryId ? sourceItemById.get(target.sourceDictionaryId) : undefined
  const category1 = sourceItem?.category1 ?? ''
  const classification = `${category1} ${target.subcategory} ${target.category} ${target.title}`

  if (category1 === '魚' || classification.includes('魚') || classification.includes('釣り') || classification.includes('ヌシ')) {
    return 'fish'
  }

  if (category1 === 'マウント' || classification.includes('マウント')) {
    return 'mount'
  }

  if (category1 === 'ミニオン' || classification.includes('ミニオン')) {
    return 'minion'
  }

  if (
    category1 === '装備'
    || category1 === '髪型'
    || classification.includes('装備')
    || classification.includes('髪型')
    || classification.includes('ヘアカタログ')
  ) {
    return 'gear'
  }

  if (category1 === '譜面' || classification.includes('譜面') || classification.includes('オーケストリオン') || classification.includes('楽譜')) {
    return 'music'
  }

  if (
    category1 === 'エモート'
    || classification.includes('エモート')
    || classification.includes('家具')
    || classification.includes('ハウジング')
  ) {
    return 'housing'
  }

  return null
}

function getTargetFrameUrl(target: TargetItem, theme: TargetFrameTheme) {
  const frameCategory = getTargetFrameCategory(target)

  if (!frameCategory) {
    return ''
  }

  return `/icons/target_frames/${frameCategory}/${frameCategory}_${theme}.png`
}

function handleIconError(event: SyntheticEvent<HTMLImageElement>, src: string) {
  const image = event.currentTarget

  if (image.dataset.fallbackApplied === 'true') {
    return
  }

  image.dataset.fallbackApplied = 'true'
  image.src = `/public${src}`
}

function isFishTarget(target: TargetItem) {
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

function isContentTranslationTarget(target: TargetItem) {
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

function translateContentName(value: unknown, enabled: boolean) {
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

function getWantTitleSizeClass(title: string) {
  const length = title.length

  if (length >= 17) {
    return 'titleVeryLong'
  }

  if (length >= 13) {
    return 'titleLong'
  }

  if (length >= 10) {
    return 'titleMedium'
  }

  return ''
}

function getTodoTitleSizeClass(item: TodoItem) {
  const primaryText = item.middle?.trim() || item.title.trim()
  return getWantTitleSizeClass(primaryText)
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

function getSplitRouteDisplay(route: AcquisitionRoute, translateContent: boolean) {
  const d2Display = parseD2RouteDisplay(route)

  if (d2Display) {
    return translateD2RouteDisplay(d2Display, translateContent)
  }

  if (isD1CoreSplitRoute(route)) {
    return {
      contentName: translateContentName(route.contentName, translateContent),
      detail: translateContentName(route.detail, translateContent),
    }
  }

  return null
}

function usesSplitRouteDisplay(route: AcquisitionRoute) {
  return parseD2RouteDisplay(route) !== null || isD1CoreSplitRoute(route)
}

function getRouteDisplayText(route: AcquisitionRoute, options?: { translateContent?: boolean }) {
  const translateContent = options?.translateContent ?? false

  if (route.detail && !isInternalRouteMemo(route.detail)) {
    return translateContentName(route.detail, translateContent)
  }

  if (route.contentName && !isInternalRouteMemo(route.contentName)) {
    return translateContentName(route.contentName, translateContent)
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

function deduplicateAcquisitionRoutes(routes: AcquisitionRoute[]) {
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

function formatFishingWeather(value: unknown) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const weather = value as { previous?: unknown; current?: unknown }
    const previous = translateFishTermList(weather.previous)
    const current = translateFishTermList(weather.current)

    return previous && current ? `${previous}→${current}` : current || previous
  }

  return translateFishTermList(value)
}

function formatFishStepText(step: ConditionStep) {
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

function getConditionStepText(steps: ConditionStep[] | undefined) {
  if (!steps?.length) {
    return ''
  }

  if (steps.length === 1 && ['bait', 'mooch'].includes(steps[0].type ?? '')) {
    return ''
  }

  return steps.map((step) => formatFishStepText(step)).join(' → ')
}

function formatFolklore(value: unknown) {
  const text = formatConditionValue(value)

  if (!text) {
    return ''
  }

  return translateFishTerm(text) || '必要'
}

function formatIntuitionFish(value: unknown) {
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

function getFishPlaceDisplay(route: AcquisitionRoute) {
  const conditions = route.specialConditions ?? {}
  const area = translateLocationName(conditions.area)
  const location = translateLocationName(conditions.location)

  return [area, location].filter(Boolean).join(': ')
}

function FishRouteDetails({ route }: { route: AcquisitionRoute }) {
  const conditions = route.specialConditions ?? {}
  const place = getFishPlaceDisplay(route)
  const time = formatConditionValue(conditions.time)
  const weather = formatFishingWeather(conditions.weather)
  const bait = translateFishTerm(conditions.bait)
  const mooch = translateFishTerm(conditions.mooch)
  const snagging = conditions.snagging === true
  const folklore = formatFolklore(conditions.folklore)
  const intuitionText = formatIntuitionFish(conditions.intuition)
  const stepText = getConditionStepText(route.conditionSteps)
  const conditionText = [
    mooch ? `泳がせ: ${mooch}` : '',
    snagging ? 'ひっかけ釣り' : '',
    folklore ? `伝承録: ${folklore}` : '',
    intuitionText ? `直感: ${intuitionText}` : '',
  ].filter(Boolean).join(' / ')

  return (
    <dl className="fishConditions">
      {place && (
        <div>
          <dt>場所</dt>
          <dd>{place}</dd>
        </div>
      )}
      {(time || weather) && (
        <div>
          <dt>条件</dt>
          <dd>{[time, weather].filter(Boolean).join(': ')}</dd>
        </div>
      )}
      {bait && (
        <div>
          <dt>餌</dt>
          <dd>{bait}</dd>
        </div>
      )}
      {conditionText && (
        <div>
          <dt>条件</dt>
          <dd>{conditionText}</dd>
        </div>
      )}
      {stepText && (
        <div>
          <dt>手順</dt>
          <dd>{stepText}</dd>
        </div>
      )}
    </dl>
  )
}

function TargetDetails({ target, isCompact = false }: { target: TargetItem; isCompact?: boolean }) {
  const routes = deduplicateAcquisitionRoutes(target.acquisitionRoutes ?? [])
  const priorityConditionKeys = ['area', 'location', 'weather', 'time']
  const isFish = isFishTarget(target)
  const translateContent = isContentTranslationTarget(target)
  const hasSplitRoute = routes.some((route) => usesSplitRouteDisplay(route))

  return (
    <div className={`targetDetails ${isCompact ? 'compact' : ''}`}>
      {!isFish && target.contentName && !hasSplitRoute && (
        <div className="targetContentName">入手経路: {translateContentName(target.contentName, translateContent)}</div>
      )}

      {routes.length > 0 && (
        <div className="routeList">
          {routes.map((route, routeIndex) => {
            const splitDisplay = isFish ? null : getSplitRouteDisplay(route, translateContent)

            return (
            <div className="routeItem" key={route.routeId ?? `${route.type}-${routeIndex}`}>
              {isFish ? (
                <FishRouteDetails route={route} />
              ) : splitDisplay ? (
                <>
                  <strong>{route.type}</strong>
                  <div className="routeContentLine">
                    入手経路: {splitDisplay.contentName}
                  </div>
                  <div className="routeDetailLine">
                    詳細: {splitDisplay.detail}
                  </div>
                </>
              ) : (
                <>
                  <strong>{route.type}</strong>
                  <span>{getRouteDisplayText(route, { translateContent })}</span>
                </>
              )}

              {!isFish && route.specialConditions && Object.keys(route.specialConditions).length > 0 && (
                <dl className="specialConditions">
                  {Object.entries(route.specialConditions)
                    .filter(([key]) => priorityConditionKeys.includes(key))
                    .map(([key, value]) => {
                    const formattedValue = formatConditionValue(value)

                    return formattedValue ? (
                      <div key={key}>
                        <dt>{getConditionLabel(key)}</dt>
                        <dd>{formattedValue}</dd>
                      </div>
                    ) : null
                  })}
                </dl>
              )}

              {!isFish && (
                (route.specialConditions && Object.keys(route.specialConditions).some((key) => !priorityConditionKeys.includes(key))) ||
                (route.conditionSteps && route.conditionSteps.length > 0)
              ) && (
                <details className="extraConditions">
                  <summary>特殊条件あり</summary>

                  {route.specialConditions && (
                    <dl className="specialConditions">
                      {Object.entries(route.specialConditions)
                        .filter(([key]) => !priorityConditionKeys.includes(key))
                        .map(([key, value]) => {
                          const formattedValue = formatConditionValue(value)

                          return formattedValue ? (
                            <div key={key}>
                              <dt>{getConditionLabel(key)}</dt>
                              <dd>{formattedValue}</dd>
                            </div>
                          ) : null
                        })}
                    </dl>
                  )}

                  {route.conditionSteps && route.conditionSteps.length > 0 && (
                    <ol className="conditionSteps">
                      {route.conditionSteps.map((step, stepIndex) => (
                        <li key={`${step.type}-${step.target}-${stepIndex}`}>
                          {getStepLabel(step.type)}
                          {step.target ? `: ${step.target}` : ''}
                          {step.count ? ` x${step.count}` : ''}
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TargetForwardSearch({
  onSelect,
}: {
  onSelect: (item: SearchDictionaryItem) => void
}) {
  const [category1, setCategory1] = useState('')
  const [acquisitionCategory, setAcquisitionCategory] = useState<ForwardAcquisitionCategory | ''>('')
  const [contentName, setContentName] = useState('')
  const [detail, setDetail] = useState('')

  const acquisitionOptions = getForwardAcquisitionCategories(category1)
  const contentOptions = getForwardContentNames(category1, acquisitionCategory)
  const detailOptions = getForwardDetails(category1, acquisitionCategory, contentName)
  const candidates = getForwardSearchCandidates({
    category1,
    acquisitionCategory,
    contentName,
    detail,
  }).slice(0, 40)

  return (
    <div className="forwardSearchPanel">
      <label>
        ① 種類
        <select
          value={category1}
          onChange={(event) => {
            setCategory1(event.target.value)
            setAcquisitionCategory('')
            setContentName('')
            setDetail('')
          }}
        >
          <option value="">選択してください</option>
          {forwardSearchCategory1Options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      <label>
        ② 入手カテゴリ
        <select
          value={acquisitionCategory}
          disabled={!category1}
          onChange={(event) => {
            setAcquisitionCategory(event.target.value as ForwardAcquisitionCategory | '')
            setContentName('')
            setDetail('')
          }}
        >
          <option value="">選択してください</option>
          {acquisitionOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      <label>
        ③ コンテンツ
        <select
          value={contentName}
          disabled={!acquisitionCategory}
          onChange={(event) => {
            setContentName(event.target.value)
            setDetail('')
          }}
        >
          <option value="">選択してください</option>
          {contentOptions.map((option) => (
            <option key={option.key} value={option.key}>{option.displayName}</option>
          ))}
        </select>
      </label>

      {detailOptions.length > 0 && (
        <label>
          ④ 詳細
          <select
            value={detail}
            disabled={!contentName}
            onChange={(event) => setDetail(event.target.value)}
          >
            <option value="">指定なし</option>
            {detailOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.displayName}</option>
            ))}
          </select>
        </label>
      )}

      <div className="forwardSearchCandidates">
        <div className="forwardSearchCandidatesTitle">
          ⑤ 候補
          {contentName && <span>{candidates.length}件</span>}
        </div>

        {!contentName && (
          <p className="forwardSearchHint">種類・入手カテゴリ・コンテンツを選ぶと候補が表示されます。</p>
        )}

        {contentName && candidates.length === 0 && (
          <p className="forwardSearchHint">条件に一致する候補がありません。</p>
        )}

        {contentName && candidates.length > 0 && (
          <div className="searchResultList forwardSearchResultList">
            {candidates.map((item) => {
              const iconUrl = item.resolvedIconUrl ?? getSearchItemIconUrl(item)

              return (
              <button
                key={`${item.sourceDictionaryId}-${item.name}`}
                type="button"
                onClick={() => onSelect(withResolvedSearchItem(item))}
              >
                {iconUrl && <img src={iconUrl} alt="" />}
                <span>{item.name}</span>
                <small>{item.category} / {item.subCategory}</small>
              </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TargetSearch({
  query,
  onQueryChange,
  onSelect,
}: {
  query: string
  onQueryChange: (value: string) => void
  onSelect: (item: SearchDictionaryItem) => void
}) {
  const [isForwardOpen, setIsForwardOpen] = useState(false)
  const results = getSearchResults(query)
  const hasSearchQuery = normalizeSearchText(query).length > 0

  return (
    <div className="targetSearch">
      <label>
        欲しいものを検索
        <input
          type="search"
          value={query}
          placeholder="アイテム名・コンテンツ名で検索"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <button
        className="forwardSearchToggle"
        type="button"
        onClick={() => setIsForwardOpen((current) => !current)}
      >
        {isForwardOpen ? '閉じる' : '条件から探す'}
      </button>

      {isForwardOpen ? (
        <TargetForwardSearch
          onSelect={(item) => {
            onSelect(withResolvedSearchItem(item))
            setIsForwardOpen(false)
          }}
        />
      ) : hasSearchQuery ? (
        <div className="searchResultList">
          {results.map((item) => {
            const iconUrl = getSearchItemIconUrl(item)

            return (
            <button
              key={`${item.sourceDictionaryId}-${item.name}`}
              type="button"
              onClick={() => onSelect(withResolvedSearchItem(item))}
            >
              {iconUrl && <img src={iconUrl} alt="" />}
              <span>{item.name}</span>
              <small>{item.category} / {item.subCategory}</small>
            </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getImageMoveRange(scale: number) {
  return Math.round((scale - 1) * 90)
}

function App() {
  const [character, setCharacter] = useState<CharacterState>(() => getInitialAppState().character)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [isExportingCard, setIsExportingCard] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const [hasTargetFrame, setHasTargetFrame] = useState(false)
  const [isSaveEnabled, setIsSaveEnabled] = useState(() => getInitialAppState().isSaveEnabled)
  const [restoredFromDraft, setRestoredFromDraft] = useState(() => getInitialAppState().restoredFromDraft)
  const [cardColorTheme, setCardColorTheme] = useState<CardColorTheme>(() => getInitialAppState().cardColorTheme)
  const [cardBaseBackground, setCardBaseBackground] = useState<CardBaseBackground>(() => getInitialAppState().cardBaseBackground)
  const [cardSectionTheme, setCardSectionTheme] = useState<CardSectionTheme>(() => getInitialAppState().cardSectionTheme)
  const [cardSectionStyle, setCardSectionStyle] = useState<CardSectionStyle>(() => getInitialAppState().cardSectionStyle)
  const getCardSectionBackgroundStyle = useCardSectionBackgroundStyles(cardSectionTheme, cardSectionStyle)
  const [targetSearchQueries, setTargetSearchQueries] = useState(() => getInitialAppState().targetSearchQueries)
  const [contentSelections, setContentSelections] = useState<{
    todoList: ContentSelection
    unfinishedList: ContentSelection
  }>(() => getInitialAppState().contentSelections)

  function updateCharacterName(value: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      name: value,
    }))
  }

  function updateCharacterMessage(message: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      message,
    }))
  }

  function updateCharacterImage(file: File | undefined) {
    if (!file) {
      return
    }

    const imageUrl = URL.createObjectURL(file)

    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      imageUrl,
      imageSettings: currentCharacter.imageSettings ?? {
        scale: 1,
        x: 0,
        y: 0,
      },
    }))
  }

  function updateImageSetting(field: keyof ImageSettings, value: number) {
    setCharacter((currentCharacter) => {
      const currentSettings = currentCharacter.imageSettings ?? { scale: 1, x: 0, y: 0 }

      if (field === 'scale') {
        const nextScale = clampNumber(value, IMAGE_SCALE_MIN, IMAGE_SCALE_MAX)
        const nextMoveRange = getImageMoveRange(nextScale)

        return {
          ...currentCharacter,
          imageSettings: {
            scale: nextScale,
            x: clampNumber(currentSettings.x, -nextMoveRange, nextMoveRange),
            y: clampNumber(currentSettings.y, -nextMoveRange, nextMoveRange),
          },
        }
      }

      const moveRange = getImageMoveRange(currentSettings.scale)

      return {
        ...currentCharacter,
        imageSettings: {
          ...currentSettings,
          [field]: clampNumber(value, -moveRange, moveRange),
        },
      }
    })
  }

  function updateDataCenter(dc: DataCenter) {
    setCharacter((currentCharacter) => {
      const worlds = worldsByDc[dc]
      const world = (worlds as readonly string[]).includes(currentCharacter.world)
        ? currentCharacter.world
        : worlds[0]

      return {
        ...currentCharacter,
        dc,
        world,
      }
    })
  }

  function updateWorld(world: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      world,
    }))
  }

  function updateRole(role: RoleKey, checked: boolean) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      roles: {
        ...currentCharacter.roles,
        [role]: checked,
      },
    }))
  }

  function updatePlayTime(day: keyof PlayTime, field: keyof TimeRange, value: number) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      playTime: {
        ...normalizePlayTime(currentCharacter.playTime),
        [day]: {
          ...normalizePlayTime(currentCharacter.playTime)[day],
          [field]: value,
        },
      },
    }))
  }

  function updateVoiceChat(vc: VoiceChat) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      vc,
    }))
  }

  function updateTargetSearchQuery(targetIndex: number, query: string) {
    setTargetSearchQueries((currentQueries) => currentQueries.map((currentQuery, index) => (
      index === targetIndex ? query : currentQuery
    )))
  }

  function selectSearchTarget(targetIndex: number, item: SearchDictionaryItem) {
    const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined
    const category = getActivityCategoryFromDictionary(sourceItem?.category ?? item.category)
    const subcategory = sourceItem?.subCategory ?? item.subCategory ?? ''
    const iconUrl = resolveTargetIconUrl(item, sourceItem)

    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      targets: updateTargetAtIndex(currentCharacter.targets, targetIndex, (target) => ({
        ...target,
        title: item.name,
        category,
        subcategory,
        icon: iconUrl ? '' : getTargetIconFromDictionary(item, sourceItem),
        iconUrl: iconUrl ?? null,
        sourceDictionaryId: item.sourceDictionaryId,
        contentName: sourceItem?.contentName ?? null,
        acquisitionRoutes: sourceItem?.acquisitionRoutes ?? [],
      })),
    }))
    updateTargetSearchQuery(targetIndex, item.name)
  }

  function updateTopTargetComment(comment: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      targets: updateTargetAtIndex(currentCharacter.targets, 0, (target) => ({
        ...target,
        comment,
      })),
    }))
  }

  function updateTargetFrameTheme(targetFrameTheme: TargetFrameTheme) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      targetFrameTheme,
    }))
  }

  function updateInterestLevel(interestName: ActivityCategory, level: number) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      interests: currentCharacter.interests.map((interest) => (
        interest.name === interestName ? { ...interest, level } : interest
      )),
    }))
  }

  function updateSectionTitle<Key extends SectionTitleKey>(
    key: Key,
    value: SectionTitles[Key],
  ) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      sectionTitles: {
        ...currentCharacter.sectionTitles,
        [key]: value,
      },
    }))
  }

  function updateContentSelection(
    listKey: 'todoList' | 'unfinishedList',
    field: keyof ContentSelection,
    value: string,
  ) {
    setContentSelections((currentSelections) => {
      const currentSelection = currentSelections[listKey]

      if (field === 'majorId') {
        const majorId = value as InviteMajorId
        const middleOption = getInviteMiddleOptions(majorId)[0]
        const purposeOption = getActivityPurposeItems(majorId)[0]

        return {
          ...currentSelections,
          [listKey]: {
            majorId,
            middleId: middleOption.id,
            purposeId: purposeOption.id,
          },
        }
      }

      if (field === 'middleId') {
        const middleId = value

        return {
          ...currentSelections,
          [listKey]: { ...currentSelection, middleId },
        }
      }

      return {
        ...currentSelections,
        [listKey]: { ...currentSelection, purposeId: value },
      }
    })
  }

  function addContentItem(listKey: 'todoList' | 'unfinishedList') {
    const selection = contentSelections[listKey]
    const majorOption = getInviteMajorOption(selection.majorId)
    const middleOption = getInviteMiddleOption(selection)
    const purposeOption = getInvitePurposeOption(selection)

    setCharacter((currentCharacter) => {
      const currentList = normalizeContentList(currentCharacter[listKey])

      if (currentList.some((item) => item.middle === middleOption.label && item.title === purposeOption.label)) {
        return currentCharacter
      }

      return {
        ...currentCharacter,
        [listKey]: [
          ...currentList,
          {
            title: purposeOption.label,
            major: majorOption.label,
            middle: middleOption.label,
          },
        ],
      }
    })
  }

  function removeContentItem(listKey: 'todoList' | 'unfinishedList', itemKey: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      [listKey]: normalizeContentList(currentCharacter[listKey]).filter((item) => getTodoItemKey(item) !== itemKey),
    }))
  }

  function handleSaveEnabledChange(enabled: boolean) {
    setIsSaveEnabled(enabled)
    writeSaveEnabled(enabled)
  }

  function handleClearSavedData() {
    if (!window.confirm('保存した入力内容を削除して初期状態に戻しますか？')) {
      return
    }

    const defaultDraft = createDefaultCardDraft()

    clearCardDraft()
    writeSaveEnabled(false)
    setIsSaveEnabled(false)
    setRestoredFromDraft(false)
    setCharacter(createEmptyCharacter())
    setCardColorTheme(defaultDraft.cardColorTheme)
    setCardBaseBackground(defaultDraft.cardBaseBackground)
    setCardSectionTheme(defaultDraft.cardSectionTheme)
    setCardSectionStyle(defaultDraft.cardSectionStyle)
    setTargetSearchQueries([...defaultDraft.targetSearchQueries])
    setContentSelections({ ...defaultDraft.contentSelections })
  }

  useEffect(() => {
    if (!isSaveEnabled) {
      return
    }

    writeCardDraft({
      version: CARD_DRAFT_VERSION,
      character: buildCharacterDraft(character),
      cardColorTheme,
      cardBaseBackground,
      cardSectionTheme,
      cardSectionStyle,
      targetSearchQueries: [
        targetSearchQueries[0] ?? '',
        targetSearchQueries[1] ?? '',
        targetSearchQueries[2] ?? '',
      ],
      contentSelections,
    })
  }, [
    isSaveEnabled,
    character,
    cardColorTheme,
    cardBaseBackground,
    cardSectionTheme,
    cardSectionStyle,
    targetSearchQueries,
    contentSelections,
  ])

  function handlePostOnX() {
    window.open(getXPostIntentUrl(), '_blank', 'noopener,noreferrer')
  }

  async function handleExportCardPng() {
    if (!isPreviewMode || !cardRef.current || isExportingCard) {
      return
    }

    const cardElement = cardRef.current

    setIsExportingCard(true)
    document.body.classList.add('card-png-export')

    try {
      cardElement.scrollIntoView({ block: 'start', inline: 'nearest' })
      void cardElement.offsetHeight
      await exportCardPng(cardElement)
    } catch (error) {
      console.error('Failed to export card PNG', error)
      window.alert('PNGの出力に失敗しました。')
    } finally {
      document.body.classList.remove('card-png-export')
      setIsExportingCard(false)
    }
  }

  const targets = normalizeTargets(character.targets)
  const interests = character.interests ?? []
  const todoList = normalizeContentList(character.todoList ?? [])
  const unfinishedList = normalizeContentList(character.unfinishedList ?? [])
  const contentDisplayLimit = isPreviewMode ? CARD_CONTENT_DISPLAY_LIMIT : EDIT_CONTENT_DISPLAY_LIMIT
  const imageUrl = character.imageUrl ?? ''
  const imageSettings = character.imageSettings ?? { scale: 1, x: 0, y: 0 }
  const imageMoveRange = getImageMoveRange(imageSettings.scale)
  const targetFrameTheme = character.targetFrameTheme ?? 'simple'
  const playTime = normalizePlayTime(character.playTime)
  const sectionTitles = character.sectionTitles ?? {
    target: '狙ってるもの',
    want: '誘って！',
    help: '手伝える！',
  }

  const topTarget = targets[0]
  const targetFrameUrl = getTargetFrameUrl(topTarget, targetFrameTheme)

  return (
    <main className={`app ${isPreviewMode ? 'previewMode' : 'editMode'} cardColor-${cardColorTheme}`}>
      <div className="modeSwitcher" aria-label="表示モード切替">
        <button
          className={!isPreviewMode ? 'active' : ''}
          type="button"
          aria-pressed={!isPreviewMode}
          onClick={() => setIsPreviewMode(false)}
        >
          編集モード
        </button>
        <button
          className={isPreviewMode ? 'active' : ''}
          type="button"
          aria-pressed={isPreviewMode}
          onClick={() => setIsPreviewMode(true)}
        >
          プレビューモード
        </button>
        {isPreviewMode && (
          <>
            <button
              className="cardExportButton"
              type="button"
              onClick={() => void handleExportCardPng()}
              disabled={isExportingCard}
            >
              {isExportingCard ? '出力中…' : 'PNG保存'}
            </button>
            <button
              className="cardXPostButton"
              type="button"
              onClick={handlePostOnX}
            >
              Xで投稿
            </button>
          </>
        )}
        {!isPreviewMode && (
          <>
            <label className="cardThemePicker">
              カード背景
              <select
                value={cardBaseBackground}
                onChange={(event) => setCardBaseBackground(event.target.value as CardBaseBackground)}
              >
                {cardBaseBackgroundOptions.map((background) => (
                  <option key={background.value} value={background.value}>{background.label}</option>
                ))}
              </select>
            </label>
            <label className="cardThemePicker">
              カードカラー
              <select
                value={cardColorTheme}
                onChange={(event) => setCardColorTheme(event.target.value as CardColorTheme)}
              >
                {cardColorThemeOptions.map((theme) => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </label>
            <label className="cardThemePicker">
              項目背景テーマ
              <select
                value={cardSectionTheme}
                onChange={(event) => setCardSectionTheme(event.target.value as CardSectionTheme)}
              >
                {cardSectionThemeOptions.map((theme) => (
                  <option key={theme.value} value={theme.value}>{theme.label}</option>
                ))}
              </select>
            </label>
            <label className="cardThemePicker">
              項目背景スタイル
              <select
                value={cardSectionStyle}
                onChange={(event) => setCardSectionStyle(event.target.value as CardSectionStyle)}
              >
                {cardSectionStyleOptions.map((style) => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {isPreviewMode && (
        <p className="cardXPostNotice">
          画像を保存してから「Xで投稿」を押してください。
          <br />
          投稿画面で保存した画像を添付できます。
        </p>
      )}

      {!isPreviewMode && (
        <section className="draftSavePanel" aria-label="ブラウザ保存">
          <div className="draftSaveToggle">
            <span>入力内容をこのブラウザに保存</span>
            <button
              className={isSaveEnabled ? 'active' : ''}
              type="button"
              role="switch"
              aria-checked={isSaveEnabled}
              onClick={() => handleSaveEnabledChange(!isSaveEnabled)}
            >
              {isSaveEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <button
            className="draftSaveClear"
            type="button"
            onClick={handleClearSavedData}
          >
            保存データを削除
          </button>
        </section>
      )}

      <section
        ref={cardRef}
        className="card"
        style={getCardBaseBackgroundStyle(cardBaseBackground)}
      >
        {!isPreviewMode && (
          <header className="cardHeader">
            <div className="cardHeaderTitleRow">
              <h1>いっしょに あ・そ・ぼ！</h1>
              <button
                className="cardHeaderHelpButton"
                type="button"
                onClick={() => setIsHelpModalOpen(true)}
              >
                つかいかた
              </button>
            </div>
            <div className="cardHeaderIntro">
              <p>
                FF14向けのキャラクターカード・プロフィールカードメーカーです。「今やりたいこと」「ほしいもの」「一緒に遊べること」を入力して、フレンド募集などにそのまま使えるカードを作れます。
              </p>
              <ul>
                <li>画像はブラウザ内で処理されます</li>
                <li>アップロード画像はサーバーへ送信されません</li>
                <li>FF14非公式ファンツールです</li>
              </ul>
            </div>
          </header>
        )}

        <div className="cardBody">
          <div className="heroLayout">
          <section className="topRow">
            <label
              className={`profileImage${imageUrl ? ' profileImage--hasPhoto' : ''}`}
            >
              {imageUrl ? (
                <div
                  className="profilePhotoViewport"
                  style={{
                    transform: `translate(${imageSettings.x}px, ${imageSettings.y}px)`,
                  }}
                >
                  <div
                    className="profilePhotoScaleWrap"
                    style={{
                      transform: `scale(${imageSettings.scale})`,
                    }}
                  >
                    <img
                      className="profilePhoto"
                      src={imageUrl}
                      alt="キャラクター画像"
                      crossOrigin={getImageCrossOrigin(imageUrl)}
                    />
                  </div>
                </div>
              ) : (
                <span>画像</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => updateCharacterImage(event.target.files?.[0])}
              />
            </label>

            {!isPreviewMode && restoredFromDraft && !imageUrl && (
              <p className="profileImageNotice" role="status">
                画像は保存されません。再アップロードしてください。
              </p>
            )}

            {imageUrl && (
            <div className="imageAdjustForm">
                  <label>
                    拡大率
                    <input
                      type="range"
                      min={IMAGE_SCALE_MIN}
                      max={IMAGE_SCALE_MAX}
                      step="0.01"
                      value={imageSettings.scale}
                      onChange={(event) => updateImageSetting('scale', Number(event.target.value))}
                    />
                  </label>

                  <label>
                    横位置
                    <input
                      type="range"
                      min={-imageMoveRange}
                      max={imageMoveRange}
                      step="1"
                      value={imageSettings.x}
                      onChange={(event) => updateImageSetting('x', Number(event.target.value))}
                    />
                  </label>

                  <label>
                    縦位置
                    <input
                      type="range"
                      min={-imageMoveRange}
                      max={imageMoveRange}
                      step="1"
                      value={imageSettings.y}
                      onChange={(event) => updateImageSetting('y', Number(event.target.value))}
                    />
                  </label>
            </div>
            )}

            <section
              className={`mainWant ${hasTargetFrame ? 'hasTargetFrame' : ''}`}
            >
              {targetFrameUrl && (
                <img
                  key={targetFrameUrl}
                  className="targetFrame"
                  src={targetFrameUrl}
                  alt=""
                  aria-hidden="true"
                  onLoad={() => setHasTargetFrame(true)}
                  onError={(event) => {
                    setHasTargetFrame(false)
                    event.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div className="mainWantLabel">👑 ほしいもの１位！</div>
              <div className={`mainWantTitle ${getWantTitleSizeClass(topTarget.title)}`}>
                {topTarget.iconUrl ? (
                  <img className="mainWantIcon" src={topTarget.iconUrl} alt="" crossOrigin={getImageCrossOrigin(topTarget.iconUrl)} />
                ) : topTarget.icon ? (
                  <span className="mainWantIconFallback" aria-hidden="true">{topTarget.icon}</span>
                ) : null}
                {topTarget.title ? <h2>{topTarget.title}</h2> : null}
              </div>
              {isPreviewMode && topTarget.comment ? (
                <p>{topTarget.comment}</p>
              ) : null}
              {(topTarget.title || isPreviewMode) && (
                <div className="categoryBadge">{topTarget.category} / {topTarget.subcategory}</div>
              )}
              {topTarget.title ? <TargetDetails target={topTarget} isCompact /> : null}

              <div className="mainWantForm">
                <label>
                  アピールコメント
                  <textarea
                    rows={3}
                    value={topTarget.comment ?? ''}
                    onChange={(event) => updateTopTargetComment(event.target.value)}
                  />
                </label>

                <TargetSearch
                  query={targetSearchQueries[0] ?? ''}
                  onQueryChange={(query) => updateTargetSearchQuery(0, query)}
                  onSelect={(item) => selectSearchTarget(0, item)}
                />

                <label>
                  フレーム
                  <select
                    value={targetFrameTheme}
                    onChange={(event) => updateTargetFrameTheme(event.target.value as TargetFrameTheme)}
                  >
                    {targetFrameThemeOptions.map((theme) => (
                      <option key={theme.value} value={theme.value}>{theme.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          </section>
          </div>

          <section className="middleRow">
            <section
              className="infoBox characterSummary"
              style={getCardSectionBackgroundStyle('row2_left')}
            >
              <h2>キャラクター情報</h2>
              <p><span>名前</span> {character.name}</p>
              <p><span>DC</span> {character.dc}</p>
              <p><span>World</span> {character.world}</p>

              <div className="summaryGroup">
                <h3>ロール</h3>
                <div className="roleList">
                  <button
                    className={`roleIcon tank ${character.roles.tank ? 'active' : 'inactive'}`}
                    type="button"
                    aria-pressed={character.roles.tank}
                    onClick={() => updateRole('tank', !character.roles.tank)}
                  >
                    <img
                      src="/icons/roles/tank.png"
                      alt="タンク"
                      onError={(event) => handleIconError(event, '/icons/roles/tank.png')}
                    />
                  </button>

                  <button
                    className={`roleIcon healer ${character.roles.healer ? 'active' : 'inactive'}`}
                    type="button"
                    aria-pressed={character.roles.healer}
                    onClick={() => updateRole('healer', !character.roles.healer)}
                  >
                    <img
                      src="/icons/roles/healer.png"
                      alt="ヒーラー"
                      onError={(event) => handleIconError(event, '/icons/roles/healer.png')}
                    />
                  </button>

                  <button
                    className={`roleIcon dps ${character.roles.dps ? 'active' : 'inactive'}`}
                    type="button"
                    aria-pressed={character.roles.dps}
                    onClick={() => updateRole('dps', !character.roles.dps)}
                  >
                    <img
                      src="/icons/roles/dps.png"
                      alt="DPS"
                      onError={(event) => handleIconError(event, '/icons/roles/dps.png')}
                    />
                  </button>
                </div>
              </div>

              <div className="summaryGroup">
                <h3>活動時間</h3>
                <p className="playTimeText">平日 {formatTimeRange(playTime.weekday)}</p>
                <p className="playTimeText">休日 {formatTimeRange(playTime.holiday)}</p>

                <div className="playTimePreview">
                  <PlayTimeMeter label="平日" range={playTime.weekday} />
                  <PlayTimeMeter label="休日" range={playTime.holiday} />
                </div>
              </div>

              <div className="summaryGroup vcSummary">
                <h3>VC</h3>
                <div className="vcBadge">{character.vc}</div>
              </div>

              <div className="editForm">
                <label>
                  名前
                  <input
                    type="text"
                    value={character.name}
                    onChange={(event) => updateCharacterName(event.target.value)}
                  />
                </label>

                <label>
                  DC
                  <select
                    value={character.dc}
                    onChange={(event) => updateDataCenter(event.target.value as DataCenter)}
                  >
                    {dataCenters.map((dc) => (
                      <option key={dc} value={dc}>{dc}</option>
                    ))}
                  </select>
                </label>

                <label>
                  World
                  <select
                    value={character.world}
                    onChange={(event) => updateWorld(event.target.value)}
                  >
                    {worldsByDc[character.dc].map((world) => (
                      <option key={world} value={world}>{world}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="editForm">
                <div className="timeSelectGroup">
                  <span>平日</span>
                  <label>
                    開始
                    <select
                      value={playTime.weekday.start}
                      onChange={(event) => updatePlayTime('weekday', 'start', Number(event.target.value))}
                    >
                      {timeOptions.map((hour) => (
                        <option key={hour} value={hour}>{formatHour(hour)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    終了
                    <select
                      value={playTime.weekday.end}
                      onChange={(event) => updatePlayTime('weekday', 'end', Number(event.target.value))}
                    >
                      {timeOptions.map((hour) => (
                        <option key={hour} value={hour}>{formatHour(hour)}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="timeSelectGroup">
                  <span>休日</span>
                  <label>
                    開始
                    <select
                      value={playTime.holiday.start}
                      onChange={(event) => updatePlayTime('holiday', 'start', Number(event.target.value))}
                    >
                      {timeOptions.map((hour) => (
                        <option key={hour} value={hour}>{formatHour(hour)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    終了
                    <select
                      value={playTime.holiday.end}
                      onChange={(event) => updatePlayTime('holiday', 'end', Number(event.target.value))}
                    >
                      {timeOptions.map((hour) => (
                        <option key={hour} value={hour}>{formatHour(hour)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="editForm">
                <label>
                  VC
                  <select
                    value={character.vc}
                    onChange={(event) => updateVoiceChat(event.target.value as VoiceChat)}
                  >
                    {voiceChatOptions.map((vc) => (
                      <option key={vc} value={vc}>{vc}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {targets.slice(1, 3).map((target, relativeIndex) => {
              const index = relativeIndex + 1
              const slotBackgrounds: CardSectionName[] = ['row2_center', 'row2_right']
              const wantSlotFrameUrl = getTargetFrameUrl(target, targetFrameTheme)

              return (
                <section
                  className="activityColumn wantSlotColumn"
                  key={index}
                  style={getCardSectionBackgroundStyle(slotBackgrounds[relativeIndex] ?? 'row2_right')}
                >
                  <div
                    className={`sectionTitle wantRankTitle--${relativeIndex === 0 ? 'silver' : 'bronze'}`}
                  >
                    ほしいもの{index + 1}位！
                  </div>
                  <div
                    className={`targetItem wantSlotItem${wantSlotFrameUrl ? ' hasWantSlotFrame' : ''}`}
                  >
                    {wantSlotFrameUrl && (
                      <img
                        className="wantSlotFrame"
                        src={wantSlotFrameUrl}
                        alt=""
                        aria-hidden="true"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <div className={`wantSlotTitleGroup ${getWantTitleSizeClass(target.title)}`}>
                      {isPreviewMode && (
                        target.iconUrl ? (
                          <img className="wantSlotIcon" src={target.iconUrl} alt="" crossOrigin={getImageCrossOrigin(target.iconUrl)} />
                        ) : target.icon ? (
                          <span className="wantSlotIconFallback" aria-hidden="true">{target.icon}</span>
                        ) : null
                      )}
                      <strong className="wantSlotTitle">{target.title}</strong>
                    </div>
                    <div className={`wantSlotCategory ${getWantTitleSizeClass(`${target.category} / ${target.subcategory}`)}`}>
                      {target.category} / {target.subcategory}
                    </div>
                    <TargetDetails target={target} />

                    <div className="targetEditForm">
                      <TargetSearch
                        query={targetSearchQueries[index] ?? ''}
                        onQueryChange={(query) => updateTargetSearchQuery(index, query)}
                        onSelect={(item) => selectSearchTarget(index, item)}
                      />
                    </div>
                  </div>
                </section>
              )
            })}
          </section>

          <section className="activityBox">
            <div
              className="activityColumn interestBox"
              style={getCardSectionBackgroundStyle('row3_left')}
            >
              <div className="sectionTitle">好きなこと！興味あるもの！</div>
              <div className="interestGrid">
                {interests.map((interest) => (
                  <div className="interestItem" key={interest.name}>
                    <div className="interestName">
                      <span
                        aria-hidden="true"
                        className="interestIconImage"
                        style={{ backgroundImage: `url("${getInterestIconUrl(interest)}")` }}
                      />
                      <strong>{interest.name}</strong>
                    </div>
                    <Stars
                      level={interest.level}
                      isEditable={!isPreviewMode}
                      onChange={(level) => updateInterestLevel(interest.name, level)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              className="activityColumn"
              style={getCardSectionBackgroundStyle('row3_center')}
            >
              <div className="sectionHeader">
                <div className="sectionTitle previewSectionTitle">{sectionTitles.want}</div>
                <select
                  className="sectionTitleSelect"
                  value={sectionTitles.want}
                  onChange={(event) => updateSectionTitle('want', event.target.value as SectionTitles['want'])}
                >
                  {sectionTitleOptions.want.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <InviteContentPicker
                selection={contentSelections.todoList}
                onSelectionChange={(field, value) => updateContentSelection('todoList', field, value)}
                onAdd={() => addContentItem('todoList')}
              />

              <ul className="simpleList">
                {todoList.slice(0, contentDisplayLimit).map((todo) => (
                  <li
                    className={`todoSummary${isPreviewMode ? ` ${getTodoTitleSizeClass(todo)}` : ''}`}
                    key={getTodoItemKey(todo)}
                  >
                    {renderTodoItemLines(todo)}
                    <button type="button" onClick={() => removeContentItem('todoList', getTodoItemKey(todo))}>
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="activityColumn"
              style={getCardSectionBackgroundStyle('row3_right')}
            >
              <div className="sectionHeader">
                <div className="sectionTitle previewSectionTitle">{sectionTitles.help}</div>
                <select
                  className="sectionTitleSelect"
                  value={sectionTitles.help}
                  onChange={(event) => updateSectionTitle('help', event.target.value as SectionTitles['help'])}
                >
                  {sectionTitleOptions.help.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <InviteContentPicker
                selection={contentSelections.unfinishedList}
                onSelectionChange={(field, value) => updateContentSelection('unfinishedList', field, value)}
                onAdd={() => addContentItem('unfinishedList')}
              />

              <ul className="simpleList">
                {unfinishedList.slice(0, contentDisplayLimit).map((item) => (
                  <li
                    className={`todoSummary${isPreviewMode ? ` ${getTodoTitleSizeClass(item)}` : ''}`}
                    key={getTodoItemKey(item)}
                  >
                    {renderTodoItemLines(item)}
                    <button type="button" onClick={() => removeContentItem('unfinishedList', getTodoItemKey(item))}>
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bottomRow">
            <section
              className="messageBox"
              style={getCardSectionBackgroundStyle('row4')}
            >
              <div className="sectionTitle">ひとこと</div>
              {isPreviewMode ? (
                character.message ? <p>{character.message}</p> : null
              ) : (
                <div className="editForm messageEditForm">
                  <label>
                    一言コメント
                    <textarea
                      rows={4}
                      value={character.message}
                      onChange={(event) => updateCharacterMessage(event.target.value)}
                    />
                  </label>
                </div>
              )}
            </section>
          </section>
        </div>
      </section>

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <footer className="appFooter">
        <a href="#/terms">利用規約</a>
        <span className="appFooterSeparator" aria-hidden="true">|</span>
        <a href="#/privacy">プライバシーポリシー</a>
        <span className="appFooterSeparator" aria-hidden="true">|</span>
        <a
          href="https://x.com/Rogan_Stone0412"
          rel="noopener noreferrer"
          target="_blank"
        >
          不具合報告・ご意見
        </a>
      </footer>
    </main>
  )
}

export default App