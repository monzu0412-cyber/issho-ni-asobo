import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type CollectEmote = {
  id: number
  name: string
  command: string
  patch: string
  item_id: number | null
  category: { id: number; name: string }
  sources: Array<{
    type: string
    text: string
    related_type: string | null
    related_id: number | null
  }>
}

type SourceDictionaryRoute = {
  routeId: string
  type: string
  contentName: string
  detail?: string
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
  type?: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SOURCE_DICTIONARY_PATH = resolve(ROOT, 'src/data/reverse-search/manual/source_dictionary.json')
const UPDATED_AT = '2026-06-13T00:00:00+09:00'
const REGISTERED_EMOTE_ITEM_ID = 24222
const WATCH_PENDING_RELEASE_COLLECT_IDS = new Set([297, 314, 315, 316])

const COLLECT_TYPE_TO_ROUTE_TYPE: Record<string, string> = {
  Quest: 'クエスト',
  Achievement: 'アチーブメント',
  Event: 'イベント',
  Premium: '課金',
  FATE: 'FATE',
  Hunts: 'モブハント',
  PvP: 'PvP',
  Crafting: 'クラフト',
  Gathering: '採集',
  Purchase: 'NPC購入',
  'Treasure Hunt': '宝の地図',
  'Island Sanctuary': '無人島',
  'Gold Saucer': 'ゴールドソーサー',
  Trial: '直ドロップ',
  Raid: '直ドロップ',
  Dungeon: 'ID',
  Vendor: 'NPC購入',
  'Seasonal Event': 'イベント',
  'Deep Dungeon': 'ディープダンジョン',
  'Custom Delivery': 'クエスト',
  'Wondrous Tails': 'その他',
  Limited: '特典',
  'Online Store': '課金',
  'Cosmic Exploration': '探索',
  Bozja: '探索',
  Eureka: '探索',
  Tribal: '友好部族',
  'V&C Dungeon': 'ヴァリアント',
  Voyages: '潜水艦/飛空艇',
  Skybuilders: 'ギャザクラ',
  Other: 'その他',
  'Occult Crescent': '探索',
}

const COLLECT_TYPE_TO_CATEGORY2: Record<string, string> = {
  Quest: 'クエスト',
  Achievement: 'その他',
  Event: 'イベント',
  Premium: '課金',
  FATE: 'FATE',
  Hunts: 'モブハント',
  PvP: 'PvP',
  Crafting: 'クラフト',
  Gathering: '採集',
  Purchase: '交換',
  'Treasure Hunt': 'トレジャーハント',
  'Island Sanctuary': 'その他',
  'Gold Saucer': 'イベント',
  Trial: '討滅戦',
  Raid: 'レイド',
  Dungeon: 'ID',
  Vendor: '交換',
  'Seasonal Event': 'イベント',
  'Deep Dungeon': 'その他',
  'Custom Delivery': 'クエスト',
  'Wondrous Tails': 'その他',
  Limited: '特典',
  'Cosmic Exploration': 'その他',
  Bozja: 'その他',
  Eureka: 'その他',
  Tribal: 'その他',
  'V&C Dungeon': 'その他',
  Voyages: 'その他',
  Skybuilders: 'クラフト',
  Other: 'その他',
  'Occult Crescent': 'その他',
}

async function fetchAllEmoteNames(language: 'ja' | 'en') {
  const map = new Map<number, string>()
  let after: number | null = null

  while (true) {
    let url = `https://v2.xivapi.com/api/sheet/Emote?limit=500&language=${language}&fields=Name`
    if (after !== null) {
      url += `&after=${after}`
    }

    const response = await fetch(url)
    const payload = (await response.json()) as {
      rows: Array<{ row_id: number; fields?: { Name?: string } }>
    }
    const rows = payload.rows ?? []

    if (rows.length === 0) {
      break
    }

    for (const row of rows) {
      const name = row.fields?.Name?.trim()
      if (name) {
        map.set(row.row_id, name)
      }
    }

    after = rows[rows.length - 1].row_id
    if (rows.length < 500) {
      break
    }
  }

  return map
}

function mapRouteType(collectType: string) {
  return COLLECT_TYPE_TO_ROUTE_TYPE[collectType] ?? 'その他'
}

function mapCategory2(collectType: string) {
  return COLLECT_TYPE_TO_CATEGORY2[collectType] ?? 'その他'
}

function buildRoutes(collectId: number, emote: CollectEmote, watchPendingRelease: boolean): SourceDictionaryRoute[] {
  if (!emote.sources?.length) {
    if (watchPendingRelease) {
      return [
        {
          routeId: `source_emote_${collectId}_route_01`,
          type: 'その他',
          contentName: '未配布',
          detail: '入手経路未公開',
          sources: [
            {
              source: 'Phase E-3 audit',
              method: 'watch_pending_release',
              decision: 'Patch 7.5 datamined; Collect sources empty; not yet obtainable',
            },
          ],
          needsReview: false,
        },
      ]
    }

    return [
      {
        routeId: `source_emote_${collectId}_route_01`,
        type: 'その他',
        contentName: 'Unresolved',
        detail: 'Collect sources unavailable',
        sources: [
          {
            source: 'FFXIV Collect',
            method: 'phase-e-1 import',
            decision: 'Collect API returned no sources; deferred to review queue',
          },
        ],
        needsReview: true,
      },
    ]
  }

  return emote.sources.map((source, index) => ({
    routeId: `source_emote_${collectId}_route_${String(index + 1).padStart(2, '0')}`,
    type: mapRouteType(source.type),
    contentName: source.text,
    detail: source.text,
    sources: [
      {
        source: 'FFXIV Collect',
        method: 'phase-e-1 auto import',
        decision: 'Phase E-1 auto import from Collect /emotes',
      },
    ],
    needsReview: false,
  }))
}

function buildEmoteEntry(
  emote: CollectEmote,
  emoteJa: string,
  emoteEn: string,
  watchPendingRelease: boolean,
): SourceDictionaryEntry {
  const routes = buildRoutes(emote.id, emote, watchPendingRelease)
  const primarySourceType = emote.sources?.[0]?.type ?? 'Other'

  return {
    id: `source_emote_${emote.id}`,
    itemId: emote.item_id,
    name: emoteJa || emoteEn || emote.name,
    category1: 'エモート',
    category2: mapCategory2(primarySourceType),
    category: '収集',
    subCategory: 'エモート',
    contentName: routes[0]?.contentName ?? null,
    updatedAt: UPDATED_AT,
    acquisitionRoutes: routes,
    status: watchPendingRelease ? 'watch_pending_release' : 'confirmed',
  }
}

async function main() {
  console.log('Fetching Collect emotes and XIVAPI Emote names...')
  const [collectPayload, emoteJaById, emoteEnById, rawDictionary] = await Promise.all([
    fetch('https://ffxivcollect.com/api/emotes').then((response) => response.json()) as Promise<{
      results: CollectEmote[]
    }>,
    fetchAllEmoteNames('ja'),
    fetchAllEmoteNames('en'),
    readFile(SOURCE_DICTIONARY_PATH, 'utf8'),
  ])

  const collectEmotes = collectPayload.results
  const collectById = new Map(collectEmotes.map((emote) => [emote.id, emote]))
  const dictionary = JSON.parse(rawDictionary) as Array<SourceDictionaryEntry | { type: string }>
  const existingIds = new Set(
    dictionary.filter((entry) => entry.type !== 'metadata').map((entry) => (entry as SourceDictionaryEntry).id),
  )

  const newEntries: SourceDictionaryEntry[] = []
  let autoCount = 0
  let watchCount = 0
  let updatedCount = 0

  for (const emote of collectEmotes) {
    if (emote.item_id === REGISTERED_EMOTE_ITEM_ID || emote.id === 188) {
      continue
    }

    const entryId = `source_emote_${emote.id}`
    if (existingIds.has(entryId)) {
      continue
    }

    const watchPendingRelease = WATCH_PENDING_RELEASE_COLLECT_IDS.has(emote.id)
    const emoteJa = emoteJaById.get(emote.id) ?? ''
    const emoteEn = emoteEnById.get(emote.id) ?? emote.name

    if (!emoteJa) {
      throw new Error(`Missing XIVAPI Emote.Name (ja) for collect id ${emote.id}`)
    }

    newEntries.push(buildEmoteEntry(emote, emoteJa, emoteEn, watchPendingRelease))

    if (watchPendingRelease) {
      watchCount += 1
    } else {
      autoCount += 1
    }
  }

  const updatedDictionary = dictionary.map((entry) => {
    if (entry.type === 'metadata') {
      return entry
    }

    const sourceEntry = entry as SourceDictionaryEntry
    if (sourceEntry.id === 'source_24222') {
      return {
        ...sourceEntry,
        name: emoteJaById.get(188) ?? '確認',
        updatedAt: UPDATED_AT,
      }
    }

    if (!sourceEntry.id.startsWith('source_emote_')) {
      return entry
    }

    const collectId = Number.parseInt(sourceEntry.id.replace('source_emote_', ''), 10)
    const emote = collectById.get(collectId)
    if (!emote) {
      return entry
    }

    const watchPendingRelease = WATCH_PENDING_RELEASE_COLLECT_IDS.has(collectId)
    const emoteJa = emoteJaById.get(collectId) ?? sourceEntry.name
    const emoteEn = emoteEnById.get(collectId) ?? emote.name

    updatedCount += 1
    return buildEmoteEntry(emote, emoteJa, emoteEn, watchPendingRelease)
  })

  updatedDictionary.push(...newEntries)

  await writeFile(SOURCE_DICTIONARY_PATH, `${JSON.stringify(updatedDictionary, null, 2)}\n`, 'utf8')

  console.log(`Added ${newEntries.length} emote entries`)
  console.log(`Updated ${updatedCount} existing emote entries`)
  console.log(`Auto confirmed: ${autoCount}`)
  console.log(`Watch pending release: ${watchCount}`)
  console.log('Updated source_24222 display name to 確認')
}

await main()
