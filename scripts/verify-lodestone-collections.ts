import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clearLodestoneCollectionsServiceStateForTests,
  getLodestoneCollections,
  lodestoneCollectionsServiceConfig,
} from '../src/lib/lodestone/lodestoneCollectionsService.ts'
import { clearLodestoneEmoteServiceStateForTests } from '../src/lib/lodestone/lodestoneEmoteService.ts'
import { clearLodestoneFaceAccessoryServiceStateForTests } from '../src/lib/lodestone/lodestoneFaceAccessoryService.ts'
import { clearLodestoneMinionServiceStateForTests } from '../src/lib/lodestone/lodestoneMinionService.ts'
import { clearLodestoneMountServiceStateForTests } from '../src/lib/lodestone/lodestoneMountService.ts'
import type { LodestoneCollectionCategoryKey } from '../src/types/lodestoneCollections.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-collections-verify.json')

const SAMPLE_ID = process.argv[2] ?? '60814884'

type CategoryExpectation = {
  status: 'ok' | 'partial'
  ownedMin: number
  ownedMax: number
  unmatchedMin: number
  unmatchedMax: number
  totalOnLodestoneMin: number
  totalOnLodestoneMax: number
}

const EXPECTED: Record<LodestoneCollectionCategoryKey, CategoryExpectation> = {
  minions: {
    status: 'ok',
    ownedMin: 40,
    ownedMax: 50,
    unmatchedMin: 0,
    unmatchedMax: 0,
    totalOnLodestoneMin: 40,
    totalOnLodestoneMax: 50,
  },
  mounts: {
    status: 'ok',
    ownedMin: 30,
    ownedMax: 36,
    unmatchedMin: 0,
    unmatchedMax: 0,
    totalOnLodestoneMin: 30,
    totalOnLodestoneMax: 36,
  },
  emotes: {
    status: 'partial',
    ownedMin: 50,
    ownedMax: 65,
    unmatchedMin: 85,
    unmatchedMax: 100,
    totalOnLodestoneMin: 140,
    totalOnLodestoneMax: 160,
  },
  faceAccessories: {
    status: 'ok',
    ownedMin: 8,
    ownedMax: 12,
    unmatchedMin: 0,
    unmatchedMax: 0,
    totalOnLodestoneMin: 8,
    totalOnLodestoneMax: 12,
  },
}

function clearAllServiceStateForTests() {
  clearLodestoneCollectionsServiceStateForTests()
  clearLodestoneMinionServiceStateForTests()
  clearLodestoneMountServiceStateForTests()
  clearLodestoneEmoteServiceStateForTests()
  clearLodestoneFaceAccessoryServiceStateForTests()
}

function inRange(value: number, min: number, max: number) {
  return value >= min && value <= max
}

async function main() {
  const failures: string[] = []

  clearAllServiceStateForTests()

  const result = await getLodestoneCollections(SAMPLE_ID, 'verify-collections')

  if (!result.ok) {
    failures.push(`fetch failed: ${result.status} ${result.body.message}`)
  } else {
    const { result: collections } = result.body

    if (collections.characterId !== SAMPLE_ID) {
      failures.push(`characterId mismatch: ${collections.characterId}`)
    }

    if (!collections.generatedAt) {
      failures.push('generatedAt is required')
    }

    for (const [key, expected] of Object.entries(EXPECTED) as Array<[LodestoneCollectionCategoryKey, CategoryExpectation]>) {
      const category = collections.summary.categories.find((entry) => entry.key === key)

      if (!category) {
        failures.push(`missing category summary: ${key}`)
        continue
      }

      if (category.status !== expected.status) {
        failures.push(`${key} status expected ${expected.status}, got ${category.status}`)
      }

      if (!inRange(category.owned, expected.ownedMin, expected.ownedMax)) {
        failures.push(`${key} owned expected ${expected.ownedMin}-${expected.ownedMax}, got ${category.owned}`)
      }

      if (!inRange(category.unmatched, expected.unmatchedMin, expected.unmatchedMax)) {
        failures.push(`${key} unmatched expected ${expected.unmatchedMin}-${expected.unmatchedMax}, got ${category.unmatched}`)
      }

      if (
        category.totalOnLodestone == null
        || !inRange(category.totalOnLodestone, expected.totalOnLodestoneMin, expected.totalOnLodestoneMax)
      ) {
        failures.push(
          `${key} totalOnLodestone expected ${expected.totalOnLodestoneMin}-${expected.totalOnLodestoneMax}, got ${category.totalOnLodestone}`,
        )
      }

      const ownership = collections.collections[key]

      if (!ownership) {
        failures.push(`missing collection payload: ${key}`)
        continue
      }

      if (ownership.owned.length + ownership.unmatchedOwned.length !== ownership.totalOnLodestone) {
        failures.push(`${key} owned + unmatched should equal totalOnLodestone`)
      }

      if (key !== 'emotes' && ownership.owned.length + ownership.missing.length !== ownership.dictionaryTotal) {
        failures.push(`${key} owned + missing should equal dictionaryTotal`)
      }
    }

    const summaryOwned = collections.summary.categories.reduce((sum, category) => sum + category.owned, 0)
    const summaryMissing = collections.summary.categories.reduce((sum, category) => sum + category.missing, 0)
    const summaryUnmatched = collections.summary.categories.reduce((sum, category) => sum + category.unmatched, 0)

    if (collections.summary.totalOwned !== summaryOwned) {
      failures.push(`summary.totalOwned mismatch: ${collections.summary.totalOwned} !== ${summaryOwned}`)
    }

    if (collections.summary.totalMissing !== summaryMissing) {
      failures.push(`summary.totalMissing mismatch: ${collections.summary.totalMissing} !== ${summaryMissing}`)
    }

    if (collections.summary.totalUnmatched !== summaryUnmatched) {
      failures.push(`summary.totalUnmatched mismatch: ${collections.summary.totalUnmatched} !== ${summaryUnmatched}`)
    }

    const cachedResult = await getLodestoneCollections(SAMPLE_ID, 'verify-collections-cache')

    if (!cachedResult.ok || !cachedResult.body.cached) {
      failures.push('second fetch should be cached')
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sampleId: SAMPLE_ID,
    config: lodestoneCollectionsServiceConfig,
    result: result.ok ? result.body : null,
    error: result.ok ? null : result,
    summary: result.ok
      ? {
          totalOwned: result.body.result.summary.totalOwned,
          totalMissing: result.body.result.summary.totalMissing,
          totalUnmatched: result.body.result.summary.totalUnmatched,
          categories: result.body.result.summary.categories,
        }
      : null,
    failures,
    pass: failures.length === 0,
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
