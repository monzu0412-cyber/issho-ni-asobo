import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchGarlandItemIcon, type ItemIconRecord } from './item-icon-utils.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SOURCE_DICTIONARY_PATH = resolve(ROOT, 'src/data/reverse-search/manual/source_dictionary.json')
const OUTPUT_PATH = resolve(ROOT, 'src/data/reverse-search/generated/fish_item_icon_by_item_id.generated.json')
const REPORT_PATH = resolve(ROOT, 'scripts/output/fish-item-icon-build-report.json')

type SourceDictionaryEntry = {
  type?: string
  category1?: string
  itemId?: number
}

type FishItemIconFile = {
  version: number
  type: 'metadata'
  phase: 'fish-icon-lookup'
  generatedAt: string
  source: 'garlandtools.org'
  scope: 'source_dictionary_fish_public'
  targetItemCount: number
  resolvedItemCount: number
  items: ItemIconRecord[]
}

async function loadExistingIcons(): Promise<Map<number, ItemIconRecord>> {
  try {
    const raw = JSON.parse(await readFile(OUTPUT_PATH, 'utf8')) as FishItemIconFile | ItemIconRecord[]
    const items = Array.isArray(raw) ? raw : raw.items

    return new Map(items.map((item) => [item.itemId, item]))
  } catch {
    return new Map()
  }
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(SOURCE_DICTIONARY_PATH, 'utf8')) as SourceDictionaryEntry[]
  const targetItemIds = [...new Set(
    sourceDictionary
      .filter((entry) => entry.type !== 'metadata' && entry.category1 === '魚' && entry.itemId != null)
      .map((entry) => entry.itemId as number),
  )].sort((left, right) => left - right)

  const icons = await loadExistingIcons()
  const failures: Array<{ itemId: number; reason: string }> = []
  let fetched = 0

  console.log(`Building fish item icon lookup for ${targetItemIds.length} itemIds...`)

  for (const itemId of targetItemIds) {
    if (icons.has(itemId)) {
      continue
    }

    fetched += 1

    if (fetched % 50 === 0) {
      console.log(`Fetched ${fetched} new icons...`)
    }

    try {
      const icon = await fetchGarlandItemIcon(itemId)

      if (icon) {
        icons.set(itemId, icon)
      } else {
        failures.push({ itemId, reason: 'garland_missing_icon' })
      }
    } catch (error) {
      failures.push({
        itemId,
        reason: error instanceof Error ? error.message : 'fetch_failed',
      })
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25))
  }

  const items = targetItemIds
    .map((itemId) => icons.get(itemId))
    .filter((item): item is ItemIconRecord => item != null)

  const output: FishItemIconFile = {
    version: 1,
    type: 'metadata',
    phase: 'fish-icon-lookup',
    generatedAt: new Date().toISOString(),
    source: 'garlandtools.org',
    scope: 'source_dictionary_fish_public',
    targetItemCount: targetItemIds.length,
    resolvedItemCount: items.length,
    items,
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  await writeFile(REPORT_PATH, `${JSON.stringify({
    targetItemCount: targetItemIds.length,
    resolvedItemCount: items.length,
    fetched,
    failures: failures.slice(0, 20),
    failureCount: failures.length,
  }, null, 2)}\n`, 'utf8')

  console.log(`Resolved ${items.length}/${targetItemIds.length} fish icons.`)
  console.log(`Output: ${OUTPUT_PATH}`)
}

await main()
