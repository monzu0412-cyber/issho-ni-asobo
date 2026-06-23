import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeCharacterIdInput } from '../src/lib/lodestone/normalizeCharacterId.ts'
import {
  clearLodestoneServiceStateForTests,
  getLodestoneCharacterProfile,
} from '../src/lib/lodestone/lodestoneCharacterService.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-phase1-verify.json')

const SAMPLE_ID = process.argv[2] ?? '43033411'

async function main() {
  const failures: string[] = []

  const urlId = normalizeCharacterIdInput(`https://jp.finalfantasyxiv.com/lodestone/character/${SAMPLE_ID}/`)
  const rawId = normalizeCharacterIdInput(SAMPLE_ID)

  if (urlId !== SAMPLE_ID) {
    failures.push(`URL normalize expected ${SAMPLE_ID}, got ${urlId}`)
  }

  if (rawId !== SAMPLE_ID) {
    failures.push(`raw ID normalize expected ${SAMPLE_ID}, got ${rawId}`)
  }

  if (normalizeCharacterIdInput('invalid')) {
    failures.push('invalid input should normalize to null')
  }

  clearLodestoneServiceStateForTests()

  const notFound = await getLodestoneCharacterProfile('99999999', 'verify-not-found')
  if (notFound.ok || notFound.status !== 404) {
    failures.push(`99999999 expected 404, got ${notFound.status}`)
  }

  const invalid = await getLodestoneCharacterProfile('abc', 'verify-invalid')
  if (invalid.ok || invalid.status !== 400) {
    failures.push(`abc expected 400, got ${invalid.status}`)
  }

  clearLodestoneServiceStateForTests()

  const success = await getLodestoneCharacterProfile(SAMPLE_ID, 'verify-success')
  let cachedResult: Awaited<ReturnType<typeof getLodestoneCharacterProfile>> | null = null

  if (!success.ok) {
    failures.push(`sample fetch failed: ${success.status} ${success.body.message}`)
  } else {
    const { profile } = success.body

    if (!profile.name) failures.push('missing name')
    if (!profile.world) failures.push('missing world')
    if (!profile.dataCenter) failures.push('missing dataCenter')
    if (profile.jobs.length === 0) failures.push('missing jobs')

    const capped = profile.jobs.filter((job) => job.isCapped)
    if (capped.length === 0) failures.push('expected at least one capped job in sample profile')

    const cached = await getLodestoneCharacterProfile(SAMPLE_ID, 'verify-cache')
    cachedResult = cached

    if (!cached.ok || !cached.body.cached) {
      failures.push('second fetch should be cached')
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sampleId: SAMPLE_ID,
    normalization: { urlId, rawId },
    notFound: notFound.ok ? null : notFound,
    invalid: invalid.ok ? null : invalid,
    success: success.ok ? success.body : null,
    cached: cachedResult?.ok ? { cached: cachedResult.body.cached, name: cachedResult.body.profile.name } : cachedResult,
    failures,
    pass: failures.length === 0,
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))

  if (failures.length > 0) {
    throw new Error(`Lodestone phase1 verify failed:\n${failures.join('\n')}`)
  }

  console.log('Lodestone phase1 verify passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
