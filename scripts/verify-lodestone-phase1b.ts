import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clearLodestoneServiceStateForTests,
  getLodestoneCharacterProfile,
} from '../src/lib/lodestone/lodestoneCharacterService.ts'
import { parseClassJobs } from '../src/lib/lodestone/parseCharacterProfile.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-phase1b-verify.json')

const MASTER_ID = '60814884'
const REGRESSION_ID = '43033411'

const MASTER_EXPECTED_LEVELED: Array<{ jobName: string; jobId: string; level: number }> = [
  { jobName: 'ナイト / 剣術士', jobId: 'PLD', level: 100 },
  { jobName: '戦士 / 斧術士', jobId: 'WAR', level: 100 },
  { jobName: '暗黒騎士', jobId: 'DRK', level: 70 },
  { jobName: 'ガンブレイカー', jobId: 'GNB', level: 100 },
  { jobName: '木工師', jobId: 'CRP', level: 70 },
  { jobName: '鍛冶師', jobId: 'BSM', level: 70 },
  { jobName: '甲冑師', jobId: 'ARM', level: 70 },
  { jobName: '彫金師', jobId: 'GSM', level: 70 },
  { jobName: '革細工師', jobId: 'LTW', level: 70 },
  { jobName: '裁縫師', jobId: 'WVR', level: 70 },
  { jobName: '錬金術師', jobId: 'ALC', level: 70 },
  { jobName: '調理師', jobId: 'CUL', level: 71 },
  { jobName: '採掘師', jobId: 'MIN', level: 74 },
  { jobName: '園芸師', jobId: 'BTN', level: 72 },
]

const MASTER_EXPECTED_CAPPED = ['ナイト / 剣術士', '戦士 / 斧術士', 'ガンブレイカー']

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

function findJob(
  jobs: Array<{ jobName: string; jobId: string; level: number; isCapped: boolean }>,
  jobName: string,
) {
  return jobs.find((job) => job.jobName === jobName)
}

async function main() {
  const failures: string[] = []

  const cachedHtmlPath = resolve(__dirname, `output/lodestone-${MASTER_ID}-class_job.html`)

  try {
    const cachedHtml = readFileSync(cachedHtmlPath, 'utf8')
    const cachedJobs = parseClassJobs(cachedHtml)

    for (const expected of MASTER_EXPECTED_LEVELED) {
      const job = findJob(cachedJobs, expected.jobName)

      if (!job) {
        failures.push(`cached HTML missing job: ${expected.jobName}`)
        continue
      }

      if (job.jobId !== expected.jobId) {
        failures.push(`${expected.jobName} jobId expected ${expected.jobId}, got ${job.jobId}`)
      }

      if (job.level !== expected.level) {
        failures.push(`${expected.jobName} level expected ${expected.level}, got ${job.level}`)
      }
    }

    for (const cappedName of MASTER_EXPECTED_CAPPED) {
      const job = findJob(cachedJobs, cappedName)

      if (!job?.isCapped) {
        failures.push(`${cappedName} should be capped`)
      }
    }

    const falsePositives = cachedJobs.filter((job) => job.level > 0 && !MASTER_EXPECTED_LEVELED.some((e) => e.jobName === job.jobName))

    if (falsePositives.length > 0) {
      failures.push(`cached HTML unexpected leveled jobs: ${falsePositives.map((j) => j.jobName).join(', ')}`)
    }
  } catch {
    failures.push(`cached HTML fixture missing: ${cachedHtmlPath}`)
  }

  clearLodestoneServiceStateForTests()
  const master = await getLodestoneCharacterProfile(MASTER_ID, 'phase1b-master')

  if (!master.ok) {
    failures.push(`master fetch failed: ${master.status} ${master.body.message}`)
  } else {
    for (const expected of MASTER_EXPECTED_LEVELED) {
      const job = findJob(master.body.profile.jobs, expected.jobName)

      if (!job) {
        failures.push(`master live missing job: ${expected.jobName}`)
        continue
      }

      if (job.jobId !== expected.jobId) {
        failures.push(`master live ${expected.jobName} jobId expected ${expected.jobId}, got ${job.jobId}`)
      }

      if (job.level !== expected.level) {
        failures.push(`master live ${expected.jobName} level expected ${expected.level}, got ${job.level}`)
      }
    }

    for (const cappedName of MASTER_EXPECTED_CAPPED) {
      const job = findJob(master.body.profile.jobs, cappedName)

      if (!job?.isCapped) {
        failures.push(`master live ${cappedName} should be capped`)
      }
    }

    const unleveled = master.body.profile.jobs.filter((job) => job.level === 0)

    if (unleveled.length !== master.body.profile.jobs.length - MASTER_EXPECTED_LEVELED.length) {
      failures.push(
        `master unleveled count expected ${master.body.profile.jobs.length - MASTER_EXPECTED_LEVELED.length}, got ${unleveled.length}`,
      )
    }
  }

  await sleep(5500)

  clearLodestoneServiceStateForTests()
  const regression = await getLodestoneCharacterProfile(REGRESSION_ID, 'phase1b-regression')

  if (!regression.ok) {
    failures.push(`regression fetch failed: ${regression.status} ${regression.body.message}`)
  } else {
    const capped = regression.body.profile.jobs.filter((job) => job.isCapped)

    if (capped.length === 0) {
      failures.push('regression expected at least one capped job')
    }

    const lnc = findJob(regression.body.profile.jobs, '槍術士')

    if (!lnc || lnc.level !== 100 || !lnc.isCapped) {
      failures.push(`regression 槍術士 expected Lv100 capped, got Lv${lnc?.level ?? 'missing'}`)
    }

    const falseLv100 = regression.body.profile.jobs.filter(
      (job) => job.level >= 100 && job.jobName !== '槍術士',
    )

    if (falseLv100.length > 0) {
      failures.push(`regression unexpected Lv100 jobs: ${falseLv100.map((j) => j.jobName).join(', ')}`)
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    masterId: MASTER_ID,
    regressionId: REGRESSION_ID,
    master: master.ok
      ? {
          name: master.body.profile.name,
          leveled: master.body.profile.jobs.filter((job) => job.level > 0),
          capped: master.body.profile.jobs.filter((job) => job.isCapped),
        }
      : master,
    regression: regression.ok
      ? {
          name: regression.body.profile.name,
          leveled: regression.body.profile.jobs.filter((job) => job.level > 0),
          capped: regression.body.profile.jobs.filter((job) => job.isCapped),
        }
      : regression,
    failures,
    pass: failures.length === 0,
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))

  if (failures.length > 0) {
    throw new Error(`Lodestone phase1b verify failed:\n${failures.join('\n')}`)
  }

  console.log('Lodestone phase1b verify passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
