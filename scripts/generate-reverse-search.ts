import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Confidence = 'high' | 'medium' | 'low'

type SourceEntry = {
  type: string
  key: string
  value?: unknown
}

type BaseItem = {
  id: number | null
  sourceType: string
  xivapiSchema: string
  xivapiVersion: string
  generatedAt: string
  name: string
  iconPath: string | null
  iconPathHr1: string | null
  iconUrl: string | null
  rawCategory: string | null
  searchCategory: string | null
  additionalSheet: string | null
  itemAction: number | null
  levelEquip: number | null
  itemLevel: number | null
  classJobCategory: string
}

type SearchItem = BaseItem & {
  category1: string
  category2: string | null
  category2Candidates?: string[]
  category?: string
  subCategory?: string
  contentName: string | null
  sourceDictionaryId?: string
  searchNames?: string[]
  confidence: Confidence
  needsReview: boolean
  sources: SourceEntry[]
}

type ItemNameDictionaryEntry = {
  sourceDictionaryId: string
  en: string
  ja: string
  searchNames: string[]
}

type UnclassifiedItem = SearchItem & {
  reason: string
  suggestedAction: string
}

type Category1Rule = {
  category1: string
  conditions: RuleCondition[]
  confidence?: Confidence
  needsReview?: boolean
}

type RuleCondition = {
  field: keyof BaseItem
  equals?: string
  startsWith?: string
  includesAny?: string[]
}

type SeriesEntry = {
  seriesKey: string
  category2: string | null
  contentName: string | null
  candidates?: string[]
  confidence?: Confidence
  needsReview?: boolean
}

type OverrideEntry = Partial<SearchItem> & {
  id?: number | null
  name?: string
}

type OverrideFile = {
  overrides?: OverrideEntry[]
}

type SourceDictionaryRoute = {
  routeId: string
  type: string
  contentName: string
  detail?: string
  specialConditions?: Record<string, unknown>
  conditionSteps?: Array<Record<string, unknown>>
  sources: Array<{
    source: string
    method: string
    decision: string
  }>
  needsReview: boolean
}

type SourceDictionaryEntry = {
  id: string
  itemId: number | null
  name: string
  category1: string
  category2: string | null
  category: string
  subCategory: string
  contentName: string | null
  updatedAt: string
  acquisitionRoutes: SourceDictionaryRoute[]
  status: string
}

type AliasEntry = {
  alias: string
  officialName: string
  status: string
}

type PrototypeItem = Record<string, unknown>

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REVERSE_SEARCH_DIR = resolve(ROOT_DIR, 'src/data/reverse-search')
const MANUAL_DIR = resolve(REVERSE_SEARCH_DIR, 'manual')
const SCHEMA_DIR = resolve(REVERSE_SEARCH_DIR, 'schema')
const PROTOTYPE_DIR = resolve(REVERSE_SEARCH_DIR, 'prototype')
const GENERATED_DIR = resolve(REVERSE_SEARCH_DIR, 'generated')
const STABLE_GENERATED_AT = '2026-06-12T15:57:00+09:00'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

async function writeGeneratedJson(path: string, value: unknown) {
  const fileName = basename(path)
  const pathFromGenerated = relative(GENERATED_DIR, path)

  if (isAbsolute(pathFromGenerated) || pathFromGenerated.startsWith('..') || !fileName.endsWith('.generated.json')) {
    throw new Error(`Refusing to write outside generated/*.generated.json: ${path}`)
  }

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function stripMetadata<T extends Record<string, unknown>>(items: T[]): T[] {
  return items.filter((item) => item.type !== 'metadata')
}

function getString(item: PrototypeItem, key: string): string | null {
  const value = item[key]
  return typeof value === 'string' ? value : null
}

function getNumber(item: PrototypeItem, key: string): number | null {
  const value = item[key]
  return typeof value === 'number' ? value : null
}

function getHr1IconPath(icon: string | null): string | null {
  return icon
}

function getBaseIconPath(iconPathHr1: string | null): string | null {
  return iconPathHr1?.replace('_hr1.tex', '.tex') ?? null
}

function getIconUrl(iconPathHr1: string | null): string | null {
  return iconPathHr1 ? `https://v2.xivapi.com/api/asset?path=${iconPathHr1}&format=png` : null
}

function buildIconLookupByItemId(items: SearchItem[]) {
  const lookup = new Map<number, { iconPath: string | null; iconPathHr1: string | null; iconUrl: string | null }>()

  for (const item of items) {
    if (item.id != null && item.iconUrl) {
      lookup.set(item.id, {
        iconPath: item.iconPath,
        iconPathHr1: item.iconPathHr1,
        iconUrl: item.iconUrl,
      })
    }
  }

  return lookup
}

function applyIconLookup(items: SearchItem[], lookup: Map<number, { iconPath: string | null; iconPathHr1: string | null; iconUrl: string | null }>) {
  return items.map((item) => {
    if (item.iconUrl || item.id == null) {
      return item
    }

    const icon = lookup.get(item.id)

    if (!icon?.iconUrl) {
      return item
    }

    return {
      ...item,
      iconPath: icon.iconPath,
      iconPathHr1: icon.iconPathHr1,
      iconUrl: icon.iconUrl,
    }
  })
}

function normalizeBaseItems(prototype: { schema: string; version: string; generatedAt?: string; items: PrototypeItem[] }): BaseItem[] {
  const generatedAt = prototype.generatedAt ?? STABLE_GENERATED_AT

  return prototype.items.map((item) => {
    const iconPathHr1 = getHr1IconPath(getString(item, 'icon'))

    return {
      id: getNumber(item, 'id'),
      sourceType: 'xivapi',
      xivapiSchema: prototype.schema,
      xivapiVersion: prototype.version,
      generatedAt,
      name: getString(item, 'name') ?? getString(item, 'sample') ?? '',
      iconPath: getBaseIconPath(iconPathHr1),
      iconPathHr1,
      iconUrl: getIconUrl(iconPathHr1),
      rawCategory: getString(item, 'ItemUICategory.Name'),
      searchCategory: getString(item, 'ItemSearchCategory.Name'),
      additionalSheet: getString(item, 'AdditionalData.sheet'),
      itemAction: getNumber(item, 'ItemAction'),
      levelEquip: getNumber(item, 'LevelEquip'),
      itemLevel: getNumber(item, 'LevelItem'),
      classJobCategory: getString(item, 'ClassJobCategory.Name') ?? '',
    }
  })
}

function conditionMatches(item: BaseItem, condition: RuleCondition): boolean {
  const value = item[condition.field]
  const text = value == null ? '' : String(value)

  if (condition.equals !== undefined) {
    return text === condition.equals
  }

  if (condition.startsWith !== undefined) {
    return text.startsWith(condition.startsWith)
  }

  if (condition.includesAny !== undefined) {
    return condition.includesAny.some((keyword) => text.includes(keyword))
  }

  return false
}

function describeCondition(condition: RuleCondition): string {
  if (condition.equals !== undefined) {
    return `${condition.field}=${condition.equals}`
  }

  if (condition.startsWith !== undefined) {
    return `${condition.field} startsWith ${condition.startsWith}`
  }

  if (condition.includesAny !== undefined) {
    return `${condition.field} includes ${condition.includesAny.join('/')}`
  }

  return String(condition.field)
}

function detectCategory1(item: BaseItem, rules: Category1Rule[], fallback: string) {
  if (item.id === null && item.rawCategory === null) {
    return {
      category1: fallback,
      confidence: 'low' as Confidence,
      needsReview: true,
      source: { type: 'xivapi', key: 'search', value: 'no_exact_result' },
    }
  }

  for (const rule of rules) {
    const matchedCondition = rule.conditions.find((condition) => conditionMatches(item, condition))

    if (matchedCondition) {
      return {
        category1: rule.category1,
        confidence: rule.confidence ?? ('medium' as Confidence),
        needsReview: rule.needsReview ?? false,
        source: { type: 'category1_rules', key: describeCondition(matchedCondition) },
      }
    }
  }

  return {
    category1: fallback,
    confidence: 'low' as Confidence,
    needsReview: true,
    source: { type: 'fallback', key: 'category1', value: fallback },
  }
}

function findSeries(item: BaseItem, seriesDictionary: SeriesEntry[]): SeriesEntry | null {
  return seriesDictionary.find((entry) => item.name.includes(entry.seriesKey)) ?? null
}

function findOverride(item: BaseItem, overrides: OverrideEntry[]): OverrideEntry | null {
  return overrides.find((override) => {
    if (typeof override.id === 'number' && item.id === override.id) {
      return true
    }

    return typeof override.name === 'string' && item.name === override.name
  }) ?? null
}

function findSourceEntry(item: BaseItem, sourceDictionary: SourceDictionaryEntry[]): SourceDictionaryEntry | null {
  return sourceDictionary.find((entry) => {
    if (typeof entry.itemId === 'number' && item.id === entry.itemId) {
      return true
    }

    return item.name === entry.name
  }) ?? null
}

function isReviewExcludedSourceStatus(status: string) {
  return status === 'confirmed' || status === 'watch_pending_release'
}

function findAlias(item: BaseItem, aliasDictionary: AliasEntry[]): AliasEntry | null {
  return aliasDictionary.find((entry) => entry.status === 'confirmed' && item.name === entry.alias) ?? null
}

function findSourceEntryWithAlias(
  item: BaseItem,
  sourceDictionary: SourceDictionaryEntry[],
  aliasDictionary: AliasEntry[],
) {
  const sourceEntry = findSourceEntry(item, sourceDictionary)

  if (sourceEntry) {
    return { sourceEntry, aliasEntry: null }
  }

  const aliasEntry = findAlias(item, aliasDictionary)

  if (!aliasEntry) {
    return { sourceEntry: null, aliasEntry: null }
  }

  return {
    sourceEntry: sourceDictionary.find((entry) => entry.name === aliasEntry.officialName) ?? null,
    aliasEntry,
  }
}

function applyOverride(record: SearchItem, override: OverrideEntry, sourceType: 'manual_override' | 'item_override_dictionary') {
  const next = { ...record }

  if (override.category1 !== undefined) next.category1 = override.category1
  if (override.category2 !== undefined) next.category2 = override.category2
  if (override.contentName !== undefined) next.contentName = override.contentName
  if (override.confidence !== undefined) next.confidence = override.confidence
  if (override.needsReview !== undefined) next.needsReview = override.needsReview

  next.sources = [
    ...next.sources,
    ...(override.sources ?? [{ type: sourceType, key: override.name ?? String(override.id ?? 'unknown') }]),
  ]

  return next
}

function buildSearchItems(
  baseItems: BaseItem[],
  category1Rules: { rules: Category1Rule[]; fallback: string },
  seriesDictionary: SeriesEntry[],
  sourceDictionary: SourceDictionaryEntry[],
  aliasDictionary: AliasEntry[],
  itemOverrides: OverrideEntry[],
  manualOverrides: OverrideEntry[],
): SearchItem[] {
  return baseItems.map((item) => {
    const sources: SourceEntry[] = item.rawCategory
      ? [{ type: 'xivapi', key: 'ItemUICategory.Name', value: item.rawCategory }]
      : []
    const category1Result = detectCategory1(item, category1Rules.rules, category1Rules.fallback)

    if (!sources.some((source) => source.type === category1Result.source.type && source.key === category1Result.source.key)) {
      sources.push(category1Result.source)
    }

    const series = findSeries(item, seriesDictionary)
    const contentSources: SourceEntry[] = []
    let category2 = series?.category2 ?? null
    let contentName = series?.contentName ?? null
    let confidence: Confidence = category2 && contentName ? (series?.confidence ?? 'medium') : 'low'
    let needsReview = category1Result.needsReview || series?.needsReview === true
    let category2Candidates = series?.candidates

    if (series) {
      contentSources.push({ type: 'series_dictionary', key: series.seriesKey })
    }

    if (category1Result.confidence === 'low' && (!category2 || !contentName)) {
      confidence = 'low'
    }

    if (
      confidence === 'low' ||
      category2 === null ||
      contentName === null ||
      item.rawCategory === 'その他' ||
      item.rawCategory === '雑貨' ||
      Boolean(category2Candidates?.length)
    ) {
      needsReview = true
    }

    let record: SearchItem = {
      ...item,
      category1: category1Result.category1,
      category2,
      ...(category2Candidates ? { category2Candidates } : {}),
      contentName,
      confidence,
      needsReview,
      sources: [...sources, ...contentSources],
    }

    const manualOverride = findOverride(item, manualOverrides)
    const itemOverride = findOverride(item, itemOverrides)
    const { sourceEntry, aliasEntry } = findSourceEntryWithAlias(item, sourceDictionary, aliasDictionary)

    if (manualOverride) {
      record = applyOverride(record, manualOverride, 'manual_override')
    } else if (itemOverride) {
      record = applyOverride(record, itemOverride, 'item_override_dictionary')
    }

    if (sourceEntry) {
      const aliasSources: SourceEntry[] = aliasEntry
        ? [{ type: 'alias_dictionary', key: aliasEntry.alias, value: aliasEntry.officialName }]
        : []

      record = {
        ...record,
        category1: sourceEntry.category1,
        category2: sourceEntry.category2,
        category2Candidates: undefined,
        category: sourceEntry.category,
        subCategory: sourceEntry.subCategory,
        contentName: sourceEntry.contentName,
        sourceDictionaryId: sourceEntry.id,
        confidence: sourceEntry.status === 'confirmed' ? 'high' : record.confidence,
        needsReview:
          !isReviewExcludedSourceStatus(sourceEntry.status) ||
          sourceEntry.acquisitionRoutes.some((route) => route.needsReview),
        sources: [...record.sources, ...aliasSources, { type: 'source_dictionary', key: sourceEntry.id }],
      }
    }

    category2 = record.category2
    contentName = record.contentName
    category2Candidates = record.category2Candidates

    const hasResolvedSourceEntry = sourceEntry ? isReviewExcludedSourceStatus(sourceEntry.status) : false

    record.needsReview =
      record.needsReview ||
      (!hasResolvedSourceEntry && record.confidence === 'low') ||
      category2 === null ||
      contentName === null ||
      (!hasResolvedSourceEntry && item.rawCategory === 'その他') ||
      (!hasResolvedSourceEntry && item.rawCategory === '雑貨') ||
      Boolean(category2Candidates?.length)

    return record
  })
}

function buildSourceDictionarySearchItems(
  sourceDictionary: SourceDictionaryEntry[],
  generatedAt: string,
  xivapiSchema: string,
  xivapiVersion: string,
  iconLookup: Map<number, { iconPath: string | null; iconPathHr1: string | null; iconUrl: string | null }>,
): SearchItem[] {
  return sourceDictionary.map((entry) => {
    const icon = entry.itemId ? iconLookup.get(entry.itemId) : undefined

    return {
      id: entry.itemId,
      sourceType: 'manual',
      xivapiSchema,
      xivapiVersion,
      generatedAt,
      name: entry.name,
      iconPath: icon?.iconPath ?? null,
      iconPathHr1: icon?.iconPathHr1 ?? null,
      iconUrl: icon?.iconUrl ?? null,
    rawCategory: null,
    searchCategory: null,
    additionalSheet: null,
    itemAction: null,
    levelEquip: null,
    itemLevel: null,
    classJobCategory: '',
    category1: entry.category1,
    category2: entry.category2,
    category: entry.category,
    subCategory: entry.subCategory,
    contentName: entry.contentName,
    sourceDictionaryId: entry.id,
    confidence: entry.status === 'confirmed' ? 'high' : 'low',
    needsReview:
      !isReviewExcludedSourceStatus(entry.status) ||
      entry.acquisitionRoutes.some((route) => route.needsReview),
    sources: [{ type: 'source_dictionary', key: entry.id }],
    }
  })
}

function loadItemNameDictionaryBySourceId(entries: Array<ItemNameDictionaryEntry & { type?: string }>) {
  const dictionary = new Map<string, ItemNameDictionaryEntry>()

  for (const entry of entries) {
    if (entry.type === 'metadata' || !entry.sourceDictionaryId) {
      continue
    }

    dictionary.set(entry.sourceDictionaryId, entry)
  }

  return dictionary
}

function applyItemNameDictionary(searchItems: SearchItem[], dictionaryBySourceId: Map<string, ItemNameDictionaryEntry>) {
  if (dictionaryBySourceId.size === 0) {
    return searchItems
  }

  return searchItems.map((item) => {
    if (!item.sourceDictionaryId) {
      return item
    }

    const dictionaryEntry = dictionaryBySourceId.get(item.sourceDictionaryId)

    if (!dictionaryEntry) {
      return item
    }

    return {
      ...item,
      name: dictionaryEntry.ja,
      searchNames: dictionaryEntry.searchNames,
    }
  })
}

function mergeSearchItems(baseSearchItems: SearchItem[], sourceSearchItems: SearchItem[]): SearchItem[] {
  const merged = baseSearchItems.filter((item) => typeof item.sourceDictionaryId === 'string')
  const usedSourceDictionaryIds = new Set(merged.map((item) => item.sourceDictionaryId as string))

  for (const item of sourceSearchItems) {
    if (item.sourceDictionaryId && usedSourceDictionaryIds.has(item.sourceDictionaryId)) {
      continue
    }

    merged.push(item)

    if (item.sourceDictionaryId) {
      usedSourceDictionaryIds.add(item.sourceDictionaryId)
    }
  }

  return merged
}

function getUnclassifiedReason(item: SearchItem): string {
  if (item.id === null) {
    return 'exact_result_missing'
  }

  if (item.category2Candidates?.length) {
    return 'multiple_content_candidates'
  }

  if (item.rawCategory === 'その他' || item.rawCategory === '雑貨') {
    return 'pattern_based_category1_only'
  }

  if (item.category2 === null || item.contentName === null) {
    return 'source_unresolved'
  }

  return 'source_unresolved'
}

function getSuggestedAction(item: SearchItem): string {
  if (item.id === null) {
    return '正式名またはalias確認対象。manual_overrideにはまだ入れない。'
  }

  if (item.category2Candidates?.length) {
    return 'item_override_dictionaryで管理し、04確認後にcategory2/contentNameを確定する。'
  }

  if (item.rawCategory === 'その他' || item.rawCategory === '雑貨') {
    return '名前パターンで分類①のみ確定。初期段階ではcategory2/contentName未確定のまま保持する。'
  }

  return '分類①は確定。入手元辞書が育つまでcategory2/contentName未確定のまま保持する。'
}

function buildUnclassifiedItems(items: SearchItem[]): UnclassifiedItem[] {
  return items
    .filter((item) => item.needsReview)
    .map((item) => ({
      ...item,
      needsReview: true,
      reason: getUnclassifiedReason(item),
      suggestedAction: getSuggestedAction(item),
    }))
}

function withMetadata(metadata: Record<string, unknown>, items: unknown[]) {
  return [metadata, ...items]
}

function assertEnumValue(value: string | null, enumValues: string[], label: string) {
  if (value !== null && !enumValues.includes(value)) {
    throw new Error(`${label} is outside enum: ${value}`)
  }
}

function validateBaseItems(items: BaseItem[], enums: Record<string, string[]>) {
  for (const item of items) {
    assertEnumValue(item.sourceType, enums.sourceType, 'sourceType')

    for (const key of ['sourceType', 'xivapiSchema', 'xivapiVersion', 'generatedAt', 'name'] as const) {
      if (typeof item[key] !== 'string') {
        throw new Error(`base item ${item.name || item.id} is missing ${key}`)
      }
    }
  }
}

function validateSearchItems(items: SearchItem[], enums: Record<string, string[]>) {
  for (const item of items) {
    assertEnumValue(item.sourceType, enums.sourceType, 'sourceType')
    assertEnumValue(item.category1, enums.category1, 'category1')
    assertEnumValue(item.category2, enums.category2, 'category2')
    assertEnumValue(item.confidence, enums.confidence, 'confidence')

    if (item.category !== undefined) {
      assertEnumValue(item.category, enums.displayCategory, 'display category')
    }

    if (item.subCategory !== undefined) {
      assertEnumValue(item.subCategory, enums.displaySubCategory, 'display subCategory')
    }

    if (!Array.isArray(item.sources) || item.sources.length === 0) {
      throw new Error(`search item ${item.name} must have sources`)
    }

    for (const source of item.sources) {
      assertEnumValue(source.type, enums.sourceEntryType, 'source entry type')
    }
  }
}

function validateSourceDictionary(items: SourceDictionaryEntry[], enums: Record<string, string[]>) {
  for (const item of items) {
    assertEnumValue(item.category1, enums.category1, 'source category1')
    assertEnumValue(item.category2, enums.category2, 'source category2')
    assertEnumValue(item.category, enums.displayCategory, 'source display category')
    assertEnumValue(item.subCategory, enums.displaySubCategory, 'source display subCategory')
    assertEnumValue(item.status, enums.status, 'source status')

    if (typeof item.id !== 'string' || typeof item.updatedAt !== 'string') {
      throw new Error(`source dictionary item ${item.name} is missing id or updatedAt`)
    }

    if (!Array.isArray(item.acquisitionRoutes) || item.acquisitionRoutes.length === 0) {
      throw new Error(`source dictionary item ${item.name} must have acquisitionRoutes`)
    }

    for (const route of item.acquisitionRoutes) {
      assertEnumValue(route.type, enums.routeType, 'route type')

      if (typeof route.routeId !== 'string' || typeof route.contentName !== 'string') {
        throw new Error(`source dictionary route for ${item.name} is missing routeId or contentName`)
      }

      if (!Array.isArray(route.sources) || route.sources.length === 0) {
        throw new Error(`source dictionary route ${route.routeId} must have sources`)
      }
    }
  }
}

function validateAliasDictionary(items: AliasEntry[], sourceDictionary: SourceDictionaryEntry[]) {
  for (const item of items) {
    if (item.status !== 'confirmed') {
      continue
    }

    if (!sourceDictionary.some((sourceEntry) => sourceEntry.name === item.officialName)) {
      throw new Error(`alias ${item.alias} points to missing source_dictionary officialName: ${item.officialName}`)
    }
  }
}

function validateUnclassifiedItems(items: UnclassifiedItem[], enums: Record<string, string[]>) {
  validateSearchItems(items, enums)

  for (const item of items) {
    if (item.needsReview !== true) {
      throw new Error(`unclassified item ${item.name} must have needsReview: true`)
    }
  }
}

async function validateJsonSyntax(paths: string[]) {
  for (const path of paths) {
    JSON.parse(await readFile(path, 'utf8'))
  }
}

async function main() {
  const prototype = await readJson<{ schema: string; version: string; generatedAt?: string; items: PrototypeItem[] }>(
    resolve(PROTOTYPE_DIR, 'xivapi_extraction_sample.json'),
  )
  const enums = await readJson<Record<string, string[]>>(resolve(SCHEMA_DIR, 'reverse_search_enums.json'))
  const category1Rules = await readJson<{ rules: Category1Rule[]; fallback: string }>(
    resolve(MANUAL_DIR, 'category1_rules.json'),
  )
  const seriesDictionary = stripMetadata(await readJson<SeriesEntry[]>(resolve(MANUAL_DIR, 'series_dictionary.json')))
  const sourceDictionary = stripMetadata(
    await readJson<SourceDictionaryEntry[]>(resolve(MANUAL_DIR, 'source_dictionary.json')),
  )
  const aliasDictionary = stripMetadata(await readJson<AliasEntry[]>(resolve(MANUAL_DIR, 'alias_dictionary.json')))
  await readJson(resolve(MANUAL_DIR, 'content_dictionary.json'))
  const itemOverrideFile = await readJson<OverrideFile>(resolve(MANUAL_DIR, 'item_override_dictionary.json'))
  const manualOverrideFile = await readJson<OverrideFile>(resolve(MANUAL_DIR, 'manual_override.json'))
  const itemNameDictionary = stripMetadata(
    await readJson<Array<ItemNameDictionaryEntry & { type?: string }>>(resolve(MANUAL_DIR, 'item_name_dictionary.json')),
  )
  const itemNameDictionaryBySourceId = loadItemNameDictionaryBySourceId(itemNameDictionary)

  const baseItems = normalizeBaseItems(prototype)
  validateSourceDictionary(sourceDictionary, enums)
  validateAliasDictionary(aliasDictionary, sourceDictionary)
  const prototypeSearchItems = buildSearchItems(
    baseItems,
    category1Rules,
    seriesDictionary,
    sourceDictionary,
    aliasDictionary,
    itemOverrideFile.overrides ?? [],
    manualOverrideFile.overrides ?? [],
  )
  const generatedAt = prototype.generatedAt ?? STABLE_GENERATED_AT
  const iconLookup = buildIconLookupByItemId(prototypeSearchItems)
  const sourceSearchItems = buildSourceDictionarySearchItems(
    sourceDictionary,
    generatedAt,
    prototype.schema,
    prototype.version,
    iconLookup,
  )
  const mergedSearchItems = applyIconLookup(
    mergeSearchItems(prototypeSearchItems, sourceSearchItems),
    iconLookup,
  )
  const searchItems = applyItemNameDictionary(mergedSearchItems, itemNameDictionaryBySourceId)
  const unclassifiedItems = buildUnclassifiedItems(searchItems)
  const commonMetadata = {
    version: 1,
    type: 'metadata',
    generatedAt,
    xivapiSchema: prototype.schema,
    xivapiVersion: prototype.version,
  }

  validateBaseItems(baseItems, enums)
  validateSearchItems(searchItems, enums)
  validateUnclassifiedItems(unclassifiedItems, enums)

  const outputPaths = [
    resolve(GENERATED_DIR, 'base_items.generated.json'),
    resolve(GENERATED_DIR, 'search_dictionary.generated.json'),
    resolve(GENERATED_DIR, 'unclassified_items.generated.json'),
  ]

  await writeGeneratedJson(outputPaths[0], withMetadata(commonMetadata, baseItems))
  await writeGeneratedJson(
    outputPaths[1],
    withMetadata(
      {
        ...commonMetadata,
        confidencePolicy:
          'high=all confirmed, medium=category1 confirmed and category2/contentName inferred by dictionary, low=category1 only or name-pattern dependent',
      },
      searchItems,
    ),
  )
  await writeGeneratedJson(
    outputPaths[2],
    withMetadata(
      {
        ...commonMetadata,
        policy:
          'Items enter this list when category2/contentName is unknown, confidence is low, rawCategory is その他/雑貨, or multiple candidates exist.',
      },
      unclassifiedItems,
    ),
  )
  await validateJsonSyntax(outputPaths)

  console.log(`Generated ${baseItems.length} base items`)
  console.log(`Generated ${searchItems.length} search items`)
  console.log(`Generated ${unclassifiedItems.length} unclassified items`)
}

await main()
