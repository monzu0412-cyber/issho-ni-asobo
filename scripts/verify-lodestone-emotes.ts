import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clearLodestoneEmoteServiceStateForTests,
  getLodestoneEmoteOwnership,
  lodestoneEmoteServiceConfig,
} from '../src/lib/lodestone/lodestoneEmoteService.ts'
import { getCollectionDictionaryEntries, entryOwnershipKey } from '../src/lib/lodestone/collectionDictionary.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-emotes-verify.json')

const SAMPLE_ID = process.argv[2] ?? '60814884'
const EXPECTED_DICTIONARY_TOTAL = getCollectionDictionaryEntries('エモート').length

async function main() {
  const failures: string[] = []

  clearLodestoneEmoteServiceStateForTests()

  const result = await getLodestoneEmoteOwnership(SAMPLE_ID, 'verify-emotes')

  if (!result.ok) {
    failures.push(`fetch failed: ${result.status} ${result.body.message}`)
  } else {
    const { result: ownership } = result.body

    if (ownership.characterId !== SAMPLE_ID) {
      failures.push(`characterId mismatch: ${ownership.characterId}`)
    }

    if (ownership.dictionaryTotal !== EXPECTED_DICTIONARY_TOTAL) {
      failures.push(`dictionaryTotal expected ${EXPECTED_DICTIONARY_TOTAL}, got ${ownership.dictionaryTotal}`)
    }

    if (ownership.totalOnLodestone < 140 || ownership.totalOnLodestone > 160) {
      failures.push(`totalOnLodestone expected ~149, got ${ownership.totalOnLodestone}`)
    }

    const resolvedCount = ownership.owned.length + ownership.unmatchedOwned.length

    if (resolvedCount !== ownership.totalOnLodestone) {
      failures.push(
        `resolved count mismatch: owned(${ownership.owned.length}) + unmatched(${ownership.unmatchedOwned.length}) !== total(${ownership.totalOnLodestone})`,
      )
    }

    if (ownership.owned.length === 0) {
      failures.push('expected at least one owned emote')
    }

    const uniqueDictionaryKeys = new Set(
      getCollectionDictionaryEntries('エモート').map((entry) => entryOwnershipKey(entry)),
    )
    const ownedKeys = new Set(
      ownership.owned.map((entry) =>
        entry.itemId != null ? `item:${entry.itemId}` : `source:${entry.sourceDictionaryId}`),
    )

    if (ownedKeys.size !== ownership.owned.length) {
      failures.push('owned entries should have unique dictionary keys')
    }

    if (ownedKeys.size + ownership.missing.length !== uniqueDictionaryKeys.size) {
      failures.push(
        `owned unique keys(${ownedKeys.size}) + missing(${ownership.missing.length}) should equal unique dictionary keys(${uniqueDictionaryKeys.size})`,
      )
    }

    const cachedResult = await getLodestoneEmoteOwnership(SAMPLE_ID, 'verify-emotes-cache')

    if (!cachedResult.ok || !cachedResult.body.cached) {
      failures.push('second fetch should be cached')
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sampleId: SAMPLE_ID,
    config: lodestoneEmoteServiceConfig,
    result: result.ok ? result.body : null,
    error: result.ok ? null : result,
    summary: result.ok
      ? {
          totalOnLodestone: result.body.result.totalOnLodestone,
          ownedCount: result.body.result.owned.length,
          missingCount: result.body.result.missing.length,
          unmatchedOwnedCount: result.body.result.unmatchedOwned.length,
          dictionaryTotal: result.body.result.dictionaryTotal,
          dictionaryMatchRate: result.body.result.totalOnLodestone > 0
            ? result.body.result.owned.length / result.body.result.totalOnLodestone
            : 0,
          unmatchedOwnedSample: result.body.result.unmatchedOwned.slice(0, 15),
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
