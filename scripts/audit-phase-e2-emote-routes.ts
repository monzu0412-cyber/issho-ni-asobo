import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const OUTPUT_DIR = resolve(__dirname, 'output')

const MANUAL_REVIEW_COLLECT_IDS = new Set([115, 181, 189, 191, 214, 222, 292, 295, 297, 314, 315, 316])

type CollectSource = {
  type: string
  text: string
  related_type: string | null
  related_id: number | null
}

type CollectEmote = {
  id: number
  name: string
  sources: CollectSource[]
}

type SourceRoute = {
  routeId: string
  type: string
  contentName: string
  detail?: string
  needsReview: boolean
}

type SourceEntry = {
  id: string
  name: string
  status: string
  acquisitionRoutes: SourceRoute[]
}

type ContentTranslationEntry = {
  en: string
  ja: string
}

type RouteAuditRow = {
  sourceDictionaryId: string
  collectId: number | null
  emoteJa: string
  entryStatus: string
  routeId: string
  routeType: string
  contentName: string
  detail: string
  collectSourceType: string | null
  relatedType: string | null
  relatedId: number | null
  inContentDict: boolean
  category: string
  autoMethod: string | null
  keepEnglish: boolean
  needsReviewEntry: boolean
}

const CURRENCY_PATTERNS = [
  /^[\d,]+ MGP$/,
  /^[\d,]+ Company Seals$/,
  /^[\d,]+ Trophy Crystals$/,
  /^[\d,]+ Bozjan Clusters$/,
  /^[\d,]+ Cosmocredits$/,
  /^[\d,]+ Fragments of Illumed Aetherpool Glass$/,
  /^[\d,]+ Chunks of Sanguinite$/,
  /^[\d,]+ Skybuilders' Scrips(?: \(Unlock with the "Read" emote\))?$/,
  /^[\d,]+ Skybuilders' Scrips$/,
]

const ENGLISH_KEEP_PATTERNS = [
  /^Online Store$/,
  /^Item code included with Meister Quality Figure .+$/,
  /^KFC Promotion \(Japan Only\)$/,
  /^Jollibee Promotion \(NA Only\)$/,
  /^Recruit a Friend Campaign reward$/,
  /^Available if registered in the Companion app$/,
  /^Ceremony of Eternal Bonding$/,
  /^Unresolved$/,
  /^Collect sources unavailable$/,
]

const EVENT_NAME_PATTERNS = [
  /^Moonfire Faire \(\d{4}\)$/,
  /^All Saints' Wake \(.+\)$/,
  /^The Make It Rain Campaign \(\d{4}\)$/,
  /^Little Ladies' Day \(\d{4}\)$/,
  /^Fan Festival .+$/,
  /^Moogle Treasure Trove Event$/,
]

const VENDOR_NPC_PATTERNS = [
  /^.+ - .+ - [\d,]+ .+ \(Rank \d+\)$/,
  /^Eschina - Rhalgr's Reach - \d+ Mythic Clan Mark Logs$/,
  /^Spoils Collector - \d+ Iron Voyage Spoil \(Sea of Clouds Sector \d+\)$/,
]

const OCCULT_CRESCENT_PATTERNS = [
  /Lockbox - /,
  /^South Horn - (Bronze|Silver|Gold|Pot\/Bunny) Coffer$/,
  /^Zadnor Lockbox$/,
]

function extractCollectId(sourceDictionaryId: string) {
  if (sourceDictionaryId === 'source_24222') {
    return 188
  }

  const match = sourceDictionaryId.match(/^source_emote_(\d+)$/)
  return match ? Number(match[1]) : null
}

function isEnglishKeep(text: string) {
  return ENGLISH_KEEP_PATTERNS.some((pattern) => pattern.test(text))
}

function isCurrencyTemplate(text: string) {
  return CURRENCY_PATTERNS.some((pattern) => pattern.test(text))
}

function isEventName(text: string) {
  return EVENT_NAME_PATTERNS.some((pattern) => pattern.test(text))
}

function isVendorNpcLine(text: string) {
  return VENDOR_NPC_PATTERNS.some((pattern) => pattern.test(text))
}

function isOccultCrescent(text: string) {
  return OCCULT_CRESCENT_PATTERNS.some((pattern) => pattern.test(text))
}

function classifyMissingText(text: string): { category: string; autoMethod: string | null; keepEnglish: boolean } {
  if (isEnglishKeep(text)) {
    return { category: 'premium_product_promo', autoMethod: 'keep_english', keepEnglish: true }
  }

  if (text === 'Unresolved' || text === 'Collect sources unavailable') {
    return { category: 'review_queue_placeholder', autoMethod: null, keepEnglish: false }
  }

  if (isCurrencyTemplate(text)) {
    return { category: 'currency_exchange', autoMethod: 'template_currency', keepEnglish: false }
  }

  if (isOccultCrescent(text)) {
    return { category: 'occult_crescent', autoMethod: 'manual_or_template', keepEnglish: false }
  }

  if (isVendorNpcLine(text)) {
    return { category: 'vendor_npc_exchange', autoMethod: 'template_vendor_npc', keepEnglish: false }
  }

  if (isEventName(text)) {
    return { category: 'seasonal_event', autoMethod: 'manual_dictionary', keepEnglish: false }
  }

  if (/Collaboration|Promotion|Campaign|Festival|Wake|Faire|Day/i.test(text)) {
    return { category: 'event_campaign', autoMethod: 'manual_dictionary', keepEnglish: false }
  }

  if (/^Cosmic Fortune - /.test(text)) {
    return { category: 'cosmic_exploration', autoMethod: 'manual_dictionary', keepEnglish: false }
  }

  if (/Cold-warped|Heat-warped|Lockbox/.test(text)) {
    return { category: 'occult_crescent', autoMethod: 'manual_or_template', keepEnglish: false }
  }

  return { category: 'quest_or_content_name', autoMethod: 'manual_dictionary_or_xivapi', keepEnglish: false }
}

async function fetchJaName(sheet: string, rowId: number) {
  const response = await fetch(
    `https://v2.xivapi.com/api/sheet/${sheet}/${rowId}?language=ja&fields=Name,PlaceName.Name`,
  )

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    fields?: { Name?: string; PlaceName?: { fields?: { Name?: string } } }
  }

  return payload.fields?.Name?.trim() ?? payload.fields?.PlaceName?.fields?.Name?.trim() ?? null
}

async function main() {
  const sourceDictionary = JSON.parse(
    readFileSync(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8'),
  ) as Array<SourceEntry | { type: string }>
  const contentDictionary = JSON.parse(
    readFileSync(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8'),
  ) as Array<ContentTranslationEntry | { type: string }>
  const contentJa = new Map(
    contentDictionary.filter((entry) => entry.type !== 'metadata').map((entry) => [entry.en, entry.ja]),
  )

  const collectEmotes = (await fetch('https://ffxivcollect.com/api/emotes').then((response) => response.json())) as {
    results: CollectEmote[]
  }

  const collectById = new Map(collectEmotes.results.map((emote) => [emote.id, emote]))

  const rows: RouteAuditRow[] = []
  const uniqueTexts = new Map<string, RouteAuditRow[]>()

  for (const entry of sourceDictionary) {
    if (entry.type === 'metadata') {
      continue
    }

    const sourceEntry = entry as SourceEntry
    if ((sourceEntry as SourceEntry & { category1?: string }).category1 !== 'エモート') {
      continue
    }

    if (!sourceEntry.acquisitionRoutes?.length) {
      continue
    }

    const collectId = extractCollectId(sourceEntry.id)
    const collect = collectId ? collectById.get(collectId) : undefined
    const needsReviewEntry =
      sourceEntry.status === 'needs_review' ||
      (collectId !== null && MANUAL_REVIEW_COLLECT_IDS.has(collectId))

    sourceEntry.acquisitionRoutes.forEach((route, index) => {
      const collectSource = collect?.sources?.[index] ?? null
      const inContentDict =
        contentJa.has(route.contentName) || contentJa.has(route.detail ?? route.contentName)

      const row: RouteAuditRow = {
        sourceDictionaryId: sourceEntry.id,
        collectId,
        emoteJa: sourceEntry.name,
        entryStatus: sourceEntry.status,
        routeId: route.routeId,
        routeType: route.type,
        contentName: route.contentName,
        detail: route.detail ?? route.contentName,
        collectSourceType: collectSource?.type ?? null,
        relatedType: collectSource?.related_type ?? null,
        relatedId: collectSource?.related_id ?? null,
        inContentDict,
        category: inContentDict ? 'existing_dictionary' : 'pending',
        autoMethod: inContentDict ? 'content_translation_dictionary' : null,
        keepEnglish: false,
        needsReviewEntry,
      }

      rows.push(row)

      for (const text of new Set([route.contentName, route.detail ?? route.contentName])) {
        if (!uniqueTexts.has(text)) {
          uniqueTexts.set(text, [])
        }

        uniqueTexts.get(text)!.push(row)
      }
    })
  }

  const emoteEntries = sourceDictionary.filter(
    (entry) => entry.type !== 'metadata' && (entry as SourceEntry).id.startsWith('source_emote_'),
  )
  const legacyEntry = sourceDictionary.find((entry) => entry.type !== 'metadata' && (entry as SourceEntry).id === 'source_24222') as
    | SourceEntry
    | undefined

  const uniqueMissing = [...uniqueTexts.entries()]
    .filter(([text]) => !contentJa.has(text))
    .map(([text, refs]) => {
      const sample = refs[0]
      return { text, ...classifyMissingText(text), routeRefs: refs.length, sampleCollectId: sample.collectId }
    })
    .sort((left, right) => left.text.localeCompare(right.text))

  const questRelatedIds = new Set<number>()
  const instanceRelatedIds = new Set<number>()
  const questAutoCandidates: Array<{ text: string; relatedId: number; ja: string | null }> = []
  const instanceAutoCandidates: Array<{ text: string; relatedId: number; ja: string | null }> = []

  for (const [text, refs] of uniqueTexts.entries()) {
    if (contentJa.has(text)) {
      continue
    }

    for (const ref of refs) {
      if (ref.relatedType === 'Quest' && ref.relatedId) {
        questRelatedIds.add(ref.relatedId)
      }
      if (ref.relatedType === 'Instance' && ref.relatedId) {
        instanceRelatedIds.add(ref.relatedId)
      }
    }
  }

  for (const relatedId of questRelatedIds) {
    const ja = await fetchJaName('Quest', relatedId)
    const texts = [...uniqueTexts.entries()]
      .filter(([, refs]) => refs.some((ref) => ref.relatedType === 'Quest' && ref.relatedId === relatedId))
      .map(([text]) => text)

    for (const text of texts) {
      questAutoCandidates.push({ text, relatedId, ja })
    }
  }

  for (const relatedId of instanceRelatedIds) {
    const ja = await fetchJaName('InstanceContent', relatedId)
    const texts = [...uniqueTexts.entries()]
      .filter(([, refs]) => refs.some((ref) => ref.relatedType === 'Instance' && ref.relatedId === relatedId))
      .map(([text]) => text)

    for (const text of texts) {
      instanceAutoCandidates.push({ text, relatedId, ja })
    }
  }

  const categoryCounts = uniqueMissing.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1
    return acc
  }, {})

  const autoCounts = {
    existingDictionary: [...uniqueTexts.keys()].filter((text) => contentJa.has(text)).length,
    questRelatedId: new Set(questAutoCandidates.filter((item) => item.ja).map((item) => item.text)).size,
    instanceRelatedId: new Set(instanceAutoCandidates.filter((item) => item.ja).map((item) => item.text)).size,
    currencyTemplate: uniqueMissing.filter((item) => item.category === 'currency_exchange').length,
    keepEnglish: uniqueMissing.filter((item) => item.keepEnglish).length,
    manualDictionary: uniqueMissing.filter(
      (item) =>
        !item.keepEnglish &&
        item.category !== 'currency_exchange' &&
        item.category !== 'review_queue_placeholder' &&
        !questAutoCandidates.some((candidate) => candidate.text === item.text && candidate.ja) &&
        !instanceAutoCandidates.some((candidate) => candidate.text === item.text && candidate.ja),
    ).length,
    reviewPlaceholder: uniqueMissing.filter((item) => item.category === 'review_queue_placeholder').length,
  }

  const routeEventStats = {
    totalRouteEvents: rows.length,
    uniqueTexts: uniqueTexts.size,
    contentDictHits: [...uniqueTexts.keys()].filter((text) => contentJa.has(text)).length,
    uniqueMissing: uniqueMissing.length,
    routeEventsMissingTranslation: rows.filter((row) => !row.inContentDict).length,
  }

  const reviewQueueUniqueMissing = uniqueMissing.filter((item) =>
    (uniqueTexts.get(item.text) ?? []).some((row) => row.needsReviewEntry),
  )

  const report = {
    generatedAt: new Date().toISOString(),
    scope: {
      emoteEntries: emoteEntries.length + (legacyEntry ? 1 : 0),
      confirmedEntries: sourceDictionary.filter(
        (entry) => entry.type !== 'metadata' && (entry as SourceEntry).status === 'confirmed',
      ).length,
      needsReviewEntries: sourceDictionary.filter(
        (entry) => entry.type !== 'metadata' && (entry as SourceEntry).status === 'needs_review',
      ).length,
    },
    routeEventStats,
    uniqueMissingCategoryCounts: categoryCounts,
    autoCounts,
    questRelatedId: {
      uniqueQuestTexts: new Set(questAutoCandidates.map((item) => item.text)).size,
      translatableTexts: new Set(questAutoCandidates.filter((item) => item.ja).map((item) => item.text)).size,
      uniqueQuestIds: questRelatedIds.size,
      samples: questAutoCandidates.filter((item) => item.ja).slice(0, 15),
      untranslatableQuestTexts: [...new Set(questAutoCandidates.filter((item) => !item.ja).map((item) => item.text))],
    },
    instanceRelatedId: {
      uniqueInstanceTexts: new Set(instanceAutoCandidates.map((item) => item.text)).size,
      translatableTexts: new Set(instanceAutoCandidates.filter((item) => item.ja).map((item) => item.text)).size,
      uniqueInstanceIds: instanceRelatedIds.size,
      samples: instanceAutoCandidates.filter((item) => item.ja),
      alreadyInDictionary: instanceAutoCandidates.filter((item) => contentJa.has(item.text)),
    },
    englishKeepTexts: uniqueMissing.filter((item) => item.keepEnglish),
    manualDictionaryTexts: uniqueMissing.filter(
      (item) =>
        !item.keepEnglish &&
        item.category !== 'currency_exchange' &&
        item.category !== 'review_queue_placeholder' &&
        !questAutoCandidates.some((candidate) => candidate.text === item.text && candidate.ja) &&
        !instanceAutoCandidates.some((candidate) => candidate.text === item.text && candidate.ja),
    ),
    currencyTemplateTexts: uniqueMissing.filter((item) => item.category === 'currency_exchange'),
    reviewQueue: {
      entries: [...MANUAL_REVIEW_COLLECT_IDS],
      uniqueMissingTexts: reviewQueueUniqueMissing,
      note: '12件は Collect sources 欠落または Occult Crescent/Other 系。経路日本語化とは別枠で処理',
    },
    implementationPriority: [
      'Tier1: Quest related_id -> XIVAPI Quest.Name(JA)',
      'Tier2: Instance related_id -> XIVAPI InstanceContent.Name(JA)',
      'Tier3: 通貨/交換テンプレ（MGP, Company Seals, Skybuilders Scrips, Bozjan Clusters 等）',
      'Tier4: イベント名手動辞書（Seasonal Event, Moonfire Faire 等）',
      'Tier5: Premium/商品コード/外部プロモは英語維持方針を明示',
      'Tier6: needs_review 12件は route補完後に翻訳',
    ],
    uniqueMissingAll: uniqueMissing,
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(resolve(OUTPUT_DIR, 'phase-e2-route-translation-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    routeEventStats: report.routeEventStats,
    uniqueMissingCategoryCounts: report.uniqueMissingCategoryCounts,
    autoCounts: report.autoCounts,
    questRelatedId: report.questRelatedId,
    instanceRelatedId: report.instanceRelatedId,
    englishKeepCount: report.englishKeepTexts.length,
    manualDictionaryCount: report.manualDictionaryTexts.length,
    reviewQueueMissingCount: report.reviewQueue.uniqueMissingTexts.length,
  }, null, 2))
}

await main()
