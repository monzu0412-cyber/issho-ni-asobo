import { mkdir, readFile, writeFile } from 'node:fs/promises'
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

type P2Classification = {
  p2Scope: boolean
  subcategory: string
  recommendation: 'auto-template' | 'manual-dictionary' | 'english-fallback' | 'defer'
  risk: 'low' | 'medium' | 'high'
  templateHint: string | null
  teamcraftJa: string | null
  note?: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const OUTPUT_DIR = resolve(ROOT, '.tmp-audit-phase7f')
const TEAMCRAFT_BASE =
  'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json'

const EXPLORATION_LABELS: Record<string, string> = {
  'Field Exploration XIII': 'フィールド探索XIII',
  'Field Exploration XIV': 'フィールド探索XIV',
  'Field Exploration XIX': 'フィールド探索XIX',
  'Field Exploration XXII': 'フィールド探索XXII',
  'Field Exploration XXV': 'フィールド探索XXV',
  'Field Exploration XXVIII': 'フィールド探索XXVIII',
  'Highland Exploration XIII': 'ハイランド探索XIII',
  'Highland Exploration XIV': 'ハイランド探索XIV',
  'Highland Exploration XIX': 'ハイランド探索XIX',
  'Highland Exploration XXII': 'ハイランド探索XXII',
  'Highland Exploration XXV': 'ハイランド探索XXV',
  'Highland Exploration XXVIII': 'ハイランド探索XXVIII',
  'Highland Exploration XXXI': 'ハイランド探索XXXI',
  'Waterside Exploration XIII': '水辺探索XIII',
  'Waterside Exploration XXII': '水辺探索XXII',
  'Waterside Exploration XXV': '水辺探索XXV',
  'Waterside Exploration XXVIII': '水辺探索XXVIII',
  'Waterside Exploration XXXI': '水辺探索XXXI',
  'Woodland Exploration XXII': '林地探索XXII',
  'Woodland Exploration XXV': '林地探索XXV',
  'Woodland Exploration XXVIII': '林地探索XXVIII',
  'Woodland Exploration XXXI': '林地探索XXXI',
}

const SYSTEM_LABELS: Record<string, string> = {
  Bozja: 'ボズヤ',
  Eureka: 'エウレカ',
  Gardening: 'ガーデニング',
  Skybuilders: 'スカイビルダー',
  Tribal: 'トライバル',
  Voyages: 'ボイジャー',
  'Gold Saucer': 'ゴールドソーサー',
  'All That She Carried': '彼女が運んだもの',
  'Protectors of the Wood': 'Protectors of the Wood',
  'One Forest': 'One Forest',
  'Tasteful Memories': 'Tasteful Memories',
  'Crystalline Conflict: Random Drop': 'クリスタライン・コンフリクト：ランダムドロップ',
  'Dalriada - Final Boss Chest': 'ダライダ：最終ボス宝箱',
  'Delubrum Reginae - Final Boss Chests': 'デルブルム・レギナ：最終ボス宝箱',
}

const DD_SACK_UNCERTAIN = new Set([
  'Heaven-on-High - Any Sack',
  'Heaven-on-High - Gold/Platinum Sack',
  'Heaven-on-High - Silver Sack',
  'Heaven-on-High - Silver/Gold Sack',
  'Heaven-on-High - Silver/Platinum Sack',
  "Pilgrim's Traverse - Gold/Platinum Sack",
  "Pilgrim's Traverse - Sack of First Light",
])

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

async function fetchTeamcraftJson<T>(filename: string) {
  const response = await fetch(`${TEAMCRAFT_BASE}/${filename}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch Teamcraft ${filename}: ${response.status}`)
  }
  return response.json() as Promise<T>
}

function lookupTerm(value: string, maps: Map<string, string>[]) {
  const key = value.trim()
  for (const map of maps) {
    const ja = map.get(key)
    if (ja) return ja
  }
  return null
}

function parseFateLine(name: string) {
  const match = name.match(/^FATE "(.+?)" - (.+)$/)
  if (!match) return null
  return { fateName: match[1], place: match[2] }
}

function parseVendorLine(name: string) {
  const slashMatch = name.match(/^(.+?) \/ (.+?) - (.+)$/)
  if (slashMatch) {
    return { npc: `${slashMatch[1]} / ${slashMatch[2]}`, location: null, cost: slashMatch[3] }
  }

  const parts = name.split(' - ')
  if (parts.length < 3) return null

  return {
    npc: parts.slice(0, -2).join(' - '),
    location: parts.at(-2)?.trim() ?? null,
    cost: parts.at(-1)?.trim() ?? null,
  }
}

function classifyP2(name: string, termMaps: Map<string, string>[], placeMap: Map<string, string>): P2Classification {
  const trimmed = name.trim()

  if (/^FATE "/i.test(trimmed)) {
    const parsed = parseFateLine(trimmed)
    const placeJa = parsed ? lookupTerm(parsed.place, [placeMap, ...termMaps]) : null
    const fateJa = parsed ? lookupTerm(parsed.fateName, termMaps) : null
    const teamcraftJa = fateJa && placeJa
      ? `FATE「${fateJa}」 - ${placeJa}`
      : placeJa
        ? `FATE "${parsed?.fateName ?? ''}" - ${placeJa}`
        : null

    return {
      p2Scope: true,
      subcategory: 'fate-line',
      recommendation: teamcraftJa ? 'auto-template' as const : 'manual-dictionary' as const,
      risk: 'high' as const,
      templateHint: 'FATE "{fateJaOrEn}" - {placeJaOrEn}',
      teamcraftJa,
      note: 'FATE名は誤訳リスク高。地名のみ部分テンプレも可',
    }
  }

  if (/^[A-Za-z].+ - .+ - \d/.test(trimmed) || /^J'lakshai/i.test(trimmed) || /^Spoils Collector - /i.test(trimmed) || /^The Baldesion Arsenal|^Nesvaaz - |^Eschina - |^Fathard - /i.test(trimmed)) {
    const parsed = parseVendorLine(trimmed)
    const locationJa = parsed?.location ? lookupTerm(parsed.location.replace(/\([^)]+\)/, '').trim(), [placeMap, ...termMaps]) : null
    const isFateVendor = /FATE|Horns|Fragments|Cog|Bolts|Beads|Bottles|Burning|Tonic|Sacks Of Nuts|Spoil/i.test(trimmed)

    return {
      p2Scope: true,
      subcategory: isFateVendor ? 'vendor-fate-exchange' : 'vendor-special-exchange',
      recommendation: locationJa ? 'auto-template' as const : 'manual-dictionary' as const,
      risk: 'high' as const,
      templateHint: '{npcEn} - {locationJaOrEn} - {costEn}',
      teamcraftJa: locationJa && parsed
        ? `${parsed.npc} - ${locationJa} - ${parsed.cost}`
        : null,
      note: '素材名・FATE括弧内は英語維持推奨。NPC名も英語維持',
    }
  }

  if (/^Heaven-on-High|^The Palace of the Dead|^Pilgrim's Traverse|^Eureka Orthos|^Eureka (?:Anemos|Pagos|Pyros|Hydatos)|^Happy Bunny Lockbox|^Heat-warped Lockbox|^Moisture-warped Lockbox|^Zadnor - /i.test(trimmed)) {
    const uncertain = DD_SACK_UNCERTAIN.has(trimmed) || /Any Sack|Gold\/Platinum Sack|Silver\/Gold Sack|Silver\/Platinum Sack|Sack of First Light/i.test(trimmed)

    return {
      p2Scope: true,
      subcategory: uncertain ? 'dd-sack-uncertain' : 'dd-eureka-lockbox',
      recommendation: uncertain ? 'english-fallback' as const : 'manual-dictionary' as const,
      risk: uncertain ? 'high' as const : 'medium' as const,
      templateHint: uncertain ? null : '{ddJa} - {lockboxJa}',
      teamcraftJa: null,
      note: uncertain ? 'Phase 7-A方針：不確実なSack表記は英語維持' : '既知DD/エウレカ箱名は手動辞書',
    }
  }

  if (/^Field Exploration|^Highland Exploration|^Quick Exploration|^Waterside Exploration|^Woodland Exploration/i.test(trimmed)) {
    const rangeMatch = trimmed.match(/^(.+?) ([A-Z]{2,}(?: - [A-Z]{2,})?(?: and [A-Z]{2,})?)$/)
    const base = rangeMatch?.[1] ?? trimmed
    const known = EXPLORATION_LABELS[trimmed] ?? EXPLORATION_LABELS[base]

    return {
      p2Scope: true,
      subcategory: 'retainer-exploration',
      recommendation: known ? 'manual-dictionary' as const : 'auto-template' as const,
      risk: 'medium' as const,
      templateHint: '{explorationTypeJa}{rankOrRange}',
      teamcraftJa: known ?? null,
      note: 'Retainer探索。範囲表記はテンプレ候補',
    }
  }

  if (/^Gathered by |^Desynthesize|^Gardening|^Skybuilders|^Bronze\/Silver|^Voyagers' Record|^Ancient Record|^Eureka$|^Bozja$|^Protectors of the Wood|^One Forest|^Tasteful Memories|^Moogle Treasure Trove|^Dalriada|^Delubrum|^Crystalline Conflict|^South Horn - /i.test(trimmed)) {
    const known = SYSTEM_LABELS[trimmed]
    const gatheredMatch = trimmed.match(/^Gathered by (Alchemist|Carpenter|Blacksmith|Armorer|Goldsmith|Leatherworker|Weaver|Culinarian|Botanist|Fisher|Miner)$/i)

    return {
      p2Scope: true,
      subcategory: gatheredMatch ? 'gathered-by-job' : 'game-system-label',
      recommendation: known || gatheredMatch ? 'manual-dictionary' as const : 'manual-dictionary' as const,
      risk: gatheredMatch ? 'low' as const : 'medium' as const,
      templateHint: gatheredMatch ? '{jobJa}で採集' : null,
      teamcraftJa: known ?? null,
      note: gatheredMatch ? 'Crafted by と同型の職名テンプレ' : undefined,
    }
  }

  if (/^Cosmic Fortune - /i.test(trimmed)) {
    return {
      p2Scope: true,
      subcategory: 'cosmic-fortune',
      recommendation: 'manual-dictionary' as const,
      risk: 'medium' as const,
      templateHint: 'コズミック・フォーチュン - {nameEn}',
      teamcraftJa: null,
      note: 'P3寄りだがCosmic系としてP2監査対象に含む',
    }
  }

  return {
    p2Scope: false,
    subcategory: 'out-of-scope',
    recommendation: 'defer' as const,
    risk: 'low' as const,
    templateHint: null,
    teamcraftJa: null,
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const sourceDictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as SourceDictionaryEntry[]
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string }>
  const dictMap = new Set(dictionary.filter((entry) => entry.en && entry.ja).map((entry) => entry.en!.trim()))

  const englishValues = new Set<string>()
  for (const entry of sourceDictionary.filter(isScoped)) {
    for (const value of [
      entry.contentName,
      ...(entry.acquisitionRoutes ?? []).flatMap((route) => [route.contentName, route.detail]),
    ]) {
      const text = value?.trim()
      if (text && !isJapanese(text)) {
        englishValues.add(text)
      }
    }
  }

  const fallback = [...englishValues].filter((value) => !dictMap.has(value)).sort((a, b) => a.localeCompare(b))

  const [items, places, instances, fates, achievements, quests] = await Promise.all([
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('items.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('places.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('instances.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('fates.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('achievements.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('quests.json'),
  ])

  const placeMap = buildTeamcraftMap(places)
  const termMaps = [
    buildTeamcraftMap(instances),
    buildTeamcraftMap(quests),
    buildTeamcraftMap(achievements),
    buildTeamcraftMap(items),
    placeMap,
    buildTeamcraftMap(fates),
  ]

  const classified = fallback.map((name) => ({ name, ...classifyP2(name, termMaps, placeMap) }))
  const p2 = classified.filter((entry) => entry.p2Scope)
  const nonP2 = classified.filter((entry) => !entry.p2Scope)

  const bySubcategory = Object.entries(
    p2.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.subcategory] = (acc[entry.subcategory] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const byRecommendation = {
    autoTemplate: p2.filter((entry) => entry.recommendation === 'auto-template').length,
    manualDictionary: p2.filter((entry) => entry.recommendation === 'manual-dictionary').length,
    englishFallback: p2.filter((entry) => entry.recommendation === 'english-fallback').length,
    defer: p2.filter((entry) => entry.recommendation === 'defer').length,
  }

  const conservativeResolvable = p2.filter((entry) =>
    entry.recommendation === 'auto-template'
    || (entry.recommendation === 'manual-dictionary' && entry.risk !== 'high')).length
  const optimisticResolvable = p2.filter((entry) => entry.recommendation !== 'english-fallback' && entry.recommendation !== 'defer').length

  const result = {
    currentFallbackTotal: fallback.length,
    currentCoveragePct: (((englishValues.size - fallback.length) / englishValues.size) * 100).toFixed(1),
    p2TargetTotal: p2.length,
    nonP2Remaining: nonP2.length,
    bySubcategory,
    byRecommendation,
    highRisk: p2.filter((entry) => entry.risk === 'high').map((entry) => entry.name),
    templateCandidates: p2.filter((entry) => entry.templateHint).map((entry) => ({
      name: entry.name,
      subcategory: entry.subcategory,
      templateHint: entry.templateHint,
      recommendation: entry.recommendation,
    })),
    safeManualDictionary: p2.filter((entry) =>
      entry.recommendation === 'manual-dictionary' && entry.risk !== 'high').map((entry) => ({
        name: entry.name,
        subcategory: entry.subcategory,
        teamcraftJa: entry.teamcraftJa,
      })),
    projections: {
      conservative: {
        resolved: conservativeResolvable,
        fallbackAfter: fallback.length - conservativeResolvable,
        coveragePct: (((englishValues.size - (fallback.length - conservativeResolvable)) / englishValues.size) * 100).toFixed(1),
      },
      optimistic: {
        resolved: optimisticResolvable,
        fallbackAfter: fallback.length - optimisticResolvable,
        coveragePct: (((englishValues.size - (fallback.length - optimisticResolvable)) / englishValues.size) * 100).toFixed(1),
      },
    },
    allP2Lines: p2,
    nonP2Summary: Object.entries(
      nonP2.reduce<Record<string, number>>((acc, entry) => {
        const key = entry.subcategory
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {}),
    ),
  }

  await writeFile(resolve(OUTPUT_DIR, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    currentFallbackTotal: result.currentFallbackTotal,
    p2TargetTotal: result.p2TargetTotal,
    nonP2Remaining: result.nonP2Remaining,
    bySubcategory: result.bySubcategory,
    byRecommendation: result.byRecommendation,
    highRiskCount: result.highRisk.length,
    templateCandidates: result.templateCandidates.length,
    safeManualCount: result.safeManualDictionary.length,
    projections: result.projections,
    nonP2Summary: result.nonP2Summary,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
