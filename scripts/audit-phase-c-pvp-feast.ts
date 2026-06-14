import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

async function main() {
  const dict = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string; type?: string }>
  const source = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as Array<{
    name?: string
    category1?: string
    subCategory?: string
    contentName?: string | null
    acquisitionRoutes?: Array<{ contentName?: string; detail?: string; type?: string }>
  }>

  const dictMap = new Map(dict.filter((entry) => entry.en && entry.ja).map((entry) => [entry.en!, entry.ja!]))
  const english = new Set<string>()

  for (const entry of source.filter((item) =>
    item.category1 === '譜面'
    || item.subCategory === '譜面'
    || item.category1 === 'マウント'
    || item.category1 === 'ミニオン')) {
    for (const value of [entry.contentName, ...(entry.acquisitionRoutes ?? []).flatMap((route) => [route.contentName, route.detail])]) {
      const trimmed = value?.trim()
      if (trimmed && !isJapanese(trimmed)) {
        english.add(trimmed)
      }
    }
  }

  const pvpSeries = [...english].filter((value) => /^PvP Series \d+ - Level \d+$/.test(value)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const feastSeason = [...english].filter((value) => /^The Feast: Season \d+$/.test(value)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const fallback = (values: string[]) => values.filter((value) => !dictMap.has(value))

  const pvpFallback = fallback(pvpSeries)
  const feastFallback = fallback(feastSeason)

  const usage = new Map<string, Array<{ name?: string; category1?: string }>>()
  for (const entry of source.filter((item) => item.category1 === 'マウント' || item.category1 === 'ミニオン' || item.category1 === '譜面' || item.subCategory === '譜面')) {
    for (const route of entry.acquisitionRoutes ?? []) {
      for (const value of [entry.contentName, route.contentName, route.detail]) {
        const trimmed = value?.trim()
        if (!trimmed || isJapanese(trimmed)) {
          continue
        }

        if (/^PvP Series \d+ - Level \d+$/.test(trimmed) || /^The Feast: Season \d+$/.test(trimmed)) {
          const list = usage.get(trimmed) ?? []
          list.push({ name: entry.name, category1: entry.category1 })
          usage.set(trimmed, list)
        }
      }
    }
  }

  const meta = dict.find((entry) => entry.type === 'metadata') as { counts?: { dictionaryEntries?: number; englishFallback?: number } } | undefined
  const dictCount = meta?.counts?.dictionaryEntries ?? dictMap.size
  const fbCount = meta?.counts?.englishFallback ?? english.size - dictCount

  const output = {
    summary: {
      pvpSeriesTotalInScope: pvpSeries.length,
      pvpSeriesFallback: pvpFallback.length,
      feastSeasonTotalInScope: feastSeason.length,
      feastSeasonFallback: feastFallback.length,
      phaseCTarget: pvpFallback.length + feastFallback.length,
    },
    pvpSeriesAll: pvpSeries.map((value) => ({ en: value, inDictionary: dictMap.has(value), usageCount: usage.get(value)?.length ?? 0 })),
    feastSeasonAll: feastSeason.map((value) => ({ en: value, inDictionary: dictMap.has(value), usageCount: usage.get(value)?.length ?? 0 })),
    pvpSeriesFallback: pvpFallback,
    feastSeasonFallback: feastFallback,
    projected: {
      dictionaryEntries: dictCount + pvpFallback.length + feastFallback.length,
      englishFallback: fbCount - pvpFallback.length - feastFallback.length,
      coveragePercent: (((dictCount + pvpFallback.length + feastFallback.length) / english.size) * 100).toFixed(1),
    },
  }

  await writeFile(resolve(ROOT, '.tmp-audit-policy-phase-a/phase-c-pvp-feast-audit.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(output.summary, null, 2))
  console.log('pvp fallback', pvpFallback.length, pvpFallback)
  console.log('feast fallback', feastFallback.length, feastFallback)
  console.log('projected coverage', output.projected.coveragePercent + '%')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
