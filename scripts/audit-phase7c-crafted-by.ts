import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type SourceDictionaryEntry = {
  category1?: string
  subCategory?: string
  contentName?: string | null
  acquisitionRoutes?: Array<{
    contentName?: string
    detail?: string
  }>
}

type TeamcraftRecord = {
  en?: string
  ja?: string
  name?: { en?: string; ja?: string }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const TEAMCRAFT_BASE =
  'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json'

const CRAFT_JOB_LABELS: Record<string, string> = {
  Alchemist: '錬金術師',
  Carpenter: '木工師',
  Blacksmith: '鍛冶師',
  Armorer: '甲冑師',
  Goldsmith: '彫金師',
  Leatherworker: '革細工師',
  Weaver: '裁縫師',
  Culinarian: '調理師',
}

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function isScoped(entry: SourceDictionaryEntry) {
  return entry.category1 === '譜面'
    || entry.subCategory === '譜面'
    || entry.category1 === 'マウント'
    || entry.category1 === 'ミニオン'
}

function buildTeamcraftMap(data: Record<string, TeamcraftRecord>) {
  const map = new Map<string, string>()
  for (const record of Object.values(data)) {
    const en = record.en ?? record.name?.en
    const ja = record.ja ?? record.name?.ja
    if (en && ja) {
      map.set(en.trim(), ja)
    }
  }
  return map
}

function lookupTerm(value: string, maps: Map<string, string>[]) {
  const key = value.trim()
  for (const map of maps) {
    const ja = map.get(key)
    if (ja) return ja
  }
  return null
}

function translateCompositeSource(source: string, maps: Map<string, string>[]) {
  if (source.includes(' / ')) {
    const parts = source.split(' / ').map((part) => lookupTerm(part.trim(), maps) ?? part.trim())
    const translatedCount = parts.filter((part, index) => part !== source.split(' / ')[index]?.trim()).length
    return translatedCount > 0 ? parts.join(' / ') : null
  }
  return lookupTerm(source, maps)
}

type SourceClassification = {
  group: string
  confidence: 'high' | 'medium' | 'low'
  recommendation: 'auto-template' | 'manual-dictionary' | 'partial-template' | 'english-fallback'
  jaHint?: string
}

function classifyCraftSource(source: string): SourceClassification {
  if (/^Purchase from /i.test(source)) {
    return { group: 'Purchase from vendor', confidence: 'medium', recommendation: 'partial-template', jaHint: '購入 - {vendorEn}' }
  }

  if (/^Subaquatic Voyages:/i.test(source)) {
    return { group: 'Subaquatic Voyages crafted', confidence: 'low', recommendation: 'english-fallback' }
  }

  if (/^Exploratory Voyages:/i.test(source)) {
    return { group: 'Exploratory Voyages', confidence: 'low', recommendation: 'english-fallback' }
  }

  if (/Hunts$/i.test(source)) {
    return { group: 'Regional Hunts', confidence: 'medium', recommendation: 'partial-template', jaHint: '{region}モブハント' }
  }

  if (/Treasure Maps$/i.test(source)) {
    return { group: 'Treasure Maps tier', confidence: 'medium', recommendation: 'partial-template', jaHint: 'Lv{range}トレジャーマップ' }
  }

  if (/\(Extreme\)$/i.test(source) || /\(Hard\)$/i.test(source) || /\(Savage\)$/i.test(source)) {
    return { group: 'Instance (Extreme/Hard/Savage)', confidence: 'high', recommendation: 'auto-template' }
  }

  if (/Turn \d/i.test(source) || /Coil of Bahamut/i.test(source) || /Palace of the Dead/i.test(source)) {
    return { group: 'Legacy instance title', confidence: 'high', recommendation: 'auto-template' }
  }

  if (/^Level \d/i.test(source)) {
    return { group: 'Level range label', confidence: 'low', recommendation: 'english-fallback' }
  }

  if (/^The /i.test(source)) {
    return { group: 'The ... instance/content', confidence: 'high', recommendation: 'auto-template' }
  }

  return { group: 'Other proper noun', confidence: 'low', recommendation: 'english-fallback' }
}

function lookupInstanceWithNormalization(source: string, instanceMap: Map<string, string>) {
  const trimmed = source.trim()
  const candidates = [
    trimmed,
    trimmed.replace(/^The /i, 'the '),
    `the ${trimmed.replace(/^The /i, '')}`,
    trimmed.replace(/ \(Turn (\d+)\)$/i, ' - Turn $1'),
    trimmed.replace(/^The /i, 'the ').replace(/ \(Turn (\d+)\)$/i, ' - Turn $1'),
  ]

  for (const candidate of candidates) {
    const ja = instanceMap.get(candidate.trim())
    if (ja) {
      return ja
    }
  }

  return null
}

function lookupHuntSource(source: string, placeMap: Map<string, string>) {
  const match = source.match(/^(.+?) Hunts$/i)
  if (!match) {
    return null
  }

  const regionJa = placeMap.get(match[1].trim()) ?? placeMap.get(match[1].trim().toLowerCase())
  if (!regionJa) {
    return null
  }

  return `${regionJa}モブハント`
}

async function fetchTeamcraftJson<T>(filename: string) {
  const response = await fetch(`${TEAMCRAFT_BASE}/${filename}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch Teamcraft ${filename}: ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as SourceDictionaryEntry[]
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string }>
  const dictMap = new Map(dictionary.filter((entry) => entry.en && entry.ja).map((entry) => [entry.en!.trim(), entry.ja!]))

  const englishValues = new Set<string>()
  for (const entry of sourceDictionary.filter(isScoped)) {
    for (const value of [
      entry.contentName,
      ...(entry.acquisitionRoutes ?? []).flatMap((route) => [route.contentName, route.detail]),
    ]) {
      const text = value?.trim()
      if (text && !isJapanese(text)) englishValues.add(text)
    }
  }

  const fallback = [...englishValues].filter((value) => !dictMap.has(value)).sort((a, b) => a.localeCompare(b))
  const craftedFallback = fallback.filter((value) => /^Crafted by /i.test(value))

  const [items, places, instances, fates, achievements, quests] = await Promise.all([
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('items.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('places.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('instances.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('fates.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('achievements.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('quests.json'),
  ])

  const instanceMap = buildTeamcraftMap(instances)
  const placeMap = buildTeamcraftMap(places)
  const termMaps = [
    instanceMap,
    buildTeamcraftMap(quests),
    buildTeamcraftMap(achievements),
    buildTeamcraftMap(items),
    placeMap,
    buildTeamcraftMap(fates),
  ]

  const parsed = craftedFallback.map((line) => {
    const match = line.match(/^Crafted by (Alchemist|Carpenter|Blacksmith|Armorer|Goldsmith|Leatherworker|Weaver|Culinarian)\s*-\s*(.+)$/i)
    const job = match?.[1] ?? 'Unknown'
    const source = match?.[2]?.trim() ?? ''
    const jobJa = CRAFT_JOB_LABELS[job] ?? null
    const teamcraftJa = source ? translateCompositeSource(source, termMaps) : null
    const normalizedInstanceJa = source ? lookupInstanceWithNormalization(source, instanceMap) : null
    const huntJa = source ? lookupHuntSource(source, placeMap) : null
    const resolvedSourceJa = teamcraftJa ?? normalizedInstanceJa ?? huntJa
    const classification = source ? classifyCraftSource(source) : {
      group: 'no source',
      confidence: 'high' as const,
      recommendation: 'auto-template' as const,
      jaHint: '{jobJa}製作',
    }

    let recommendation = classification.recommendation
    if (resolvedSourceJa) {
      recommendation = 'auto-template'
    } else if (recommendation === 'auto-template') {
      recommendation = 'partial-template'
    }

    const projectedJa = resolvedSourceJa && jobJa
      ? `${jobJa}製作 - ${resolvedSourceJa}`
      : jobJa
        ? `${jobJa}製作 - ${source}`
        : null

    return {
      line,
      job,
      jobJa,
      source,
      teamcraftJa,
      normalizedInstanceJa,
      huntJa,
      resolvedSourceJa,
      classification,
      recommendation,
      projectedJa,
    }
  })

  const byJob = Object.fromEntries(
    Object.keys(CRAFT_JOB_LABELS).map((job) => [job, parsed.filter((entry) => entry.job === job).length]),
  )

  const byGroup = [...parsed.reduce((map, entry) => {
    const key = entry.classification.group
    const bucket = map.get(key) ?? { count: 0, items: [] as typeof parsed }
    bucket.count += 1
    bucket.items.push(entry)
    map.set(key, bucket)
    return map
  }, new Map<string, { count: number; items: typeof parsed }>()).entries()]
    .map(([group, value]) => ({
      group,
      count: value.count,
      auto: value.items.filter((item) => item.recommendation === 'auto-template').length,
      partial: value.items.filter((item) => item.recommendation === 'partial-template').length,
      manual: value.items.filter((item) => item.recommendation === 'manual-dictionary').length,
      fallback: value.items.filter((item) => item.recommendation === 'english-fallback').length,
      samples: value.items.slice(0, 3).map((item) => ({
        en: item.line,
        source: item.source,
        teamcraftJa: item.teamcraftJa,
        projectedJa: item.projectedJa,
        recommendation: item.recommendation,
      })),
    }))
    .sort((a, b) => b.count - a.count)

  const summary = {
    autoTemplate: parsed.filter((entry) => entry.recommendation === 'auto-template').length,
    partialTemplate: parsed.filter((entry) => entry.recommendation === 'partial-template').length,
    manualDictionary: parsed.filter((entry) => entry.recommendation === 'manual-dictionary').length,
    englishFallback: parsed.filter((entry) => entry.recommendation === 'english-fallback').length,
    teamcraftResolvable: parsed.filter((entry) => entry.teamcraftJa !== null).length,
    normalizedResolvable: parsed.filter((entry) => entry.resolvedSourceJa !== null).length,
    jobOnlyPartial: parsed.filter((entry) => entry.jobJa && !entry.resolvedSourceJa).length,
  }

  console.log(JSON.stringify({
    currentFallbackTotal: fallback.length,
    craftedFallbackTotal: craftedFallback.length,
    craftedShareOfFallbackPct: ((craftedFallback.length / fallback.length) * 100).toFixed(1),
    byJob,
    summary,
    byGroup,
    allCraftedLines: parsed.map((entry) => ({
      en: entry.line,
      job: entry.job,
      source: entry.source,
      teamcraftJa: entry.teamcraftJa,
      normalizedInstanceJa: entry.normalizedInstanceJa,
      huntJa: entry.huntJa,
      resolvedSourceJa: entry.resolvedSourceJa,
      group: entry.classification.group,
      recommendation: entry.recommendation,
      projectedJa: entry.projectedJa,
    })),
    templateProposal: {
      tier2Extended: 'Crafted by {Job} - {sourceJaOrEn} where job always ja, source via Teamcraft lookup + new partial templates',
      partialFallback: '{jobJa}製作 - {sourceEn} when source cannot be safely translated',
      doNotTranslate: ['Subaquatic Voyages crafted lines', 'Exploratory Voyages crafted lines', 'ambiguous vendor purchase strings'],
    },
    representativeExamples: {
      teamcraftHit: parsed.find((entry) => entry.teamcraftJa),
      partialTemplate: parsed.find((entry) => entry.recommendation === 'partial-template'),
      englishFallback: parsed.find((entry) => entry.recommendation === 'english-fallback'),
    },
    projectedCoverageAfterFullAuto: {
      additionalEntries: summary.autoTemplate + summary.partialTemplate,
      fallbackAfter: fallback.length - summary.autoTemplate - summary.partialTemplate,
      coveragePct: (((englishValues.size - (fallback.length - summary.autoTemplate - summary.partialTemplate)) / englishValues.size) * 100).toFixed(1),
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
