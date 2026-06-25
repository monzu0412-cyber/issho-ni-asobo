import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clearLodestoneMinionServiceStateForTests,
  getLodestoneMinionOwnership,
  lodestoneMinionServiceConfig,
} from '../src/lib/lodestone/lodestoneMinionService.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-minions-verify.json')

const SAMPLE_ID = process.argv[2] ?? '60814884'

async function main() {
  const failures: string[] = []

  clearLodestoneMinionServiceStateForTests()

  const result = await getLodestoneMinionOwnership(SAMPLE_ID, 'verify-minions')

  if (!result.ok) {
    failures.push(`fetch failed: ${result.status} ${result.body.message}`)
  } else {
    const { result: ownership } = result.body

    if (ownership.characterId !== SAMPLE_ID) {
      failures.push(`characterId mismatch: ${ownership.characterId}`)
    }

    if (ownership.dictionaryTotal !== 571) {
      failures.push(`dictionaryTotal expected 571, got ${ownership.dictionaryTotal}`)
    }

    if (ownership.totalOnLodestone < 40 || ownership.totalOnLodestone > 50) {
      failures.push(`totalOnLodestone expected ~44, got ${ownership.totalOnLodestone}`)
    }

    const resolvedCount = ownership.owned.length + ownership.unmatchedOwned.length

    if (resolvedCount !== ownership.totalOnLodestone) {
      failures.push(
        `resolved count mismatch: owned(${ownership.owned.length}) + unmatched(${ownership.unmatchedOwned.length}) !== total(${ownership.totalOnLodestone})`,
      )
    }

    if (ownership.owned.length === 0) {
      failures.push('expected at least one owned minion')
    }

    if (ownership.owned.length + ownership.missing.length !== ownership.dictionaryTotal) {
      failures.push('owned + missing should equal dictionaryTotal')
    }

    const cachedResult = await getLodestoneMinionOwnership(SAMPLE_ID, 'verify-minions-cache')

    if (!cachedResult.ok || !cachedResult.body.cached) {
      failures.push('second fetch should be cached')
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sampleId: SAMPLE_ID,
    config: lodestoneMinionServiceConfig,
    result: result.ok ? result.body : null,
    error: result.ok ? null : result,
    summary: result.ok
      ? {
          totalOnLodestone: result.body.result.totalOnLodestone,
          ownedCount: result.body.result.owned.length,
          missingCount: result.body.result.missing.length,
          unmatchedOwnedCount: result.body.result.unmatchedOwned.length,
          dictionaryTotal: result.body.result.dictionaryTotal,
          matchRate: result.body.result.totalOnLodestone > 0
            ? result.body.result.owned.length / result.body.result.totalOnLodestone
            : 0,
          unmatchedOwned: result.body.result.unmatchedOwned,
          ownedSample: result.body.result.owned.slice(0, 5),
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
