import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const OUTPUT_DIR = resolve(__dirname, 'output')

const TEAMCRAFT =
  'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/items.json'

const ROUTE_TYPE_MAP: Record<string, string> = {
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
}

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
    related_type: string
    related_id: number
  }>
}

type EmoteRow = {
  collectId: number
  collectNameEn: string
  command: string
  itemId: number | null
  patch: string
  category: string
  emoteJa: string
  emoteEn: string
  emoteCatJa: string
  itemJa: string
  itemEn: string
  itemBookJa: string
  nameMismatch: boolean
  displayRecommendation: string
  displayRationale: string
  searchNames: string[]
  sourceCount: number
  routes: Array<{
    type: string
    mappedType: string | null
    text: string
    contentJa: string | null
    related_type: string
    related_id: number
  }>
  autoSafe: boolean
  manualReasons: string[]
}

async function fetchAllEmotes(language: 'ja' | 'en') {
  const map = new Map<number, { name: string; category: string }>()
  let after: number | null = null

  while (true) {
    let url = `https://v2.xivapi.com/api/sheet/Emote?limit=500&language=${language}&fields=Name,EmoteCategory.Name`
    if (after !== null) {
      url += `&after=${after}`
    }

    const response = await fetch(url)
    const payload = (await response.json()) as {
      rows: Array<{
        row_id: number
        fields?: {
          Name?: string
          EmoteCategory?: { fields?: { Name?: string } }
        }
      }>
    }

    const rows = payload.rows ?? []
    if (rows.length === 0) {
      break
    }

    for (const row of rows) {
      map.set(row.row_id, {
        name: row.fields?.Name?.trim() ?? '',
        category: row.fields?.EmoteCategory?.fields?.Name?.trim() ?? '',
      })
    }

    after = rows[rows.length - 1].row_id
    if (rows.length < 500) {
      break
    }
  }

  return map
}

function stripEmoteBookPrefix(name: string) {
  if (name.startsWith('演技教本:')) {
    return name.slice('演技教本:'.length)
  }

  if (name.startsWith('Emote:')) {
    return name.slice('Emote:'.length).trim()
  }

  return name
}

function buildSearchNames(input: {
  emoteJa: string
  emoteEn: string
  itemJa: string
  itemEn: string
  itemBookJa: string
  command: string
  collectNameEn: string
}) {
  const tokens = new Set<string>()

  for (const value of [
    input.emoteJa,
    input.emoteEn,
    input.itemJa,
    input.itemEn,
    input.itemBookJa,
    input.collectNameEn,
    input.command.replace(/^\//, ''),
  ]) {
    if (value) {
      tokens.add(value)
    }
  }

  return [...tokens]
}

async function main() {
  const contentDictionary = JSON.parse(
    readFileSync(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8'),
  ) as Array<{ type?: string; en: string; ja: string }>
  const contentJa = new Map(
    contentDictionary.filter((entry) => entry.type !== 'metadata').map((entry) => [entry.en, entry.ja]),
  )

  const sourceDictionary = JSON.parse(
    readFileSync(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8'),
  ) as Array<{ category1?: string; itemId?: number | null }>
  const registeredItemIds = new Set(
    sourceDictionary
      .filter((entry) => entry.category1 === 'エモート')
      .map((entry) => entry.itemId)
      .filter((itemId): itemId is number => typeof itemId === 'number'),
  )

  const [collectEmotes, teamcraftRaw, xivJa, xivEn] = await Promise.all([
    fetch('https://ffxivcollect.com/api/emotes').then((response) => response.json()) as Promise<{
      results: CollectEmote[]
    }>,
    fetch(TEAMCRAFT).then((response) => response.json()) as Promise<
      Record<string, { en?: string; ja?: string }>
    >,
    fetchAllEmotes('ja'),
    fetchAllEmotes('en'),
  ])

  const teamcraftById = new Map(
    Object.entries(teamcraftRaw).map(([id, item]) => [
      Number(id),
      { en: item.en?.trim() ?? '', ja: item.ja?.trim() ?? '' },
    ]),
  )

  const targets = collectEmotes.results.filter((emote) => !registeredItemIds.has(emote.item_id ?? -1))

  const stats = {
    itemIdYes: 0,
    itemIdNo: 0,
    hasSources: 0,
    noSources: 0,
    emoteJaAvailable: 0,
    emoteJaMissing: 0,
    itemJaAvailable: 0,
    itemJaMissing: 0,
    nameMismatch: 0,
    nameMatch: 0,
    autoSafe: 0,
    manualReview: 0,
    routeTypeMapped: 0,
    routeContentInDict: 0,
    routeContentMissing: 0,
    sourceTypes: {} as Record<string, number>,
    routeTypeCounts: {} as Record<string, number>,
    collectCategories: {} as Record<string, number>,
  }

  const rows: EmoteRow[] = []

  for (const emote of targets) {
    const emoteJa = xivJa.get(emote.id)?.name ?? ''
    const emoteEn = xivEn.get(emote.id)?.name ?? emote.name
    const emoteCatJa = xivJa.get(emote.id)?.category ?? ''
    const hasItemId = emote.item_id !== null
    const item = hasItemId ? teamcraftById.get(emote.item_id) : undefined
    const itemJa = item?.ja ?? ''
    const itemEn = item?.en ?? ''
    const itemBookJa = stripEmoteBookPrefix(itemJa)
    const hasSources = Array.isArray(emote.sources) && emote.sources.length > 0
    const mismatch = hasItemId && Boolean(emoteJa && itemBookJa && emoteJa !== itemBookJa)

    if (hasItemId) {
      stats.itemIdYes += 1
    } else {
      stats.itemIdNo += 1
    }

    if (hasSources) {
      stats.hasSources += 1
    } else {
      stats.noSources += 1
    }

    if (emoteJa) {
      stats.emoteJaAvailable += 1
    } else {
      stats.emoteJaMissing += 1
    }

    if (hasItemId) {
      if (itemJa && itemJa !== itemEn) {
        stats.itemJaAvailable += 1
      } else {
        stats.itemJaMissing += 1
      }
    }

    if (hasItemId && emoteJa && itemBookJa) {
      if (mismatch) {
        stats.nameMismatch += 1
      } else {
        stats.nameMatch += 1
      }
    }

    const routes: EmoteRow['routes'] = []
    let autoSafe = true
    const manualReasons = new Set<string>()

    for (const source of emote.sources ?? []) {
      stats.sourceTypes[source.type] = (stats.sourceTypes[source.type] ?? 0) + 1
      stats.routeTypeCounts[source.type] = (stats.routeTypeCounts[source.type] ?? 0) + 1

      const mappedType = ROUTE_TYPE_MAP[source.type] ?? null
      if (mappedType) {
        stats.routeTypeMapped += 1
      } else {
        autoSafe = false
        manualReasons.add(`unknown_route_type:${source.type}`)
      }

      const contentJaValue = contentJa.get(source.text) ?? null
      if (contentJaValue) {
        stats.routeContentInDict += 1
      } else {
        stats.routeContentMissing += 1
        autoSafe = false
        manualReasons.add(`missing_content_translation:${source.text}`)
      }

      routes.push({
        type: source.type,
        mappedType,
        text: source.text,
        contentJa: contentJaValue,
        related_type: source.related_type,
        related_id: source.related_id,
      })
    }

    if (!hasSources) {
      autoSafe = false
      manualReasons.add('no_sources')
    }

    if (!emoteJa) {
      autoSafe = false
      manualReasons.add('missing_emote_ja')
    }

    if (hasItemId && !itemJa) {
      autoSafe = false
      manualReasons.add('missing_item_ja')
    }

    const displayRationale = !hasItemId
      ? 'item_idなし → エモート本体名のみ'
      : mismatch
        ? '教本名と本体名が不一致 → 表示は本体名、検索に教本名も含める'
        : '教本名と本体名が一致'

    if (autoSafe) {
      stats.autoSafe += 1
    } else {
      stats.manualReview += 1
    }

    stats.collectCategories[emote.category?.name ?? 'unknown'] =
      (stats.collectCategories[emote.category?.name ?? 'unknown'] ?? 0) + 1

    rows.push({
      collectId: emote.id,
      collectNameEn: emote.name,
      command: emote.command,
      itemId: emote.item_id,
      patch: emote.patch,
      category: emote.category?.name ?? '',
      emoteJa,
      emoteEn,
      emoteCatJa,
      itemJa,
      itemEn,
      itemBookJa,
      nameMismatch: mismatch,
      displayRecommendation: emoteJa || itemJa || emote.name,
      displayRationale,
      searchNames: buildSearchNames({
        emoteJa,
        emoteEn,
        itemJa,
        itemEn,
        itemBookJa,
        command: emote.command,
        collectNameEn: emote.name,
      }),
      sourceCount: emote.sources?.length ?? 0,
      routes,
      autoSafe,
      manualReasons: [...manualReasons],
    })
  }

  rows.sort((left, right) => left.collectId - right.collectId)

  const missingContent = [
    ...new Set(rows.flatMap((row) => row.routes.filter((route) => !route.contentJa).map((route) => route.text))),
  ].sort()

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCollect: collectEmotes.results.length,
      alreadyRegistered: registeredItemIds.size,
      targetCount: targets.length,
      itemIdYes: stats.itemIdYes,
      itemIdNo: stats.itemIdNo,
      hasSources: stats.hasSources,
      noSources: stats.noSources,
      emoteJaAvailable: stats.emoteJaAvailable,
      emoteJaMissing: stats.emoteJaMissing,
      itemJaAvailable: stats.itemJaAvailable,
      itemJaMissing: stats.itemJaMissing,
      nameMismatchWithItem: stats.nameMismatch,
      nameMatchWithItem: stats.nameMatch,
      autoSafe: stats.autoSafe,
      manualReview: stats.manualReview,
      routeTypeMappedEvents: stats.routeTypeMapped,
      routeContentInDictEvents: stats.routeContentInDict,
      routeContentMissingEvents: stats.routeContentMissing,
      uniqueMissingContentTranslations: missingContent.length,
    },
    sourceTypeDistribution: stats.sourceTypes,
    routeTypeCounts: stats.routeTypeCounts,
    collectCategoryDistribution: stats.collectCategories,
    displayNamePolicy: {
      existingRegisteredExample: {
        collectId: 188,
        itemId: 24222,
        emoteJa: '確認',
        itemJa: '演技教本:確認',
        sourceDictionaryUses: '演技教本:確認',
      },
      recommendation:
        '表示名=エモート本体JP名（XIVAPI Emote.Name, collect.id=row_id）。item_idあり件は演技教本名をsearchNamesへ。',
      mismatchCount: stats.nameMismatch,
    },
    missingContentTranslationsAll: missingContent,
    items: rows,
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(resolve(OUTPUT_DIR, 'phase-e-emote-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(
    resolve(OUTPUT_DIR, 'phase-e-emote-list.txt'),
    `${rows
      .map((row) =>
        [
          row.collectId,
          row.itemId ?? '-',
          row.emoteJa || '?',
          row.itemJa || '-',
          row.nameMismatch ? 'M' : '=',
          row.autoSafe ? 'AUTO' : 'MANUAL',
          row.routes[0]?.type ?? 'no-src',
        ].join('\t'),
      )
      .join('\n')}\n`,
    'utf8',
  )

  console.log(JSON.stringify(report.summary, null, 2))
  console.log(
    'mismatch examples',
    rows
      .filter((row) => row.nameMismatch)
      .slice(0, 10)
      .map((row) => ({ id: row.collectId, emote: row.emoteJa, book: row.itemBookJa, itemJa: row.itemJa })),
  )

  const reasonCounts: Record<string, number> = {}
  for (const row of rows) {
    for (const reason of row.manualReasons) {
      const key = reason.split(':')[0]
      reasonCounts[key] = (reasonCounts[key] ?? 0) + 1
    }
  }

  console.log('manual reason counts', reasonCounts)
  console.log(
    'no sources',
    rows.filter((row) => row.sourceCount === 0).map((row) => ({ id: row.collectId, name: row.emoteJa || row.collectNameEn })),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
