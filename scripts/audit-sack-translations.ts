import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')

async function main() {
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string; source?: string }>
  const source = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as Array<{
    category1?: string
    subCategory?: string
    contentName?: string | null
    acquisitionRoutes?: Array<{ contentName?: string; detail?: string }>
  }>

  const sackEntries = dictionary.filter((entry) => entry.source === 'template-sack' && entry.en && entry.ja)
  const scoped = source.filter((entry) =>
    entry.category1 === '譜面' || entry.subCategory === '譜面' || entry.category1 === 'マウント' || entry.category1 === 'ミニオン')

  const usage = new Map<string, number>()
  for (const entry of scoped) {
    for (const value of [entry.contentName, ...(entry.acquisitionRoutes ?? []).flatMap((route) => [route.contentName, route.detail])]) {
      const text = value?.trim()
      if (!text) continue
      if (sackEntries.some((entry) => entry.en === text)) {
        usage.set(text, (usage.get(text) ?? 0) + 1)
      }
    }
  }

  console.log(JSON.stringify({
    sackDictionaryEntries: sackEntries.length,
    entries: sackEntries.map((entry) => ({
      en: entry.en,
      ja: entry.ja,
      usageCount: usage.get(entry.en!) ?? 0,
    })).sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0)),
    totalUsageReferences: [...usage.values()].reduce((sum, count) => sum + count, 0),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
