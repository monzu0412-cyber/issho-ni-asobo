import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-preview-verify.json')

const BASE = process.env.BASE_URL ?? 'https://issho-ni-asobo-2u3ay8014-itoshuzo0412-9199s-projects.vercel.app/'
const CHARACTER_ID = process.env.LODESTONE_CHARACTER_ID ?? '60814884'
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? ''

function buildHeaders() {
  if (!BYPASS) {
    return undefined
  }

  return {
    'x-vercel-protection-bypass': BYPASS,
  }
}

async function fetchApiJson(page, path) {
  const url = new URL(path, BASE).toString()
  const response = await page.request.get(url, {
    headers: buildHeaders(),
  })

  const text = await response.text()

  let body = null
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text.slice(0, 500) }
  }

  return {
    url,
    status: response.status(),
    body,
  }
}

async function enableSave(page) {
  const saveButton = page.locator('.draftSavePanel button[role="switch"]')
  const isOn = await saveButton.getAttribute('aria-checked')

  if (isOn !== 'true') {
    await saveButton.click()
    await page.waitForTimeout(200)
  }
}

async function selectLayout(page, layoutMode) {
  await page.selectOption('label.cardThemePicker:has-text("レイアウト") select', layoutMode)
  await page.waitForTimeout(250)
}

async function main() {
  const failures = []
  const notes = []
  const results = {}

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    extraHTTPHeaders: buildHeaders(),
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  const homeResponse = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  results.homeStatus = homeResponse?.status() ?? null

  if (!homeResponse || !homeResponse.ok()) {
    failures.push(`home page not reachable: status ${results.homeStatus}`)
    notes.push('Preview may require Vercel login (Deployment Protection). Set VERCEL_AUTOMATION_BYPASS_SECRET to automate.')
  } else {
    await page.waitForSelector('.cardBody', { timeout: 20000 })
  }

  const apiResult = await fetchApiJson(page, `/api/lodestone/character/${CHARACTER_ID}`)
  results.api = apiResult

  if (apiResult.status === 401) {
    notes.push('API returned 401 (Deployment Protection). Browser login or bypass secret required for Preview API checks.')
  } else if (apiResult.status !== 200 || !apiResult.body?.profile) {
    failures.push(`API check failed: status ${apiResult.status}`)
  } else {
    const { profile } = apiResult.body
    results.apiProfile = {
      name: profile.name,
      dataCenter: profile.dataCenter,
      world: profile.world,
      cappedJobs: profile.jobs.filter((job) => job.isCapped).map((job) => job.jobId),
    }
  }

  if (homeResponse?.ok()) {
    await enableSave(page)
    await selectLayout(page, 'character')

    const lodestoneInput = page.locator('.lodestoneEditForm input[type="text"]')
    await lodestoneInput.fill(CHARACTER_ID)
    await page.click('button:has-text("ロードストーン取得")')
    await page.waitForSelector('.lodestoneApplyPanel', { timeout: 120000 })

    const fetchedName = await page.locator('.lodestoneFetchSuccess').textContent()
    results.fetchSuccessText = fetchedName?.trim() ?? ''

    if (!results.fetchSuccessText.includes('Rogan Stone')) {
      failures.push(`fetch UI did not show Rogan Stone: ${results.fetchSuccessText}`)
    }

    await page.click('button:has-text("カードへ反映")')
    await page.waitForTimeout(400)

    const summaryName = await page.locator('.characterSummary > p').first().textContent()
    results.cardSummaryName = summaryName?.trim() ?? ''

    if (!results.cardSummaryName.includes('Rogan Stone')) {
      failures.push(`card name not applied: ${results.cardSummaryName}`)
    }

    await page.locator('label:has-text("ジョブ") input[type="radio"]').check()
    await page.waitForSelector('.jobRoleGrid', { timeout: 10000 })

    const fadedCount = await page.locator('.jobIconFrame--faded').count()
    results.fadedIconCount = fadedCount

    if (fadedCount < 3) {
      failures.push(`expected at least 3 faded icons, got ${fadedCount}`)
    }

    const pldButton = page.locator('button.jobIconButton[aria-label*="ナイト"]').first()
    const drkButton = page.locator('button.jobIconButton[aria-label*="暗黒騎士"]').first()

    for (let i = 0; i < 2; i += 1) {
      await pldButton.click()
    }
    await drkButton.click()

    const pldGold = await pldButton.locator('.jobIconFrame--gold').count()
    const drkNormal = await drkButton.locator('.jobIconFrame--normal').count()
    results.manualSelection = { pldGold, drkNormal }

    if (pldGold !== 1 || drkNormal !== 1) {
      failures.push('manual job selection states not set as expected')
    }

    const draftBeforeReload = await page.evaluate(() => localStorage.getItem('issho-asobo-card-draft'))
    results.draftSavedBeforeReload = Boolean(draftBeforeReload)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.cardBody', { timeout: 20000 })
    await page.waitForTimeout(500)

    const summaryAfterReload = await page.locator('.characterSummary > p').first().textContent()
    results.cardSummaryAfterReload = summaryAfterReload?.trim() ?? ''

    if (!results.cardSummaryAfterReload.includes('Rogan Stone')) {
      failures.push(`name not persisted after reload: ${results.cardSummaryAfterReload}`)
    }

    const jobsRadio = page.locator('label:has-text("ジョブ") input[type="radio"]')
    if (!(await jobsRadio.isChecked())) {
      failures.push('leftColumnDisplayMode jobs not persisted after reload')
    }

    const pldGoldAfterReload = await page.locator('button.jobIconButton[aria-label*="ナイト"] .jobIconFrame--gold').count()
    const drkNormalAfterReload = await page.locator('button.jobIconButton[aria-label*="暗黒騎士"] .jobIconFrame--normal').count()
    results.afterReloadSelection = { pldGoldAfterReload, drkNormalAfterReload }

    if (pldGoldAfterReload !== 1 || drkNormalAfterReload !== 1) {
      failures.push('job selections not persisted after reload')
    }

    await page.click('button:has-text("再取得")')
    await page.waitForTimeout(1500)

    const refetchMessage = await page.locator('.lodestoneApplySuccess').textContent()
    results.refetchMessage = refetchMessage?.trim() ?? ''

    const pldGoldAfterRefetch = await page.locator('button.jobIconButton[aria-label*="ナイト"] .jobIconFrame--gold').count()
    const drkNormalAfterRefetch = await page.locator('button.jobIconButton[aria-label*="暗黒騎士"] .jobIconFrame--normal').count()
    results.afterRefetchSelection = { pldGoldAfterRefetch, drkNormalAfterRefetch }

    if (pldGoldAfterRefetch !== 1 || drkNormalAfterRefetch !== 1) {
      failures.push('job selections lost after refetch')
    }

    await page.locator('label:has-text("今の興味") input[type="radio"]').check()
    await page.waitForSelector('.interestBox', { timeout: 10000 })
    results.interestsVisible = await page.locator('.interestBox').isVisible()

    await page.locator('label:has-text("ジョブ") input[type="radio"]').check()
    await page.waitForSelector('.jobRoleGrid', { timeout: 10000 })

    await page.click('button:has-text("プレビューモード")')
    await page.waitForTimeout(800)
    results.previewMode = await page.evaluate(() => document.querySelector('main.app')?.classList.contains('previewMode') ?? false)
    await page.waitForSelector('.jobBox .jobIconImage', { timeout: 10000 }).catch(() => null)
    results.previewJobIcons = await page.locator('.jobBox .jobIconImage').count()

    if (!results.previewMode || results.previewJobIcons < 10) {
      failures.push(`preview mode job icons missing (count=${results.previewJobIcons})`)
    }

    const pngDownload = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
    await page.click('button.cardExportButton')
    const download = await pngDownload
    results.pngDownload = download ? download.suggestedFilename() : null

    if (!download) {
      failures.push('PNG download did not start')
    } else {
      const pngPath = resolve(__dirname, 'output/lodestone-preview-export.png')
      await download.saveAs(pngPath)
      results.pngSavedTo = pngPath
    }

    await page.click('button:has-text("編集モード")')
    await page.waitForTimeout(300)

    const placeholder = await page.locator('.lodestoneEditForm input[type="text"]').getAttribute('placeholder')
    results.lodestonePlaceholder = placeholder

    if (placeholder?.includes('60814884')) {
      failures.push('master ID still visible in placeholder')
    }
  }

  await browser.close()

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    characterId: CHARACTER_ID,
    bypassConfigured: Boolean(BYPASS),
    results,
    notes,
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
