import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clearLodestoneFaceAccessoryServiceStateForTests,
  getLodestoneFaceAccessoryOwnership,
  lodestoneFaceAccessoryServiceConfig,
} from '../src/lib/lodestone/lodestoneFaceAccessoryService.ts'
import { getFaceAccessoryDictionaryEntries } from '../src/lib/lodestone/faceAccessoryDictionary.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-faceaccessories-verify.json')

const SAMPLE_ID = process.argv[2] ?? '60814884'
const PRIVATE_SAMPLE_ID = process.argv[3] ?? '43033411'
const EXPECTED_DICTIONARY_TOTAL = getFaceAccessoryDictionaryEntries().length

async function main() {
  const failures: string[] = []

  clearLodestoneFaceAccessoryServiceStateForTests()

  const result = await getLodestoneFaceAccessoryOwnership(SAMPLE_ID, 'verify-faceaccessories')

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

    if (ownership.totalOnLodestone < 8 || ownership.totalOnLodestone > 12) {
      failures.push(`totalOnLodestone expected ~10, got ${ownership.totalOnLodestone}`)
    }

    const resolvedCount = ownership.owned.length + ownership.unmatchedOwned.length

    if (resolvedCount !== ownership.totalOnLodestone) {
      failures.push(
        `resolved count mismatch: owned(${ownership.owned.length}) + unmatched(${ownership.unmatchedOwned.length}) !== total(${ownership.totalOnLodestone})`,
      )
    }

    if (ownership.owned.length === 0) {
      failures.push('expected at least one owned face accessory')
    }

    if (ownership.owned.length + ownership.missing.length !== ownership.dictionaryTotal) {
      failures.push('owned + missing should equal dictionaryTotal')
    }

    const cachedResult = await getLodestoneFaceAccessoryOwnership(SAMPLE_ID, 'verify-faceaccessories-cache')

    if (!cachedResult.ok || !cachedResult.body.cached) {
      failures.push('second fetch should be cached')
    }
  }

  clearLodestoneFaceAccessoryServiceStateForTests()
  const privateResult = await getLodestoneFaceAccessoryOwnership(PRIVATE_SAMPLE_ID, 'verify-faceaccessories-private')

  if (!privateResult.ok) {
    if (privateResult.status !== 404 || privateResult.body.error !== 'collection_not_found') {
      failures.push(
        `private sample expected collection_not_found 404, got ${privateResult.status} ${privateResult.body.error}`,
      )
    }
  } else {
    failures.push('private sample should not return success for missing face accessory page')
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sampleId: SAMPLE_ID,
    privateSampleId: PRIVATE_SAMPLE_ID,
    config: lodestoneFaceAccessoryServiceConfig,
    result: result.ok ? result.body : null,
    privateResult: privateResult.ok ? privateResult.body : privateResult,
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
