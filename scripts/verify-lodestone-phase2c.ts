import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyLodestoneProfileToCharacter,
  isFactoryDefaultLocation,
  previewLodestoneApply,
} from '../src/lib/lodestone/applyLodestoneProfileToCharacter.ts'
import { normalizeCharacterIdInput } from '../src/lib/lodestone/normalizeCharacterId.ts'
import {
  clearLodestoneServiceStateForTests,
  getLodestoneCharacterProfile,
} from '../src/lib/lodestone/lodestoneCharacterService.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-phase2c-verify.json')

const MASTER_ID = process.argv[2] ?? '60814884'

const worldsByDc = {
  Elemental: ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'],
  Gaia: ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
  Mana: ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan'],
  Meteor: ['Belias', 'Mandragora', 'Ramuh', 'Shinryu', 'Unicorn', 'Valefor', 'Yojimbo', 'Zeromus'],
} as const

const dataCenters = Object.keys(worldsByDc) as Array<keyof typeof worldsByDc>

async function main() {
  const failures: string[] = []

  const urlId = normalizeCharacterIdInput(`https://jp.finalfantasyxiv.com/lodestone/character/${MASTER_ID}/`)
  const rawId = normalizeCharacterIdInput(MASTER_ID)

  if (urlId !== MASTER_ID) {
    failures.push(`URL normalize expected ${MASTER_ID}, got ${urlId}`)
  }

  if (rawId !== MASTER_ID) {
    failures.push(`raw ID normalize expected ${MASTER_ID}, got ${rawId}`)
  }

  const emptyCharacter = {
    name: '',
    dc: 'Elemental' as const,
    world: worldsByDc.Elemental[0],
  }

  if (!isFactoryDefaultLocation(emptyCharacter.dc, emptyCharacter.world, worldsByDc)) {
    failures.push('factory default location detection failed')
  }

  const manualCharacter = {
    name: '手入力キャラ',
    dc: 'Gaia' as const,
    world: 'Bahamut',
  }

  const manualApply = applyLodestoneProfileToCharacter(
    manualCharacter,
    {
      characterId: MASTER_ID,
      name: 'Rogan Stone',
      dataCenter: 'Meteor',
      world: 'Shinryu',
      jobs: [],
    },
    worldsByDc,
    dataCenters,
    { overwrite: false },
  )

  if (manualApply.appliedFields.length > 0) {
    failures.push(`manual character should not auto-apply without overwrite: ${manualApply.appliedFields.join(',')}`)
  }

  if (manualApply.name !== manualCharacter.name) {
    failures.push('manual name was overwritten without overwrite flag')
  }

  const manualOverwrite = applyLodestoneProfileToCharacter(
    manualCharacter,
    {
      characterId: MASTER_ID,
      name: 'Rogan Stone',
      dataCenter: 'Meteor',
      world: 'Shinryu',
      jobs: [],
    },
    worldsByDc,
    dataCenters,
    { overwrite: true },
  )

  if (manualOverwrite.name !== 'Rogan Stone' || manualOverwrite.dc !== 'Meteor' || manualOverwrite.world !== 'Shinryu') {
    failures.push('overwrite apply failed for manual character')
  }

  clearLodestoneServiceStateForTests()

  const success = await getLodestoneCharacterProfile(MASTER_ID, 'verify-phase2c')
  let applyResult: ReturnType<typeof applyLodestoneProfileToCharacter> | null = null
  let preview: ReturnType<typeof previewLodestoneApply> | null = null
  let cappedJobs: string[] = []

  if (!success.ok) {
    failures.push(`sample fetch failed: ${success.status} ${success.body.message}`)
  } else {
    const { profile } = success.body

    preview = previewLodestoneApply(emptyCharacter, profile, worldsByDc, dataCenters, { overwrite: false })
    applyResult = applyLodestoneProfileToCharacter(emptyCharacter, profile, worldsByDc, dataCenters, { overwrite: false })

    if (!preview.canApply) {
      failures.push('expected apply preview to have at least one field')
    }

    if (applyResult.appliedFields.length === 0) {
      failures.push('expected at least one applied field for empty character')
    }

    if (applyResult.name !== profile.name) {
      failures.push(`name mismatch: expected ${profile.name}, got ${applyResult.name}`)
    }

    if (profile.dataCenter && applyResult.dc !== profile.dataCenter) {
      failures.push(`dc mismatch: expected ${profile.dataCenter}, got ${applyResult.dc}`)
    }

    if (applyResult.world !== profile.world) {
      failures.push(`world mismatch: expected ${profile.world}, got ${applyResult.world}`)
    }

    cappedJobs = profile.jobs.filter((job) => job.isCapped).map((job) => job.jobId)

    if (cappedJobs.length === 0) {
      failures.push('expected capped jobs in master profile')
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    masterId: MASTER_ID,
    normalization: { urlId, rawId },
    manualApplyWithoutOverwrite: manualApply,
    manualApplyWithOverwrite: manualOverwrite,
    fetch: success.ok ? success.body : null,
    preview,
    applyResult,
    cappedJobs,
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

void main()
