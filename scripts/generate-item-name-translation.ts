import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type SourceDictionaryEntry = {
  id: string
  itemId: number | null
  name: string
  category1: string
}

type TeamcraftItem = {
  en?: string
  ja?: string
}

export type ItemNameDictionaryEntry = {
  sourceDictionaryId: string
  itemId: number | null
  category1: string
  en: string
  ja: string
  searchNames: string[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const SOURCE_DICTIONARY_PATH = resolve(MANUAL_DIR, 'source_dictionary.json')
const OUTPUT_PATH = resolve(MANUAL_DIR, 'item_name_dictionary.json')
const TEAMCRAFT_ITEMS_URL =
  'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/items.json'

const PHASE1_ITEM_CATEGORIES = ['髪型', 'ファッションアクセサリー', 'ミニオン', '譜面', '魚'] as const
const ENGLISH_KEEP_NAMES = new Set(['Nano Lord'])
const XIVAPI_MOUNT_SHEET_URL =
  'https://v2.xivapi.com/api/sheet/Mount?limit=500&fields=Singular&language='

type MountSheetRow = {
  row_id: number
  fields?: {
    Singular?: string
  }
}

function extractCollectMountId(sourceDictionaryId: string) {
  const match = sourceDictionaryId.match(/^source_mount_(\d+)$/)

  return match ? Number(match[1]) : null
}

function extractCollectEmoteId(sourceDictionaryId: string) {
  const match = sourceDictionaryId.match(/^source_emote_(\d+)$/)

  return match ? Number(match[1]) : null
}

const REGISTERED_LEGACY_EMOTE = {
  sourceDictionaryId: 'source_24222',
  collectId: 188,
  itemId: 24222,
} as const

type CollectEmoteRecord = {
  id: number
  name: string
  command: string
  item_id: number | null
}

async function fetchEmoteNameByRowId(language: 'en' | 'ja') {
  const nameByRowId = new Map<number, string>()
  let after: number | null = null

  while (true) {
    let url = `https://v2.xivapi.com/api/sheet/Emote?limit=500&fields=Name&language=${language}`
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
        nameByRowId.set(row.row_id, name)
      }
    }

    after = rows[rows.length - 1].row_id
    if (rows.length < 500) {
      break
    }
  }

  return nameByRowId
}

async function fetchCollectEmotes() {
  const response = await fetch('https://ffxivcollect.com/api/emotes')
  const payload = (await response.json()) as { results: CollectEmoteRecord[] }

  const byCollectId = new Map<number, CollectEmoteRecord>()
  const byItemId = new Map<number, CollectEmoteRecord>()

  for (const emote of payload.results ?? []) {
    byCollectId.set(emote.id, emote)
    if (emote.item_id !== null) {
      byItemId.set(emote.item_id, emote)
    }
  }

  return { byCollectId, byItemId }
}

export function buildEmoteSearchNames(input: {
  emoteJa: string
  emoteEn: string
  itemJa?: string
  itemEn?: string
  collectEn?: string
  command?: string
  legacyBookJa?: string
}) {
  const tokens = new Set<string>()

  addSearchToken(tokens, input.emoteJa)
  addSearchToken(tokens, input.emoteEn)
  addSearchToken(tokens, input.itemJa)
  addSearchToken(tokens, input.itemEn)
  addSearchToken(tokens, input.collectEn)
  addSearchToken(tokens, input.legacyBookJa)

  if (input.itemJa?.startsWith('演技教本:')) {
    addSearchToken(tokens, input.itemJa.slice('演技教本:'.length))
  }

  if (input.command) {
    for (const part of input.command.split(',')) {
      const trimmed = part.trim()
      addSearchToken(tokens, trimmed)
      addSearchToken(tokens, trimmed.replace(/^\//, ''))
    }
  }

  return [...tokens]
}

async function fetchMountSingularByRowId(language: 'en' | 'ja') {
  const response = await fetch(`${XIVAPI_MOUNT_SHEET_URL}${language}`)
  const payload = (await response.json()) as { rows: MountSheetRow[] }
  const singularByRowId = new Map<number, string>()

  for (const row of payload.rows ?? []) {
    const singular = row.fields?.Singular?.trim()

    if (singular) {
      singularByRowId.set(row.row_id, singular)
    }
  }

  return singularByRowId
}

export function buildMountBodySearchNames(
  collectNameEn: string,
  mountSingularJa: string,
  mountSingularEn: string | null | undefined,
  unlockItemEn: string | null | undefined,
  unlockItemJa: string | null | undefined,
) {
  const tokens = new Set<string>()

  addSearchToken(tokens, mountSingularJa)
  addSearchToken(tokens, collectNameEn)
  addSearchToken(tokens, mountSingularEn ?? undefined)
  addSearchToken(tokens, unlockItemEn ?? undefined)
  addSearchToken(tokens, unlockItemJa ?? undefined)

  for (const separator of ['・']) {
    if (!mountSingularJa.includes(separator)) {
      continue
    }

    const [before, ...rest] = mountSingularJa.split(separator)
    addSearchToken(tokens, before)
    addSearchToken(tokens, rest.join(separator))
  }

  return [...tokens]
}

const PHASE2_STEP_B_MOUNT_DISPLAY_NAMES = new Map<string, string>([
  ['Forgiven Mimicry', 'フォーギヴン・ミミクリー'],
  ['UFO', 'UFO？'],
  ['Set of Ceruleum Balloons', 'セルリウム・バルーン'],
  ['Jibanyan Couch', 'ジバニャンソファ'],
  ['Broken Heart (left)', 'フライング・レフトハート'],
  ['Broken Heart (right)', 'フライング・ライトハート'],
  ['Midgardsormr', 'ミドガルズオルム'],
])

function isPhase2AutoSafeMount(
  mountSingularJa: string | null | undefined,
  unlockItemJa: string | null | undefined,
) {
  return Boolean(
    mountSingularJa &&
      isJapaneseText(mountSingularJa) &&
      unlockItemJa &&
      mountSingularJa !== unlockItemJa,
  )
}

function stripExpansionOrchestrionEn(enName: string) {
  return enName.replace(/ \((Shadowbringers|Endwalker)\) Orchestrion Roll$/, ' Orchestrion Roll')
}

function extractExpansionOrchestrionLabel(enName: string) {
  const match = enName.match(/ \((Shadowbringers|Endwalker)\) Orchestrion Roll$/)

  return match?.[1]
}

function stripAsciiDiacritics(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

export function buildExpansionOrchestrionSearchNames(collectEn: string, altEn: string, jaName: string) {
  const tokens = new Set<string>()

  addSearchToken(tokens, jaName)
  addSearchToken(tokens, collectEn)
  addSearchToken(tokens, altEn)
  addSearchToken(tokens, 'オーケストリオン譜')
  addSearchToken(tokens, 'オーケストリオン')

  const jaSongPart = extractJaOrchestrionSongPart(jaName)
  addSearchToken(tokens, jaSongPart)

  const jaSongWithoutParenthetical = stripJaParentheticalSuffix(jaSongPart)
  if (jaSongWithoutParenthetical !== jaSongPart) {
    addSearchToken(tokens, jaSongWithoutParenthetical)
  }

  for (const enVariant of [collectEn, altEn]) {
    const enSongTitle = stripOrchestrionRollSuffix(enVariant)
    addSearchToken(tokens, enSongTitle)

    const enSongWithoutParenthetical = stripEnParentheticalSuffix(enSongTitle)
    if (enSongWithoutParenthetical !== enSongTitle) {
      addSearchToken(tokens, enSongWithoutParenthetical)
    }
  }

  const expansionLabel = extractExpansionOrchestrionLabel(collectEn)
  if (expansionLabel) {
    addSearchToken(tokens, expansionLabel)
  }

  return [...tokens]
}

export function buildMinionItemIdSearchNames(collectEn: string, jaName: string, itemEn: string | null | undefined) {
  const tokens = new Set<string>()

  addSearchToken(tokens, jaName)
  addSearchToken(tokens, collectEn)
  addSearchToken(tokens, itemEn ?? undefined)

  const asciiCollectEn = stripAsciiDiacritics(collectEn)
  if (asciiCollectEn !== collectEn) {
    addSearchToken(tokens, asciiCollectEn)
  }

  for (const separator of ['・']) {
    if (!jaName.includes(separator)) {
      continue
    }

    const [before, ...rest] = jaName.split(separator)
    addSearchToken(tokens, before)
    addSearchToken(tokens, rest.join(separator))
  }

  return [...tokens]
}

function stripOrchestrionRollSuffix(enName: string) {
  return enName.replace(/ Orchestrion Roll$/i, '').trim()
}

function stripEnParentheticalSuffix(value: string) {
  return value.replace(/ \([^)]+\)$/, '').trim()
}

function stripJaParentheticalSuffix(value: string) {
  return value.replace(/[（(][^）)]+[）)]$/, '').trim()
}

function extractJaOrchestrionSongPart(jaName: string) {
  const match = jaName.match(/^オーケストリオン譜[:：](.+)$/)

  return match?.[1]?.trim() ?? jaName
}

function isJapaneseText(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function addSearchToken(tokens: Set<string>, value: string | undefined) {
  const trimmed = value?.trim()

  if (trimmed && trimmed.length >= 2) {
    tokens.add(trimmed)
  }
}

export function buildItemSearchNames(enName: string, jaName: string, category1: string) {
  const tokens = new Set<string>()

  addSearchToken(tokens, jaName)
  addSearchToken(tokens, enName)

  for (const separator of [':', '：', '・']) {
    if (!jaName.includes(separator)) {
      continue
    }

    const [before, ...rest] = jaName.split(separator)
    addSearchToken(tokens, before)
    addSearchToken(tokens, rest.join(separator))
  }

  if (category1 === 'ミニオン' && /^Wind-up /i.test(enName)) {
    addSearchToken(tokens, 'Wind-up')
    addSearchToken(tokens, enName.replace(/^Wind-up /i, '').trim())
  }

  if (category1 === '譜面') {
    addSearchToken(tokens, 'オーケストリオン譜')
    addSearchToken(tokens, 'オーケストリオン')

    const enSongTitle = stripOrchestrionRollSuffix(enName)
    addSearchToken(tokens, enSongTitle)

    const jaSongPart = extractJaOrchestrionSongPart(jaName)
    addSearchToken(tokens, jaSongPart)

    const enSongWithoutParenthetical = stripEnParentheticalSuffix(enSongTitle)
    if (enSongWithoutParenthetical !== enSongTitle) {
      addSearchToken(tokens, enSongWithoutParenthetical)
    }

    const jaSongWithoutParenthetical = stripJaParentheticalSuffix(jaSongPart)
    if (jaSongWithoutParenthetical !== jaSongPart) {
      addSearchToken(tokens, jaSongWithoutParenthetical)
    }
  }

  if (enName.includes(' - ')) {
    const parts = enName.split(' - ').map((part) => part.trim())

    for (const part of parts) {
      addSearchToken(tokens, part)
    }

    if (parts.length >= 2) {
      addSearchToken(tokens, parts.slice(1).join(' - '))
    }
  }

  if (category1 === '髪型' && /Modern Aesthetics/i.test(enName)) {
    addSearchToken(tokens, 'Modern Aesthetics')
    addSearchToken(tokens, 'ヘアカタログ')
  }

  return [...tokens]
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(SOURCE_DICTIONARY_PATH, 'utf8')) as Array<
    SourceDictionaryEntry & { type?: string }
  >

  console.log('Fetching Teamcraft items...')
  const teamcraftItems = JSON.parse(await fetch(TEAMCRAFT_ITEMS_URL).then((response) => response.text())) as Record<
    string,
    TeamcraftItem
  >

  const teamcraftByEn = new Map<string, TeamcraftItem>()
  const teamcraftById = new Map<number, TeamcraftItem>()
  for (const [id, item] of Object.entries(teamcraftItems)) {
    if (item?.en) {
      teamcraftByEn.set(item.en.trim(), item)
    }

    teamcraftById.set(Number(id), item)
  }

  console.log('Fetching XIVAPI Mount sheet (en/ja)...')
  const [mountSingularJaByRowId, mountSingularEnByRowId, emoteJaByRowId, emoteEnByRowId, collectEmotes] =
    await Promise.all([
      fetchMountSingularByRowId('ja'),
      fetchMountSingularByRowId('en'),
      fetchEmoteNameByRowId('ja'),
      fetchEmoteNameByRowId('en'),
      fetchCollectEmotes(),
    ])

  const entries: ItemNameDictionaryEntry[] = []
  const skipped: Array<{ name: string; category1: string; reason: string }> = []
  const usedSourceDictionaryIds = new Set<string>()

  for (const entry of sourceDictionary) {
    if (entry.type === 'metadata' || !PHASE1_ITEM_CATEGORIES.includes(entry.category1 as typeof PHASE1_ITEM_CATEGORIES[number])) {
      continue
    }

    const enName = entry.name.trim()

    if (ENGLISH_KEEP_NAMES.has(enName)) {
      entries.push({
        sourceDictionaryId: entry.id,
        itemId: entry.itemId,
        category1: entry.category1,
        en: enName,
        ja: enName,
        searchNames: [enName],
      })
      usedSourceDictionaryIds.add(entry.id)
      continue
    }

    if (isJapaneseText(enName)) {
      skipped.push({ name: enName, category1: entry.category1, reason: 'already_japanese' })
      continue
    }

    const teamcraftItem = teamcraftByEn.get(enName)
    let jaName = teamcraftItem?.ja?.trim()

    if (!jaName && entry.category1 === '譜面') {
      const altEn = stripExpansionOrchestrionEn(enName)
      const altTeamcraftItem = altEn !== enName ? teamcraftByEn.get(altEn) : undefined
      jaName = altTeamcraftItem?.ja?.trim()

      if (jaName && jaName !== altTeamcraftItem?.en?.trim()) {
        entries.push({
          sourceDictionaryId: entry.id,
          itemId: entry.itemId,
          category1: entry.category1,
          en: enName,
          ja: jaName,
          searchNames: buildExpansionOrchestrionSearchNames(enName, altEn, jaName),
        })
        usedSourceDictionaryIds.add(entry.id)
        continue
      }
    }

    if (!jaName && (entry.category1 === 'ミニオン' || entry.category1 === '魚') && entry.itemId) {
      const itemById = teamcraftById.get(entry.itemId)
      const itemJa = itemById?.ja?.trim()
      const itemEn = itemById?.en?.trim()

      if (itemJa && itemJa !== itemEn) {
        entries.push({
          sourceDictionaryId: entry.id,
          itemId: entry.itemId,
          category1: entry.category1,
          en: enName,
          ja: itemJa,
          searchNames: buildMinionItemIdSearchNames(enName, itemJa, itemEn),
        })
        usedSourceDictionaryIds.add(entry.id)
        continue
      }
    }

    if (!jaName) {
      skipped.push({ name: enName, category1: entry.category1, reason: 'missing_teamcraft_ja' })
      continue
    }

    if (jaName === teamcraftItem?.en?.trim()) {
      skipped.push({ name: enName, category1: entry.category1, reason: 'ja_equals_en' })
      continue
    }

    entries.push({
      sourceDictionaryId: entry.id,
      itemId: entry.itemId,
      category1: entry.category1,
      en: enName,
      ja: jaName,
      searchNames: buildItemSearchNames(enName, jaName, entry.category1),
    })
    usedSourceDictionaryIds.add(entry.id)
  }

  for (const entry of sourceDictionary) {
    if (entry.type === 'metadata' || entry.category1 !== 'マウント' || usedSourceDictionaryIds.has(entry.id)) {
      continue
    }

    const collectNameEn = entry.name.trim()

    if (ENGLISH_KEEP_NAMES.has(collectNameEn)) {
      skipped.push({ name: collectNameEn, category1: entry.category1, reason: 'english_keep_mount_unexpected' })
      continue
    }

    if (isJapaneseText(collectNameEn)) {
      skipped.push({ name: collectNameEn, category1: entry.category1, reason: 'already_japanese' })
      continue
    }

    const teamcraftItem = teamcraftByEn.get(collectNameEn)
    const teamcraftJaName = teamcraftItem?.ja?.trim()

    if (teamcraftJaName && teamcraftJaName !== teamcraftItem?.en?.trim()) {
      entries.push({
        sourceDictionaryId: entry.id,
        itemId: entry.itemId,
        category1: entry.category1,
        en: collectNameEn,
        ja: teamcraftJaName,
        searchNames: buildItemSearchNames(collectNameEn, teamcraftJaName, entry.category1),
      })
      usedSourceDictionaryIds.add(entry.id)
      continue
    }

    const collectMountId = extractCollectMountId(entry.id)
    const mountSingularJa = collectMountId ? mountSingularJaByRowId.get(collectMountId) : undefined
    const mountSingularEn = collectMountId ? mountSingularEnByRowId.get(collectMountId) : undefined
    const unlockItem = entry.itemId ? teamcraftById.get(entry.itemId) : undefined
    const unlockItemEn = unlockItem?.en?.trim()
    const unlockItemJa = unlockItem?.ja?.trim()

    const manualDisplayJa = PHASE2_STEP_B_MOUNT_DISPLAY_NAMES.get(collectNameEn)

    if (manualDisplayJa) {
      entries.push({
        sourceDictionaryId: entry.id,
        itemId: entry.itemId,
        category1: entry.category1,
        en: collectNameEn,
        ja: manualDisplayJa,
        searchNames: buildMountBodySearchNames(
          collectNameEn,
          manualDisplayJa,
          mountSingularEn,
          unlockItemEn,
          unlockItemJa,
        ),
      })
      usedSourceDictionaryIds.add(entry.id)
      continue
    }

    if (!isPhase2AutoSafeMount(mountSingularJa, unlockItemJa)) {
      skipped.push({
        name: collectNameEn,
        category1: entry.category1,
        reason: 'phase2_manual_review',
      })
      continue
    }

    entries.push({
      sourceDictionaryId: entry.id,
      itemId: entry.itemId,
      category1: entry.category1,
      en: collectNameEn,
      ja: mountSingularJa!,
      searchNames: buildMountBodySearchNames(
        collectNameEn,
        mountSingularJa!,
        mountSingularEn,
        unlockItemEn,
        unlockItemJa,
      ),
    })
    usedSourceDictionaryIds.add(entry.id)
  }

  for (const entry of sourceDictionary) {
    if (entry.type === 'metadata' || entry.category1 !== 'エモート' || usedSourceDictionaryIds.has(entry.id)) {
      continue
    }

    const collectId =
      extractCollectEmoteId(entry.id) ??
      (entry.id === REGISTERED_LEGACY_EMOTE.sourceDictionaryId ? REGISTERED_LEGACY_EMOTE.collectId : null)
    const collectEmote = collectId ? collectEmotes.byCollectId.get(collectId) : undefined
    const itemRecord = entry.itemId ? teamcraftById.get(entry.itemId) : undefined
    const emoteJa = (collectId ? emoteJaByRowId.get(collectId) : undefined) ?? entry.name.trim()
    const emoteEn = (collectId ? emoteEnByRowId.get(collectId) : undefined) ?? collectEmote?.name ?? entry.name.trim()
    const itemJa = itemRecord?.ja?.trim()
    const itemEn = itemRecord?.en?.trim()

    if (!emoteJa) {
      skipped.push({ name: entry.name, category1: entry.category1, reason: 'missing_emote_ja' })
      continue
    }

    entries.push({
      sourceDictionaryId: entry.id,
      itemId: entry.itemId,
      category1: entry.category1,
      en: emoteEn,
      ja: emoteJa,
      searchNames: buildEmoteSearchNames({
        emoteJa,
        emoteEn,
        itemJa,
        itemEn,
        collectEn: collectEmote?.name,
        command: collectEmote?.command,
        legacyBookJa: entry.id === REGISTERED_LEGACY_EMOTE.sourceDictionaryId ? '演技教本:確認' : undefined,
      }),
    })
    usedSourceDictionaryIds.add(entry.id)
  }

  const byCategory = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.category1] = (acc[entry.category1] ?? 0) + 1
    return acc
  }, {})

  const output = [
    {
      version: 1,
      type: 'metadata',
      description:
        'Item display/search name dictionary for Phase 1 + Phase 2 + Final Step + Phase E-1 (collectibles/emotes).',
      generatedAt: new Date().toISOString(),
      scope: [...PHASE1_ITEM_CATEGORIES, 'マウント', 'エモート'].filter(
        (category, index, categories) => categories.indexOf(category) === index,
      ),
      entryCount: entries.length,
      byCategory,
      skippedCount: skipped.length,
    },
    ...entries,
  ]

  await mkdir(dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(`Generated ${entries.length} item name entries`)
  console.log(JSON.stringify(byCategory, null, 2))

  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} entries`)
    console.log(JSON.stringify(skipped, null, 2))
  }
}

await main()
