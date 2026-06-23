import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outputDir = path.join(rootDir, 'public', 'icons', 'jobs')

/** Keep in sync with src/data/jobDisplayCatalog.ts */
const JOB_ICON_CDN_SOURCES = {
  PLD: 'https://lds-img.finalfantasyxiv.com/h/E/d0Tx-vhnsMYfYpGe9MvslemEfg.png',
  WAR: 'https://lds-img.finalfantasyxiv.com/h/y/A3UhbjZvDeN3tf_6nJ85VP0RY0.png',
  DRK: 'https://lds-img.finalfantasyxiv.com/h/l/5CZEvDOMYMyVn2td9LZigsgw9s.png',
  GNB: 'https://lds-img.finalfantasyxiv.com/h/8/hg8ofSSOKzqng290No55trV4mI.png',
  WHM: 'https://xivapi.com/cj/companion/whitemage.png',
  SCH: 'https://lds-img.finalfantasyxiv.com/h/7/WdFey0jyHn9Nnt1Qnm-J3yTg5s.png',
  AST: 'https://lds-img.finalfantasyxiv.com/h/1/erCgjnMSiab4LiHpWxVc-tXAqk.png',
  SGE: 'https://lds-img.finalfantasyxiv.com/h/g/_oYApASVVReLLmsokuCJGkEpk0.png',
  MNK: 'https://xivapi.com/cj/companion/monk.png',
  DRG: 'https://xivapi.com/cj/companion/dragoon.png',
  RPR: 'https://lds-img.finalfantasyxiv.com/h/7/cLlXUaeMPJDM2nBhIeM-uDmPzM.png',
  NIN: 'https://xivapi.com/cj/companion/ninja.png',
  SAM: 'https://lds-img.finalfantasyxiv.com/h/m/KndG72XtCFwaq1I1iqwcmO_0zc.png',
  VPR: 'https://lds-img.finalfantasyxiv.com/h/C/WojNTqMJ_Ye1twvkIhw825zc20.png',
  BRD: 'https://xivapi.com/cj/companion/bard.png',
  MCH: 'https://lds-img.finalfantasyxiv.com/h/E/vmtbIlf6Uv8rVp2YFCWA25X0dc.png',
  DNC: 'https://lds-img.finalfantasyxiv.com/h/t/HK0jQ1y7YV9qm30cxGOVev6Cck.png',
  BLM: 'https://xivapi.com/cj/companion/blackmage.png',
  SMN: 'https://xivapi.com/cj/companion/summoner.png',
  RDM: 'https://lds-img.finalfantasyxiv.com/h/q/s3MlLUKmRAHy0pH57PnFStHmIw.png',
  PCT: 'https://lds-img.finalfantasyxiv.com/h/_/kLob-U-yh652LQPX1NHpLlUYQY.png',
  BLU: 'https://lds-img.finalfantasyxiv.com/h/p/jdV3RRKtWzgo226CC09vjen5sk.png',
  MIN: 'https://lds-img.finalfantasyxiv.com/h/A/aM2Dd6Vo4HW_UGasK7tLuZ6fu4.png',
  BTN: 'https://lds-img.finalfantasyxiv.com/h/I/jGRnjIlwWridqM-mIPNew6bhHM.png',
  FSH: 'https://lds-img.finalfantasyxiv.com/h/x/B4Azydbn7Prubxt7OL9p1LZXZ0.png',
  CRP: 'https://lds-img.finalfantasyxiv.com/h/v/YCN6F-xiXf03Ts3pXoBihh2OBk.png',
  BSM: 'https://lds-img.finalfantasyxiv.com/h/5/EEHVV5cIPkOZ6v5ALaoN5XSVRU.png',
  ARM: 'https://lds-img.finalfantasyxiv.com/h/G/Rq5wcK3IPEaAB8N-T9l6tBPxCY.png',
  GSM: 'https://lds-img.finalfantasyxiv.com/h/L/LbEjgw0cwO_2gQSmhta9z03pjM.png',
  LTW: 'https://lds-img.finalfantasyxiv.com/h/b/ACAcQe3hWFxbWRVPqxKj_MzDiY.png',
  WVR: 'https://lds-img.finalfantasyxiv.com/h/X/E69jrsOMGFvFpCX87F5wqgT_Vo.png',
  ALC: 'https://lds-img.finalfantasyxiv.com/h/C/bBVQ9IFeXqjEdpuIxmKvSkqalE.png',
  CUL: 'https://lds-img.finalfantasyxiv.com/h/m/1kMI2v_KEVgo30RFvdFCyySkFo.png',
}

/** XIVAPI companion fallback when Lodestone CDN URL is wrong or unavailable. */
const XIVAPI_COMPANION_FALLBACK = {
  WHM: 'https://xivapi.com/cj/companion/whitemage.png',
  MNK: 'https://xivapi.com/cj/companion/monk.png',
  DRG: 'https://xivapi.com/cj/companion/dragoon.png',
  NIN: 'https://xivapi.com/cj/companion/ninja.png',
  BRD: 'https://xivapi.com/cj/companion/bard.png',
  BLM: 'https://xivapi.com/cj/companion/blackmage.png',
  SMN: 'https://xivapi.com/cj/companion/summoner.png',
}

async function downloadIcon(jobId, url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`${jobId}: HTTP ${response.status} for ${url}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const outputPath = path.join(outputDir, `${jobId}.png`)
  await writeFile(outputPath, buffer)
  console.log(`saved ${jobId} (${buffer.length} bytes)`)
}

async function main() {
  await mkdir(outputDir, { recursive: true })

  const failures = []

  for (const [jobId, url] of Object.entries(JOB_ICON_CDN_SOURCES)) {
    try {
      await downloadIcon(jobId, url)
    } catch (error) {
      const fallback = XIVAPI_COMPANION_FALLBACK[jobId]

      if (!fallback) {
        failures.push({ jobId, error })
        continue
      }

      try {
        console.warn(`${jobId}: primary failed (${error.message}), trying fallback`)
        await downloadIcon(jobId, fallback)
      } catch (fallbackError) {
        failures.push({ jobId, error: fallbackError })
      }
    }
  }

  if (failures.length > 0) {
    console.error('Failed downloads:')
    for (const failure of failures) {
      console.error(`  ${failure.jobId}: ${failure.error.message}`)
    }
    process.exitCode = 1
  }
}

await main()
