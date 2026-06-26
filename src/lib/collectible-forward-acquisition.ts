import type { ForwardAcquisitionCategory } from '../types/card'
import { refineCollectibleBattleAcquisitionCategory } from './collectible-forward-navigation'

export const COLLECTIBLE_FORWARD_SEARCH_CATEGORY1 = [
  'ミニオン',
  'マウント',
  '譜面',
  'エモート',
  '髪型',
  'ファッションアクセサリー',
] as const

export type CollectibleForwardSearchCategory1 = typeof COLLECTIBLE_FORWARD_SEARCH_CATEGORY1[number]

const COLLECTIBLE_CATEGORY1_SET = new Set<string>(COLLECTIBLE_FORWARD_SEARCH_CATEGORY1)

export const COLLECTIBLE_FORWARD_ACQUISITION_ORDER = [
  'クエスト',
  'ID',
  '討滅戦',
  '極',
  'レイド',
  'アライアンス',
  'バイカラージェム',
  'ゴールドソーサー',
  'ギル購入',
  'その他交換',
  '地図',
  'クラフト・採集',
  'PvP',
  'モブハント',
  '特殊フィールド',
  'イベント',
  '課金',
  '実績・ショップ',
  '潜水艦・飛空艇探索',
  'リテイナーベンチャー',
  'その他',
] as const satisfies readonly ForwardAcquisitionCategory[]

export type CollectibleForwardAcquisitionCategory = typeof COLLECTIBLE_FORWARD_ACQUISITION_ORDER[number]

export const collectibleForwardAcquisitionCategoryOrder = new Map<ForwardAcquisitionCategory, number>(
  COLLECTIBLE_FORWARD_ACQUISITION_ORDER.map((category, index) => [category, index]),
)

const EQUIPMENT_ONLY_CATEGORY2 = new Set(['零式', 'ノーマルレイド'])

const PASSTHROUGH_CATEGORY2 = new Set<string>([
  'クエスト',
  'イベント',
  '課金',
  'レイド',
  '討滅戦',
  'アライアンス',
  'モブハント',
  '極',
  'ID',
  '交換',
  'PvP',
  '地図',
])

const SPECIAL_FIELD_PATTERNS: RegExp[] = [
  /Palace of the Dead/i,
  /Heaven-on-High/i,
  /死者の宮殿/i,
  /アメノミハシラ/i,
  /Eureka/i,
  /エウレカ/i,
  /Bozja/i,
  /ボズヤ/i,
  /南方ボズヤ戦線/i,
  /Orthos/i,
  /オルト・エウレカ/i,
  /Cosmic Exploration/i,
  /Cosmic Fortune/i,
  /コスモ/i,
  /Island Sanctuary/i,
  /無人島/i,
  /Occult Crescent/i,
  /蜃気楼/i,
  /クレセントアイル/i,
  /六根山/i,
  /アロアロ島/i,
]

const SUBMARINE_AIRSHIP_PATTERNS: RegExp[] = [
  /潜水艦/,
  /飛空艇/,
  /Submarine/i,
  /Airship/i,
  /Subaquatic Voyages/i,
  /Exploratory Voyage/i,
  /^Voyages$/i,
]

const RETAINER_VENTURE_PATTERNS: RegExp[] = [
  /リテイナー/,
  /Retainer/i,
  /Venture/i,
  /Exploration X{1,3}[IVXLC]+/i,
  /Exploration X{1,3}I\b/i,
]

const ACHIEVEMENT_SHOP_PATTERNS: RegExp[] = [
  /Achievement/i,
  /実績/i,
  /Jonathas/i,
  /MGP/i,
  /Gold Saucer/i,
  /Companion app/i,
  /Skybuilders'? Scrips/i,
  /Seafarer'?s Cowries/i,
  /Bozjan Clusters/i,
  /Kupo of Fortune/i,
  /Merchant/i,
]

export function isCollectibleForwardSearchCategory1(category1: string): category1 is CollectibleForwardSearchCategory1 {
  return COLLECTIBLE_CATEGORY1_SET.has(category1)
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function resolveSpecialFieldCategory(contentName: string | null | undefined, name: string): boolean {
  const haystack = `${contentName ?? ''} ${name}`
  return matchesAny(haystack, SPECIAL_FIELD_PATTERNS)
}

function resolveAchievementShopCategory(contentName: string | null | undefined, name: string): boolean {
  const haystack = `${contentName ?? ''} ${name}`
  return matchesAny(haystack, ACHIEVEMENT_SHOP_PATTERNS)
}

function resolveSubmarineAirshipCategory(
  contentName: string | null | undefined,
  name: string,
  routeDetail?: string | null,
): boolean {
  const haystack = `${contentName ?? ''} ${name} ${routeDetail ?? ''}`
  return matchesAny(haystack, SUBMARINE_AIRSHIP_PATTERNS)
}

function resolveRetainerVentureCategory(
  contentName: string | null | undefined,
  name: string,
  routeDetail?: string | null,
): boolean {
  const haystack = `${contentName ?? ''} ${name} ${routeDetail ?? ''}`
  return matchesAny(haystack, RETAINER_VENTURE_PATTERNS)
}

function mapDerivedCollectibleCategory(
  contentName: string | null | undefined,
  name: string,
  routeDetail?: string | null,
): ForwardAcquisitionCategory {
  if (resolveSubmarineAirshipCategory(contentName, name, routeDetail)) {
    return '潜水艦・飛空艇探索'
  }

  if (resolveRetainerVentureCategory(contentName, name, routeDetail)) {
    return 'リテイナーベンチャー'
  }

  if (resolveSpecialFieldCategory(contentName, name)) {
    return '特殊フィールド'
  }

  if (resolveAchievementShopCategory(contentName, name)) {
    return '実績・ショップ'
  }

  return 'その他'
}

function refineBattleAcquisitionCategory(input: {
  category2: string
  contentName?: string | null
  name?: string
  routeDetail?: string | null
}): ForwardAcquisitionCategory | null {
  return refineCollectibleBattleAcquisitionCategory(input)
}

function buildCollectibleExchangeHaystack(input: {
  contentName?: string | null
  name?: string
  routeDetail?: string | null
}): string {
  return `${input.contentName ?? ''} ${input.name ?? ''} ${input.routeDetail ?? ''}`
}

export function mapCollectibleExchangeCategory(input: {
  contentName?: string | null
  name?: string
  routeDetail?: string | null
}): ForwardAcquisitionCategory {
  const haystack = buildCollectibleExchangeHaystack(input)

  if (/Bicolor Gemstones?/i.test(haystack)) {
    return 'バイカラージェム'
  }

  if (/\bMGP\b|Gold Saucer|ゴールドソーサー/i.test(haystack)) {
    return 'ゴールドソーサー'
  }

  if (/\bGil\b|ギル|\bPurchase\b/i.test(haystack)) {
    return 'ギル購入'
  }

  return 'その他交換'
}

export function mapLegacyAcquisitionCategory(category2: string | null | undefined): ForwardAcquisitionCategory {
  if (!category2) {
    return 'その他'
  }

  if (category2 === 'トレジャーハント') {
    return '地図'
  }

  const legacyWhitelist: ForwardAcquisitionCategory[] = [
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

  if ((legacyWhitelist as string[]).includes(category2)) {
    return category2 as ForwardAcquisitionCategory
  }

  return 'その他'
}

export function mapCollectibleAcquisitionCategory(input: {
  category2: string | null | undefined
  contentName?: string | null
  name?: string
  routeDetail?: string | null
}): ForwardAcquisitionCategory {
  const category2 = input.category2 ?? null
  const contentName = input.contentName ?? null
  const name = input.name ?? ''

  if (!category2) {
    return mapDerivedCollectibleCategory(contentName, name, input.routeDetail)
  }

  if (category2 === 'トレジャーハント') {
    return '地図'
  }

  if (category2 === 'クラフト' || category2 === '採集' || category2 === '釣り') {
    return 'クラフト・採集'
  }

  if (category2 === '交換') {
    return mapCollectibleExchangeCategory(input)
  }

  if (PASSTHROUGH_CATEGORY2.has(category2)) {
    const refinedCategory = refineBattleAcquisitionCategory({
      category2,
      contentName,
      name,
      routeDetail: input.routeDetail,
    })

    if (refinedCategory) {
      return refinedCategory
    }

    return category2 as ForwardAcquisitionCategory
  }

  if (EQUIPMENT_ONLY_CATEGORY2.has(category2)) {
    return mapDerivedCollectibleCategory(contentName, name, input.routeDetail)
  }

  return mapDerivedCollectibleCategory(contentName, name, input.routeDetail)
}

export function resolveForwardAcquisitionCategory(input: {
  category1: string
  category2: string | null | undefined
  contentName?: string | null
  name?: string
  routeDetail?: string | null
}): ForwardAcquisitionCategory {
  if (isCollectibleForwardSearchCategory1(input.category1)) {
    return mapCollectibleAcquisitionCategory(input)
  }

  return mapLegacyAcquisitionCategory(input.category2)
}

export function sortCollectibleForwardAcquisitionCategories(
  categories: Iterable<ForwardAcquisitionCategory>,
): ForwardAcquisitionCategory[] {
  return [...new Set(categories)].sort(
    (left, right) => (
      (collectibleForwardAcquisitionCategoryOrder.get(left) ?? 99)
      - (collectibleForwardAcquisitionCategoryOrder.get(right) ?? 99)
    ),
  )
}
