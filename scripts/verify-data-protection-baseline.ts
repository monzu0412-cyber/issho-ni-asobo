import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUTPUT_PATH = resolve(__dirname, 'output/data-protection-baseline-verify.json')

type SourceEntry = {
  type?: string
  id: string
  category1: string
  subCategory?: string
}

/** Tier A baselines — update only with Master OK and docs/DATA_PROTECTION.md sync */
const EXPECTED_SOURCE_COUNTS: Record<string, number> = {
  魚: 2399,
  ミニオン: 571,
  マウント: 346,
  エモート: 198,
  髪型: 49,
  'ファッションアクセサリー': 34,
  譜面: 862,
  装備: 3507,
}

const EXPECTED_FISH_SUB_COUNTS: Record<string, number> = {
  魚: 1739,
  ヌシ: 611,
  オオヌシ: 49,
}

const EXPECTED_FISH_TOTAL = 2399

type CheckResult = {
  id: string
  ok: boolean
  expected?: number | Record<string, number>
  actual?: number | Record<string, number>
  message: string
}

function loadJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf8')) as T
}

function countByCategory1(entries: SourceEntry[]) {
  return entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.category1] = (acc[entry.category1] ?? 0) + 1
    return acc
  }, {})
}

function main() {
  const checks: CheckResult[] = []
  const source = loadJson<SourceEntry[]>('src/data/reverse-search/manual/source_dictionary.json')
  const items = source.filter((entry) => entry.type !== 'metadata')
  const byCategory1 = countByCategory1(items)
  const fish = items.filter((entry) => entry.category1 === '魚')
  const fishBySub = fish.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.subCategory ?? '(missing)'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  for (const [category1, expected] of Object.entries(EXPECTED_SOURCE_COUNTS)) {
    const actual = byCategory1[category1] ?? 0
    checks.push({
      id: `source_dictionary.category1.${category1}`,
      ok: actual === expected,
      expected,
      actual,
      message: actual === expected
        ? `${category1}: ${actual}`
        : `${category1} count mismatch (expected ${expected}, got ${actual})`,
    })
  }

  checks.push({
    id: 'source_dictionary.fish.total',
    ok: fish.length === EXPECTED_FISH_TOTAL,
    expected: EXPECTED_FISH_TOTAL,
    actual: fish.length,
    message: fish.length === EXPECTED_FISH_TOTAL
      ? `fish total: ${fish.length}`
      : `fish total mismatch (expected ${EXPECTED_FISH_TOTAL}, got ${fish.length})`,
  })

  for (const [subCategory, expected] of Object.entries(EXPECTED_FISH_SUB_COUNTS)) {
    const actual = fishBySub[subCategory] ?? 0
    checks.push({
      id: `source_dictionary.fish.subCategory.${subCategory}`,
      ok: actual === expected,
      expected,
      actual,
      message: actual === expected
        ? `fish subCategory ${subCategory}: ${actual}`
        : `fish subCategory ${subCategory} mismatch (expected ${expected}, got ${actual})`,
    })
  }

  const nonFishFishIds = items.filter(
    (entry) => entry.id.startsWith('source_fish_') && entry.category1 !== '魚',
  )
  checks.push({
    id: 'source_dictionary.fish.id_prefix_integrity',
    ok: nonFishFishIds.length === 0,
    actual: nonFishFishIds.length,
    message: nonFishFishIds.length === 0
      ? 'all source_fish_* entries have category1=魚'
      : `found ${nonFishFishIds.length} source_fish_* entries outside category1=魚`,
  })

  const fishMissingPrefix = fish.filter((entry) => !entry.id.startsWith('source_fish_'))
  checks.push({
    id: 'source_dictionary.fish.id_format',
    ok: fishMissingPrefix.length === 0,
    actual: fishMissingPrefix.length,
    message: fishMissingPrefix.length === 0
      ? 'all fish entries use source_fish_* id prefix'
      : `${fishMissingPrefix.length} fish entries missing source_fish_* prefix`,
  })

  let searchFish = 0
  try {
    const search = loadJson<Array<{ type?: string; category1?: string }>>(
      'src/data/reverse-search/generated/search_dictionary.generated.json',
    )
    searchFish = search.filter((entry) => entry.type !== 'metadata' && entry.category1 === '魚').length
    checks.push({
      id: 'search_dictionary.generated.fish.total',
      ok: searchFish === EXPECTED_FISH_TOTAL,
      expected: EXPECTED_FISH_TOTAL,
      actual: searchFish,
      message: searchFish === EXPECTED_FISH_TOTAL
        ? `search_dictionary fish: ${searchFish}`
        : `search_dictionary fish mismatch (expected ${EXPECTED_FISH_TOTAL}, got ${searchFish})`,
    })
  } catch (error) {
    checks.push({
      id: 'search_dictionary.generated.readable',
      ok: false,
      message: `failed to read search_dictionary.generated.json: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  const failed = checks.filter((check) => !check.ok)
  const report = {
    generatedAt: new Date().toISOString(),
    policy: 'docs/DATA_PROTECTION.md',
    summary: {
      totalChecks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      ok: failed.length === 0,
    },
    baselines: {
      sourceDictionaryByCategory1: EXPECTED_SOURCE_COUNTS,
      fishSubCategory: EXPECTED_FISH_SUB_COUNTS,
    },
    actual: {
      sourceDictionaryByCategory1: byCategory1,
      fishSubCategory: fishBySub,
      searchDictionaryFish: searchFish,
    },
    checks,
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify(report.summary, null, 2))

  if (failed.length > 0) {
    console.error('FAILED CHECKS:')
    for (const check of failed) {
      console.error(`- ${check.id}: ${check.message}`)
    }
    process.exit(1)
  }
}

main()
