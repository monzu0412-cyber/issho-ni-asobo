import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type FishTermType =
  | 'weather'
  | 'bait'
  | 'mooch'
  | 'fish'
  | 'folklore'
  | 'intuition_fish'
  | 'step_target'

type SourceDictionaryEntry = {
  category1?: string
  category?: string
  acquisitionRoutes?: Array<{
    specialConditions?: {
      weather?: {
        previous?: unknown
        current?: unknown
      }
      bait?: unknown
      mooch?: unknown
      folklore?: unknown
      intuition?: Array<{ fish?: string }>
    }
    conditionSteps?: Array<{ target?: string }>
  }>
}

type FishTermTranslationEntry = {
  en: string
  ja: string
  types: FishTermType[]
  source: 'teamcraft-weathers' | 'teamcraft-items' | 'teamcraft-baits' | 'teamcraft-fishes' | 'manual'
  aliases?: string[]
}

type TeamcraftItem = {
  en?: string
  ja?: string
}

type TeamcraftWeather = {
  name?: {
    en?: string
    ja?: string
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const SOURCE_DICTIONARY_PATH = resolve(MANUAL_DIR, 'source_dictionary.json')
const OUTPUT_PATH = resolve(MANUAL_DIR, 'fish_term_translation_dictionary.json')
const TEAMCRAFT_BASE =
  'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json'

const MANUAL_OVERRIDES: Record<string, string> = {}

function normalizeKey(value: string) {
  return value.trim()
}

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function collectRawTerms(set: Set<string>, value: unknown) {
  if (value == null) {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectRawTerms(set, item))
    return
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectRawTerms(set, item))
    return
  }

  const text = String(value)

  if (text && !isJapanese(text) && !/^\d+$/.test(text.trim())) {
    set.add(text)
  }
}

async function fetchTeamcraftJson<T>(filename: string) {
  const response = await fetch(`${TEAMCRAFT_BASE}/${filename}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch Teamcraft ${filename}: ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(SOURCE_DICTIONARY_PATH, 'utf8')) as SourceDictionaryEntry[]
  const fishEntries = sourceDictionary.filter(
    (entry) => entry.category1 === '魚' || entry.category === '釣り',
  )

  const weatherNames = new Set<string>()
  const baitNames = new Set<string>()
  const moochNames = new Set<string>()
  const folkloreNames = new Set<string>()
  const intuitionFishNames = new Set<string>()
  const stepTargetNames = new Set<string>()

  for (const entry of fishEntries) {
    for (const route of entry.acquisitionRoutes ?? []) {
      const conditions = route.specialConditions ?? {}

      if (conditions.weather) {
        collectRawTerms(weatherNames, conditions.weather.previous)
        collectRawTerms(weatherNames, conditions.weather.current)
      }

      collectRawTerms(baitNames, conditions.bait)
      collectRawTerms(moochNames, conditions.mooch)
      collectRawTerms(folkloreNames, conditions.folklore)

      for (const item of conditions.intuition ?? []) {
        if (item.fish) {
          collectRawTerms(intuitionFishNames, item.fish)
        }
      }

      for (const step of route.conditionSteps ?? []) {
        collectRawTerms(stepTargetNames, step.target)
      }
    }
  }

  const [weathers, baits, items, fishes] = await Promise.all([
    fetchTeamcraftJson<Record<string, TeamcraftWeather>>('weathers.json'),
    fetchTeamcraftJson<Record<string, TeamcraftItem & { itemId?: number }>>('baits.json'),
    fetchTeamcraftJson<Record<string, TeamcraftItem>>('items.json'),
    fetchTeamcraftJson<Record<string, TeamcraftItem & { itemId?: number }>>('fishes.json'),
  ])

  const weatherMap = new Map<string, string>()
  for (const weather of Object.values(weathers)) {
    const en = weather.name?.en
    const ja = weather.name?.ja

    if (en && ja) {
      weatherMap.set(normalizeKey(en), ja)
    }
  }

  const itemMap = new Map<string, string>()
  for (const item of Object.values(items)) {
    if (item.en && item.ja) {
      itemMap.set(normalizeKey(item.en), item.ja)
    }
  }

  for (const bait of Object.values(baits)) {
    const en = bait.en ?? items[bait.itemId ?? '']?.en
    const ja = bait.ja ?? items[bait.itemId ?? '']?.ja

    if (en && ja) {
      itemMap.set(normalizeKey(en), ja)
    }
  }

  for (const fish of Object.values(fishes)) {
    const en = fish.en ?? items[fish.itemId ?? '']?.en
    const ja = fish.ja ?? items[fish.itemId ?? '']?.ja

    if (en && ja) {
      itemMap.set(normalizeKey(en), ja)
    }
  }

  const entries = new Map<string, FishTermTranslationEntry>()
  const unmatched: string[] = []
  let autoGeneratedCount = 0
  let manualCount = 0

  const lookupJa = (canonical: string, type: FishTermType) => {
    const manualJa = MANUAL_OVERRIDES[canonical]

    if (manualJa) {
      return { ja: manualJa, source: 'manual' as const }
    }

    if (type === 'weather') {
      const ja = weatherMap.get(canonical)

      if (ja) {
        return { ja, source: 'teamcraft-weathers' as const }
      }
    }

    const ja = itemMap.get(canonical)

    if (ja) {
      return { ja, source: 'teamcraft-items' as const }
    }

    return null
  }

  const register = (rawName: string, type: FishTermType) => {
    const canonical = normalizeKey(rawName)

    if (!canonical) {
      return
    }

    const resolved = lookupJa(canonical, type)

    if (!resolved) {
      if (!unmatched.includes(canonical)) {
        unmatched.push(canonical)
      }

      return
    }

    const existing = entries.get(canonical)

    if (existing) {
      if (!existing.types.includes(type)) {
        existing.types.push(type)
      }

      if (rawName !== canonical && !existing.aliases?.includes(rawName)) {
        existing.aliases = [...(existing.aliases ?? []), rawName]
      }

      return
    }

    entries.set(canonical, {
      en: canonical,
      ja: resolved.ja,
      types: [type],
      source: resolved.source,
      ...(rawName !== canonical ? { aliases: [rawName] } : {}),
    })

    if (resolved.source === 'manual') {
      manualCount += 1
    } else {
      autoGeneratedCount += 1
    }
  }

  for (const name of [...weatherNames].sort((a, b) => a.localeCompare(b))) {
    register(name, 'weather')
  }

  for (const name of [...baitNames].sort((a, b) => a.localeCompare(b))) {
    register(name, 'bait')
    register(name, 'fish')
  }

  for (const name of [...moochNames].sort((a, b) => a.localeCompare(b))) {
    register(name, 'mooch')
    register(name, 'fish')
  }

  for (const name of [...folkloreNames].sort((a, b) => a.localeCompare(b))) {
    register(name, 'folklore')
  }

  for (const name of [...intuitionFishNames].sort((a, b) => a.localeCompare(b))) {
    register(name, 'intuition_fish')
    register(name, 'fish')
  }

  for (const name of [...stepTargetNames].sort((a, b) => a.localeCompare(b))) {
    register(name, 'step_target')
    register(name, 'fish')
  }

  const fishTypeCount = [...entries.values()].filter((entry) => entry.types.includes('fish')).length

  const output = [
    {
      version: 1,
      type: 'metadata',
      description:
        'English to Japanese translations for fish specialConditions and conditionSteps terms.',
      generatedAt: new Date().toISOString(),
      sources: [
        'Teamcraft weathers.json',
        'Teamcraft items.json',
        'Teamcraft baits.json',
        'Teamcraft fishes.json',
        'manual override',
      ],
      counts: {
        weather: weatherNames.size,
        bait: baitNames.size,
        mooch: moochNames.size,
        fish: fishTypeCount,
        folklore: folkloreNames.size,
        intuitionFish: intuitionFishNames.size,
        stepTarget: stepTargetNames.size,
        unique: entries.size,
        autoGenerated: autoGeneratedCount,
        manual: manualCount,
        unmatched: unmatched.length,
      },
    },
    ...[...entries.values()]
      .sort((a, b) => a.en.localeCompare(b.en))
      .map((entry) => ({
        ...entry,
        types: [...entry.types].sort(),
        ...(entry.aliases ? { aliases: [...entry.aliases].sort() } : {}),
      })),
  ]

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(`Wrote ${OUTPUT_PATH}`)
  console.log(`weather: ${weatherNames.size}`)
  console.log(`bait: ${baitNames.size}`)
  console.log(`mooch: ${moochNames.size}`)
  console.log(`folklore: ${folkloreNames.size}`)
  console.log(`fish entries: ${fishTypeCount}`)
  console.log(`dictionary entries: ${entries.size}`)
  console.log(`auto-generated: ${autoGeneratedCount}`)
  console.log(`manual: ${manualCount}`)

  if (unmatched.length > 0) {
    console.log(`unmatched (${unmatched.length}):`)
    unmatched.forEach((name) => console.log(` - ${name}`))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
