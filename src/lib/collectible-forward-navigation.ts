import { contentCategories } from '../data/contentCategories'
import contentTranslationJson from '../data/reverse-search/manual/content_translation_dictionary.json'
import type { ForwardAcquisitionCategory, ForwardContentOption } from '../types/card'

type ContentTranslationEntry = {
  en?: string
  ja?: string
}

export const COLLECTIBLE_ID_EXPANSION_ORDER = [
  '新生エオルゼア',
  '蒼天のイシュガルド',
  '紅蓮のリベレーター',
  '漆黒のヴィランズ',
  '暁月のフィナーレ',
  '黄金のレガシー',
  'その他',
] as const

export type CollectibleIdExpansionLabel = typeof COLLECTIBLE_ID_EXPANSION_ORDER[number]

export const COLLECTIBLE_BILLING_CONTENT_KEY = 'オンラインストア'
export const COLLECTIBLE_COSMIC_EXPLORATION_CONTENT_KEY = 'コスモエクスプローラー'

/** Official JP zone labels from Lodestone / JP client (Cosmic Fortune per-planet instances). */
const COLLECTIBLE_COSMIC_FORTUNE_REGION_JA_LABELS: Record<string, string> = {
  'Sinus Ardonum': '焦がれの入江',
  Phaenna: '惑星パエンナ',
  Oizys: '惑星オイジュス',
  Auxesia: '惑星アウクセシア',
}

const DUNGEON_SECTION_TO_EXPANSION: Record<string, CollectibleIdExpansionLabel> = {
  'dungeon-arr-main': '新生エオルゼア',
  'dungeon-arr-extra': '新生エオルゼア',
  'dungeon-heavensward-main': '蒼天のイシュガルド',
  'dungeon-heavensward-extra': '蒼天のイシュガルド',
  'dungeon-stormblood-main': '紅蓮のリベレーター',
  'dungeon-stormblood-extra': '紅蓮のリベレーター',
  'dungeon-shadowbringers-main': '漆黒のヴィランズ',
  'dungeon-shadowbringers-extra': '漆黒のヴィランズ',
  'dungeon-endwalker-main': '暁月のフィナーレ',
  'dungeon-endwalker-extra': '暁月のフィナーレ',
  'dungeon-dawntrail-main': '黄金のレガシー',
  'dungeon-dawntrail-extra': '黄金のレガシー',
}

const COLLECTIBLE_BATTLE_EXCHANGE_PATTERN = /Smithy\s*-|Peculiar Goblin|Eschina\s*-|Bertana\s*-|Uah'shepya/i

const COLLECTIBLE_ALLIANCE_CONTENT_PATTERN = /Orbonne|Rabanastre|Copied Factory|Puppets' Bunker|Ridorana Lighthouse|Void Ark|Weeping City|World of Darkness|Syrcus Tower|Dun Scaith|Aglaia|Euphrosyne|Thaleia|Paradigm's Breach|First Walk|Second Walk|Third Walk|\(Chaotic\)/i

const COLLECTIBLE_COSMIC_CONTENT_PATTERN = /Cosmic Exploration|Cosmic Fortune|Cosmocredit|コスモクレジット/i
const COLLECTIBLE_COSMIC_FORTUNE_REGION_PATTERN = /Cosmic Fortune\s*-\s*(.+)$/i

const COLLECTIBLE_CONTENT_DISPLAY_OVERRIDES: Array<{ pattern: RegExp; displayName: string }> = [
  { pattern: /^Eureka$/i, displayName: 'エウレカ' },
  { pattern: /Southern Front|Bozjan Southern Front|南方ボズヤ戦線/i, displayName: '南方ボズヤ戦線' },
  { pattern: /Palace of the Dead|Heaven-on-High|死者の宮殿|アメノミハシラ/i, displayName: 'ディープダンジョン' },
  { pattern: /Island Sanctuary|無人島/i, displayName: '無人島開拓' },
  { pattern: /Occult Crescent|蜃気楼|Zadnor/i, displayName: '蜃気楼の島' },
  { pattern: /Orthos|オルト・エウレカ/i, displayName: 'オルト・エウレカ' },
  { pattern: /Eureka/i, displayName: 'エウレカ' },
]

const COLLECTIBLE_BILLING_DISPLAY_PATTERN = /Online Store|Premium|Collector's Edition|Pre-order|Ceremony of Eternal Bonding|Item code included|Fan Festival|Digital Fan Festival|Available for purchase on the online store|KFC Promotion|Lightning Strikes/i

type IdDungeonLabelEntry = {
  label: string
  expansion: CollectibleIdExpansionLabel
  order: number
  normalized: string
}

const contentTranslationEntries = (contentTranslationJson as ContentTranslationEntry[])
  .filter((entry) => entry.en && entry.ja)

const contentNameJaByEn = new Map(
  contentTranslationEntries.map((entry) => [entry.en!.trim(), entry.ja!.trim()]),
)

const idExpansionOrder = new Map(
  COLLECTIBLE_ID_EXPANSION_ORDER.map((label, index) => [label, index]),
)

const idLabelOrder = new Map<string, number>()
const idLabelToExpansion = new Map<string, CollectibleIdExpansionLabel>()
const idDungeonLabelEntries: IdDungeonLabelEntry[] = []
const battleContentNameToCategory = new Map<string, ForwardAcquisitionCategory>()

function normalizeIdLabelKey(label: string): string {
  return label
    .trim()
    .normalize('NFKC')
    .replace(/\s*\(Hard\)\s*/gi, '(hard)')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function registerBattleContentName(label: string, category: ForwardAcquisitionCategory) {
  battleContentNameToCategory.set(label, category)
}

function registerIdLabel(label: string, expansion: CollectibleIdExpansionLabel, order: number) {
  idLabelToExpansion.set(label, expansion)
  idLabelOrder.set(label, order)
  idDungeonLabelEntries.push({
    label,
    expansion,
    order,
    normalized: normalizeIdLabelKey(label),
  })
}

function collectSectionLabels(matcher: (sectionId: string) => boolean): string[] {
  const battle = contentCategories.find((category) => category.id === 'battle')

  if (!battle) {
    return []
  }

  const labels: string[] = []

  for (const section of battle.children) {
    if (!matcher(section.id)) {
      continue
    }

    for (const child of section.children) {
      labels.push(child.label)
    }
  }

  return labels
}

function registerDungeonSectionLabels() {
  const battle = contentCategories.find((category) => category.id === 'battle')

  if (!battle) {
    return
  }

  for (const section of battle.children) {
    const expansion = DUNGEON_SECTION_TO_EXPANSION[section.id]

    if (!expansion) {
      continue
    }

    for (const [index, child] of section.children.entries()) {
      registerIdLabel(child.label, expansion, index)
    }
  }
}

const COLLECTIBLE_ID_ENGLISH_EXPANSION_ALIASES: Record<string, CollectibleIdExpansionLabel> = {
  'The Aitiascope': '暁月のフィナーレ',
}

function extractComparableIdTokens(label: string): string[] {
  const normalized = normalizeIdLabelKey(label).replace(/\(hard\)/g, '').trim()
  const tokens = normalized.split(' ').filter((token) => token.length >= 4)

  return [...new Set([normalized, ...tokens])]
}

function resolveIdExpansionByFuzzyMatch(names: string[]): { expansion: CollectibleIdExpansionLabel; order: number } | undefined {
  let bestEntry: IdDungeonLabelEntry | undefined

  for (const name of names) {
    const normalized = normalizeIdLabelKey(name)

    if (!normalized) {
      continue
    }

    for (const entry of idDungeonLabelEntries) {
      if (entry.normalized === normalized) {
        if (!bestEntry || entry.normalized.length > bestEntry.normalized.length) {
          bestEntry = entry
        }
      }
    }

    for (const entry of idDungeonLabelEntries) {
      if (normalized.endsWith(entry.normalized) || entry.normalized.endsWith(normalized)) {
        if (!bestEntry || entry.normalized.length > bestEntry.normalized.length) {
          bestEntry = entry
        }
      }
    }

    const comparableTokens = extractComparableIdTokens(name)

    for (const token of comparableTokens) {
      for (const entry of idDungeonLabelEntries) {
        const entryTokens = extractComparableIdTokens(entry.label)

        const hasSharedToken = entryTokens.some((entryToken) => (
          token.length >= 4
          && entryToken.length >= 4
          && (token.includes(entryToken) || entryToken.includes(token))
        ))

        if (!hasSharedToken) {
          continue
        }

        if (!bestEntry || entry.normalized.length > bestEntry.normalized.length) {
          bestEntry = entry
        }
      }
    }
  }

  if (!bestEntry) {
    return undefined
  }

  return {
    expansion: bestEntry.expansion,
    order: bestEntry.order,
  }
}

function cacheIdNavigationLookup(contentName: string, expansion: CollectibleIdExpansionLabel, order: number) {
  idLabelToExpansion.set(contentName, expansion)
  idLabelOrder.set(contentName, order)
}

function buildNavigationMaps() {
  registerDungeonSectionLabels()

  for (const label of collectSectionLabels((sectionId) => sectionId.startsWith('alliance-'))) {
    registerBattleContentName(label, 'アライアンス')
  }

  for (const label of collectSectionLabels((sectionId) => sectionId === 'normal-raid')) {
    registerBattleContentName(label, 'レイド')
  }

  for (const label of collectSectionLabels((sectionId) => sectionId.startsWith('extreme-') || sectionId === 'unreal')) {
    registerBattleContentName(label, '極')
  }

  for (const [english, japanese] of contentNameJaByEn.entries()) {
    const battleCategory = battleContentNameToCategory.get(japanese)

    if (battleCategory) {
      battleContentNameToCategory.set(english, battleCategory)
    }

    const expansion = idLabelToExpansion.get(japanese)
      ?? resolveIdExpansionByFuzzyMatch([japanese])?.expansion

    if (expansion) {
      const order = idLabelOrder.get(japanese)
        ?? resolveIdExpansionByFuzzyMatch([japanese])?.order
        ?? 999

      cacheIdNavigationLookup(english, expansion, order)
      cacheIdNavigationLookup(japanese, expansion, order)
    }
  }
}

buildNavigationMaps()

function resolveContentNameJa(contentName: string): string {
  return contentNameJaByEn.get(contentName) ?? contentName
}

export function isCollectibleCosmicContentName(contentName: string | null | undefined): boolean {
  return COLLECTIBLE_COSMIC_CONTENT_PATTERN.test(contentName?.trim() ?? '')
}

export function resolveCollectibleCosmicRegionLabel(contentName: string): string | null {
  const match = contentName.trim().match(COLLECTIBLE_COSMIC_FORTUNE_REGION_PATTERN)

  return match?.[1]?.trim() ?? null
}

function resolveCollectibleCosmicFortuneJaRegionLabel(contentName: string): string | null {
  const regionToken = resolveCollectibleCosmicRegionLabel(contentName)

  if (!regionToken) {
    return null
  }

  return COLLECTIBLE_COSMIC_FORTUNE_REGION_JA_LABELS[regionToken] ?? null
}

function buildCollectibleCosmicFortuneContentLabel(jaRegion: string): string {
  return `${COLLECTIBLE_COSMIC_EXPLORATION_CONTENT_KEY}：${jaRegion}`
}

export function resolveCollectibleCosmicContentKey(contentName: string): string {
  const trimmed = contentName.trim()
  const jaRegion = resolveCollectibleCosmicFortuneJaRegionLabel(trimmed)

  if (jaRegion) {
    return buildCollectibleCosmicFortuneContentLabel(jaRegion)
  }

  if (isCollectibleCosmicContentName(trimmed)) {
    return COLLECTIBLE_COSMIC_EXPLORATION_CONTENT_KEY
  }

  return trimmed
}

export function resolveCollectibleCosmicDisplayName(contentName: string): string {
  const trimmed = contentName.trim()
  const jaRegion = resolveCollectibleCosmicFortuneJaRegionLabel(trimmed)

  if (jaRegion) {
    return buildCollectibleCosmicFortuneContentLabel(jaRegion)
  }

  if (isCollectibleCosmicContentName(trimmed)) {
    return COLLECTIBLE_COSMIC_EXPLORATION_CONTENT_KEY
  }

  return trimmed
}

export function applyCollectibleDisplayTextOverrides(text: string): string {
  const trimmed = text.trim()

  if (!trimmed) {
    return ''
  }

  const cosmicDisplayName = resolveCollectibleCosmicDisplayName(trimmed)

  if (cosmicDisplayName !== trimmed) {
    return cosmicDisplayName
  }

  for (const override of COLLECTIBLE_CONTENT_DISPLAY_OVERRIDES) {
    if (override.pattern.test(trimmed)) {
      return override.displayName
    }
  }

  return trimmed
}

export function usesCollectibleGroupedForwardContentOptions(acquisitionCategory: string): boolean {
  return acquisitionCategory === 'ID'
}

export function resolveCollectibleIdGroupLabel(contentName: string): CollectibleIdExpansionLabel {
  const trimmed = contentName.trim()
  const japanese = resolveContentNameJa(trimmed)

  const alias = COLLECTIBLE_ID_ENGLISH_EXPANSION_ALIASES[trimmed]

  if (alias) {
    return alias
  }

  const cached = idLabelToExpansion.get(trimmed) ?? idLabelToExpansion.get(japanese)

  if (cached) {
    return cached
  }

  const fuzzy = resolveIdExpansionByFuzzyMatch([trimmed, japanese])

  if (fuzzy) {
    cacheIdNavigationLookup(trimmed, fuzzy.expansion, fuzzy.order)

    if (japanese !== trimmed) {
      cacheIdNavigationLookup(japanese, fuzzy.expansion, fuzzy.order)
    }

    return fuzzy.expansion
  }

  return 'その他'
}

export function normalizeCollectibleForwardContentKey(
  acquisitionCategory: string,
  contentName: string,
): string {
  if (acquisitionCategory === '課金') {
    return COLLECTIBLE_BILLING_CONTENT_KEY
  }

  if (acquisitionCategory === '特殊フィールド' && isCollectibleCosmicContentName(contentName)) {
    return resolveCollectibleCosmicContentKey(contentName)
  }

  return contentName.trim()
}

function resolveCosmicForwardContentKey(contentName: string): string | null {
  const trimmed = contentName.trim()

  if (trimmed.startsWith(COLLECTIBLE_COSMIC_EXPLORATION_CONTENT_KEY)) {
    return trimmed
  }

  if (!isCollectibleCosmicContentName(trimmed)) {
    return null
  }

  return resolveCollectibleCosmicContentKey(trimmed)
}

export function matchesCollectibleForwardContentFilter(
  acquisitionCategory: string,
  selectedContentName: string,
  itemContentName: string | null | undefined,
  itemAcquisitionCategory?: string,
): boolean {
  if (!selectedContentName) {
    return true
  }

  if (acquisitionCategory === '課金' && selectedContentName === COLLECTIBLE_BILLING_CONTENT_KEY) {
    return itemAcquisitionCategory === '課金'
  }

  const selectedCosmicKey = resolveCosmicForwardContentKey(selectedContentName)
  const itemCosmicKey = resolveCosmicForwardContentKey(itemContentName ?? '')

  if (acquisitionCategory === '特殊フィールド' && selectedCosmicKey) {
    return itemAcquisitionCategory === '特殊フィールド'
      && itemCosmicKey === selectedCosmicKey
  }

  return itemContentName?.trim() === selectedContentName
}

export function resolveCollectibleContentDisplayName(input: {
  contentName?: string | null
  acquisitionCategory?: string | null
  baseDisplayName: string
}): string {
  const contentName = input.contentName?.trim() ?? ''
  const baseDisplayName = input.baseDisplayName.trim()

  if (input.acquisitionCategory === '課金') {
    return COLLECTIBLE_BILLING_CONTENT_KEY
  }

  if (
    input.acquisitionCategory === '特殊フィールド'
    && isCollectibleCosmicContentName(contentName)
  ) {
    return resolveCollectibleCosmicDisplayName(contentName)
  }

  if (COLLECTIBLE_BILLING_DISPLAY_PATTERN.test(contentName) || COLLECTIBLE_BILLING_DISPLAY_PATTERN.test(baseDisplayName)) {
    return COLLECTIBLE_BILLING_CONTENT_KEY
  }

  for (const override of COLLECTIBLE_CONTENT_DISPLAY_OVERRIDES) {
    if (override.pattern.test(contentName) || override.pattern.test(baseDisplayName)) {
      return override.displayName
    }
  }

  return baseDisplayName
}

export function refineCollectibleBattleAcquisitionCategory(input: {
  category2: string
  contentName?: string | null
  name?: string
  routeDetail?: string | null
}): ForwardAcquisitionCategory | null {
  const battleCategories = new Set(['レイド', 'アライアンス', '討滅戦', '極'])

  if (!battleCategories.has(input.category2)) {
    return null
  }

  const contentName = input.contentName?.trim() ?? ''

  if (!contentName) {
    return null
  }

  if (COLLECTIBLE_BATTLE_EXCHANGE_PATTERN.test(contentName)) {
    return 'その他交換'
  }

  const japaneseName = resolveContentNameJa(contentName)

  if (/\(Savage\)/i.test(contentName) || /零式/.test(japaneseName)) {
    return 'その他'
  }

  const mappedCategory = battleContentNameToCategory.get(contentName)
    ?? battleContentNameToCategory.get(japaneseName)

  if (mappedCategory) {
    return mappedCategory
  }

  if (COLLECTIBLE_ALLIANCE_CONTENT_PATTERN.test(contentName)) {
    return 'アライアンス'
  }

  if (/\(Chaotic\)/i.test(contentName) || /: The (First|Second|Third) Walk$/i.test(contentName)) {
    return 'アライアンス'
  }

  if (/\(Extreme\)/i.test(contentName) || /^(極|幻)/.test(japaneseName)) {
    return '極'
  }

  if (/討滅戦/.test(japaneseName) && !/\(Extreme\)/i.test(contentName)) {
    return '討滅戦'
  }

  if (/The .* Circle/i.test(contentName) && !/\(Savage\)/i.test(contentName)) {
    return 'レイド'
  }

  return null
}

function compareCollectibleIdOptions(left: ForwardContentOption, right: ForwardContentOption): number {
  const leftGroupOrder = idExpansionOrder.get(resolveCollectibleIdGroupLabel(left.key)) ?? 99
  const rightGroupOrder = idExpansionOrder.get(resolveCollectibleIdGroupLabel(right.key)) ?? 99

  if (leftGroupOrder !== rightGroupOrder) {
    return leftGroupOrder - rightGroupOrder
  }

  const leftLabelOrder = idLabelOrder.get(left.key)
    ?? idLabelOrder.get(resolveContentNameJa(left.key))
    ?? 999
  const rightLabelOrder = idLabelOrder.get(right.key)
    ?? idLabelOrder.get(resolveContentNameJa(right.key))
    ?? 999

  if (leftLabelOrder !== rightLabelOrder) {
    return leftLabelOrder - rightLabelOrder
  }

  return left.displayName.localeCompare(right.displayName, 'ja')
}

export function sortCollectibleForwardContentOptions(
  acquisitionCategory: string,
  options: ForwardContentOption[],
): ForwardContentOption[] {
  if (acquisitionCategory === 'ID') {
    return [...options].sort(compareCollectibleIdOptions)
  }

  return [...options].sort((left, right) => left.displayName.localeCompare(right.displayName, 'ja'))
}

export function buildCollectibleForwardContentOptions(input: {
  acquisitionCategory: string
  entries: Array<{ key: string; displayName: string }>
}): ForwardContentOption[] {
  const deduped = new Map<string, ForwardContentOption>()

  for (const entry of input.entries) {
    const key = normalizeCollectibleForwardContentKey(input.acquisitionCategory, entry.key)
    const displayName = resolveCollectibleContentDisplayName({
      contentName: entry.key,
      acquisitionCategory: input.acquisitionCategory,
      baseDisplayName: entry.displayName,
    })

    deduped.set(key, {
      key,
      displayName,
      groupLabel: input.acquisitionCategory === 'ID'
        ? resolveCollectibleIdGroupLabel(entry.key)
        : undefined,
    })
  }

  return sortCollectibleForwardContentOptions(input.acquisitionCategory, [...deduped.values()])
}
