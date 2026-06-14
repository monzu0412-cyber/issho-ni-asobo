import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type FishParameter = {
  stars: number
  folklore?: number
}

type FishingSource = {
  spot: number
  bait?: number
  spawn?: number
  duration?: number
  weathers?: number[]
  weathersFrom?: number[]
  predators?: Array<{ id: number; amount: number }>
  gig?: number
  snagging?: boolean
  fishEyes?: boolean
  fishEyesEnabled?: boolean
  aLure?: number
  mLure?: number
}

type FishingSpot = {
  id: number
  placeId: number
  zoneId: number
  fishes?: number[]
}

type SourceDictionaryRoute = {
  routeId: string
  type: string
  contentName: string
  detail?: string
  specialConditions: Record<string, unknown>
  conditionSteps: Array<{ type: string; target: string; count?: number }>
  sources: Array<{ source: string; method: string; decision: string }>
  needsReview: boolean
}

type SourceDictionaryEntry = {
  id: string
  itemId: number
  name: string
  category1: string
  category2: string
  category: string
  subCategory: string
  contentName: string
  updatedAt: string
  acquisitionRoutes: SourceDictionaryRoute[]
  status: string
  type?: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SOURCE_DICTIONARY_PATH = resolve(ROOT, 'src/data/reverse-search/manual/source_dictionary.json')
const UPDATED_AT = '2026-06-13T00:00:00+09:00'
const TEAMCRAFT_BASE =
  'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json'
const HOLD_NAMES = new Set(['Thief Betta', 'Peteinosaur'])

type CliOptions = {
  limit: number | null
  minStars: number
  maxStars: number
  mode: 'sources' | 'spots' | 'all'
  dryRun: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  let limit: number | null = null
  let minStars = 0
  let maxStars = 4
  let mode: CliOptions['mode'] = 'all'
  let dryRun = false

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--limit') {
      limit = Number(args[i + 1])
      i += 1
    } else if (arg === '--min-stars') {
      minStars = Number(args[i + 1])
      i += 1
    } else if (arg === '--max-stars') {
      maxStars = Number(args[i + 1])
      i += 1
    } else if (arg === '--stars') {
      const value = args[i + 1]
      if (value.includes('-')) {
        const [min, max] = value.split('-').map(Number)
        minStars = min
        maxStars = max
      } else {
        minStars = Number(value)
        maxStars = Number(value)
      }
      i += 1
    } else if (arg === '--mode') {
      mode = args[i + 1] as CliOptions['mode']
      i += 1
    } else if (arg === '--dry-run') {
      dryRun = true
    }
  }

  return { limit, minStars, maxStars, mode, dryRun }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${TEAMCRAFT_BASE}/${path}`)
  if (!response.ok) {
    throw new Error(`${path} ${response.status}`)
  }

  return (await response.json()) as T
}

const nameCache = new Map<string, string>()

async function sheetName(sheet: string, id: number | null | undefined): Promise<string | null> {
  if (id == null) {
    return null
  }

  const key = `${sheet}:${id}`
  if (nameCache.has(key)) {
    return nameCache.get(key) ?? null
  }

  let name = String(id)
  const response = await fetch(`https://v2.xivapi.com/api/sheet/${sheet}/${id}?fields=Name`)
  if (response.ok) {
    const payload = (await response.json()) as { fields?: { Name?: string } }
    name = payload.fields?.Name?.trim() || name
  }

  nameCache.set(key, name)
  return name
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

async function preloadNames(ids: number[], sheet: string) {
  const unique = [...new Set(ids.filter((id) => id != null))]
  for (const part of chunk(unique, 20)) {
    await Promise.all(part.map((id) => sheetName(sheet, id)))
  }
}

function etTime(spawn?: number, duration?: number): string | undefined {
  if (typeof spawn !== 'number' || typeof duration !== 'number') {
    return undefined
  }

  const end = (spawn + duration) % 24
  return `ET ${String(spawn).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`
}

function subCategory(stars: number): string {
  if (stars === 0) {
    return '魚'
  }
  if (stars === 4) {
    return 'オオヌシ'
  }
  return 'ヌシ'
}

function idFor(itemId: number) {
  return `source_fish_${itemId}`
}

function routeIdFor(itemId: number, index: number) {
  return `${idFor(itemId)}_route_${String(index + 1).padStart(2, '0')}`
}

async function spotCondition(spot: FishingSpot) {
  return {
    area: (await sheetName('PlaceName', spot.placeId)) ?? '',
    location: (await sheetName('PlaceName', spot.zoneId)) ?? '',
  }
}

async function specialFromSource(source: FishingSource, param: FishParameter, spot: FishingSpot) {
  const special: Record<string, unknown> = await spotCondition(spot)

  if (source.weathers?.length || source.weathersFrom?.length) {
    special.weather = {}
    if (source.weathersFrom?.length) {
      special.weather = {
        ...(special.weather as Record<string, unknown>),
        previous: await Promise.all(source.weathersFrom.map((id) => sheetName('Weather', id))),
      }
    }
    if (source.weathers?.length) {
      special.weather = {
        ...(special.weather as Record<string, unknown>),
        current: await Promise.all(source.weathers.map((id) => sheetName('Weather', id))),
      }
    }
  }

  const time = etTime(source.spawn, source.duration)
  if (time) {
    special.time = time
  }

  if (source.bait) {
    const baitName = await sheetName('Item', source.bait)
    special.bait = baitName
    special.mooch = baitName
  }

  if (source.predators?.length) {
    special.intuition = await Promise.all(
      source.predators.map(async (predator) => ({
        fish: (await sheetName('Item', predator.id)) ?? String(predator.id),
        count: predator.amount,
      })),
    )
  }

  if (param.folklore) {
    special.folklore = await sheetName('Item', param.folklore)
  }

  if (source.gig) {
    special.gig = String(source.gig)
  }

  if (typeof source.snagging === 'boolean') {
    special.snagging = source.snagging
  }

  if (source.fishEyes || source.fishEyesEnabled) {
    special.fishEyes = true
  }

  if (source.aLure) {
    special.surfaceSlap = String(source.aLure)
  }

  if (source.mLure) {
    special.prizeCatch = String(source.mLure)
  }

  return special
}

async function stepsFromSource(source: FishingSource, fishSet: Set<string>) {
  const steps: Array<{ type: string; target: string; count?: number }> = []

  if (source.bait) {
    steps.push({
      type: fishSet.has(String(source.bait)) ? 'mooch' : 'bait',
      target: (await sheetName('Item', source.bait)) ?? String(source.bait),
    })
  }

  if (source.predators?.length) {
    for (const predator of source.predators) {
      steps.push({
        type: 'intuition',
        target: (await sheetName('Item', predator.id)) ?? String(predator.id),
        count: predator.amount,
      })
    }
  }

  if (source.aLure) {
    steps.push({ type: 'surfaceSlap', target: String(source.aLure) })
  }

  if (source.mLure) {
    steps.push({ type: 'prizeCatch', target: String(source.mLure) })
  }

  if (source.gig) {
    steps.push({ type: 'gig', target: String(source.gig) })
  }

  return steps
}

function matchesMode(hasSources: boolean, hasSpots: boolean, mode: CliOptions['mode']) {
  if (mode === 'sources') {
    return hasSources
  }
  if (mode === 'spots') {
    return !hasSources && hasSpots
  }
  return hasSources || hasSpots
}

async function main() {
  const options = parseArgs()
  const [fishParam, fishingSources, fishingSpots, fishes] = await Promise.all([
    fetchJson<Record<string, FishParameter>>('fish-parameter.json'),
    fetchJson<Record<string, FishingSource[]>>('fishing-sources.json'),
    fetchJson<FishingSpot[]>('fishing-spots.json'),
    fetchJson<number[]>('fishes.json'),
  ])

  const fishSet = new Set(fishes.map(String))
  const spotById = new Map(fishingSpots.map((spot) => [spot.id, spot]))
  const spotsByFish: Record<string, FishingSpot[]> = {}
  for (const spot of fishingSpots) {
    for (const fishId of spot.fishes ?? []) {
      ;(spotsByFish[fishId] ??= []).push(spot)
    }
  }

  const raw = JSON.parse(await readFile(SOURCE_DICTIONARY_PATH, 'utf8')) as SourceDictionaryEntry[]
  const registeredIds = new Set(
    raw
      .filter((entry) => entry.type !== 'metadata' && entry.category1 === '魚' && entry.itemId != null)
      .map((entry) => String(entry.itemId)),
  )

  const candidates = Object.entries(fishParam)
    .filter(([id, param]) => {
      if (registeredIds.has(id)) {
        return false
      }
      if (param.stars < options.minStars || param.stars > options.maxStars) {
        return false
      }

      const hasSources = (fishingSources[id] ?? []).length > 0
      const hasSpots = (spotsByFish[id] ?? []).length > 0
      return matchesMode(hasSources, hasSpots, options.mode)
    })
    .sort(([a], [b]) => Number(a) - Number(b))

  const targetEntries =
    options.limit == null ? candidates : candidates.slice(0, options.limit)

  const itemRefs: number[] = []
  const weatherRefs: number[] = []
  const placeRefs: number[] = []

  for (const [id, param] of targetEntries) {
    itemRefs.push(Number(id))
    for (const source of fishingSources[id] ?? []) {
      if (source.bait) {
        itemRefs.push(source.bait)
      }
      if (param.folklore) {
        itemRefs.push(param.folklore)
      }
      for (const predator of source.predators ?? []) {
        itemRefs.push(predator.id)
      }
      for (const weatherId of source.weathers ?? []) {
        weatherRefs.push(weatherId)
      }
      for (const weatherId of source.weathersFrom ?? []) {
        weatherRefs.push(weatherId)
      }
      const spot = spotById.get(source.spot)
      if (spot) {
        placeRefs.push(spot.placeId, spot.zoneId)
      }
    }
    for (const spot of spotsByFish[id] ?? []) {
      placeRefs.push(spot.placeId, spot.zoneId)
    }
  }

  await preloadNames(itemRefs, 'Item')
  await preloadNames(weatherRefs, 'Weather')
  await preloadNames(placeRefs, 'PlaceName')

  const entries: SourceDictionaryEntry[] = []
  const holds: Array<{ itemId: number; name: string; reason: string }> = []

  for (const [id, param] of targetEntries) {
    const itemId = Number(id)
    const name = (await sheetName('Item', itemId)) ?? String(itemId)

    if (HOLD_NAMES.has(name)) {
      holds.push({ itemId, name, reason: 'manual_hold' })
      continue
    }

    const sources = fishingSources[id] ?? []
    const routes: SourceDictionaryRoute[] = []

    if (sources.length > 0 && options.mode !== 'spots') {
      let routeIndex = 0
      for (const source of sources) {
        const spot = spotById.get(source.spot)
        if (!spot) {
          continue
        }

        const special = await specialFromSource(source, param, spot)
        routes.push({
          routeId: routeIdFor(itemId, routeIndex),
          type: '釣り',
          contentName: String(special.area ?? ''),
          detail: String(special.location ?? ''),
          specialConditions: special,
          conditionSteps: await stepsFromSource(source, fishSet),
          sources: [
            {
              source: 'Teamcraft / XIVAPI',
              method: 'fish-parameter / fishing-sources',
              decision: '釣り条件をsource_dictionaryへ保存。',
            },
          ],
          needsReview: false,
        })
        routeIndex += 1
      }
    } else if (options.mode !== 'sources') {
      let routeIndex = 0
      for (const spot of spotsByFish[id] ?? []) {
        const special = await spotCondition(spot)
        routes.push({
          routeId: routeIdFor(itemId, routeIndex),
          type: '釣り',
          contentName: special.area,
          detail: special.location,
          specialConditions: special,
          conditionSteps: [],
          sources: [
            {
              source: 'Teamcraft / XIVAPI',
              method: 'fishing-spots fallback',
              decision:
                'fishing-sources未整備のためarea/locationのみ登録。餌・泳がせ・直感・伝承録は後日追加可能。',
            },
          ],
          needsReview: false,
        })
        routeIndex += 1
      }
    }

    if (routes.length === 0) {
      holds.push({ itemId, name, reason: 'no_routes' })
      continue
    }

    entries.push({
      id: idFor(itemId),
      itemId,
      name,
      category1: '魚',
      category2: '釣り',
      category: '釣り',
      subCategory: subCategory(param.stars),
      contentName: routes[0].contentName,
      updatedAt: UPDATED_AT,
      acquisitionRoutes: routes,
      status: 'confirmed',
    })
  }

  const summary = {
    options,
    candidates: candidates.length,
    processed: targetEntries.length,
    registered: entries.length,
    holds,
    withFishingSources: entries.filter((entry) =>
      entry.acquisitionRoutes.some((route) => route.sources[0]?.method.includes('fishing-sources')),
    ).length,
    fallback: entries.filter((entry) =>
      entry.acquisitionRoutes.some((route) => route.sources[0]?.method.includes('fallback')),
    ).length,
    bySubCategory: entries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.subCategory] = (acc[entry.subCategory] ?? 0) + 1
      return acc
    }, {}),
    existingFish: registeredIds.size,
    totalFishAfter: registeredIds.size + entries.length,
  }

  console.log(JSON.stringify(summary, null, 2))

  if (options.dryRun) {
    return
  }

  const withoutNewFish = raw.filter((entry) => !(entry.type !== 'metadata' && entry.id.startsWith('source_fish_')))
  const existingFish = raw.filter((entry) => entry.type !== 'metadata' && entry.id.startsWith('source_fish_'))
  const mergedFishIds = new Set(existingFish.map((entry) => entry.id))
  const newEntries = entries.filter((entry) => !mergedFishIds.has(entry.id))

  withoutNewFish.push(...existingFish, ...newEntries)
  await writeFile(SOURCE_DICTIONARY_PATH, `${JSON.stringify(withoutNewFish, null, 2)}\n`, 'utf8')
}

await main()
