import { chromium, devices } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../src/assets/help')
const BASE_CANDIDATES = [
  process.env.BASE_URL,
  'http://localhost:5173/',
  'http://localhost:5174/',
  'http://localhost:5200/',
].filter(Boolean)

fs.mkdirSync(OUT, { recursive: true })

async function resolveBaseUrl() {
  for (const base of BASE_CANDIDATES) {
    try {
      const response = await fetch(base)
      if (response.ok) {
        return base
      }
    } catch {
      // try next
    }
  }

  throw new Error(`Dev server not reachable: ${BASE_CANDIDATES.join(', ')}`)
}

async function ensureEditMode(page) {
  const editButton = page.locator('button:has-text("編集モード")')
  if (await editButton.isVisible().catch(() => false)) {
    await editButton.click()
    await page.waitForTimeout(300)
  }
}

async function captureInputIntro(page, prefix) {
  const characterSummary = page.locator('.characterSummary').first()
  await characterSummary.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)

  const box = await characterSummary.boundingBox()
  if (!box) {
    throw new Error('characterSummary not found')
  }

  await page.screenshot({
    path: path.join(OUT, `help_${prefix}_input.png`),
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, 620),
      height: Math.min(box.height, 420),
    },
  })
}

async function captureLodestoneForm(page, prefix) {
  const lodestoneForm = page.locator('.lodestoneEditForm').first()
  await lodestoneForm.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await lodestoneForm.screenshot({
    path: path.join(OUT, `help_${prefix}_lodestone.png`),
  })
}

async function captureWantSearch(page) {
  const targetSearch = page.locator('.mainWant .targetSearch').first()
  await targetSearch.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)

  const searchInput = targetSearch.locator('input[type="search"]')
  await searchInput.fill('マウント')
  await page.waitForTimeout(500)

  await targetSearch.screenshot({
    path: path.join(OUT, 'help_02_name.png'),
  })

  await searchInput.fill('')
  await page.waitForTimeout(200)
}

async function captureForwardSearch(page) {
  const targetSearch = page.locator('.mainWant .targetSearch').first()
  await targetSearch.scrollIntoViewIfNeeded()

  const forwardToggle = targetSearch.locator('button.forwardSearchToggle')
  if (await forwardToggle.textContent() === '条件から探す') {
    await forwardToggle.click()
  }

  await page.waitForTimeout(300)

  const forwardPanel = targetSearch.locator('.forwardSearchPanel')
  await forwardPanel.waitFor({ state: 'visible' })
  await forwardPanel.screenshot({
    path: path.join(OUT, 'help_02_forward.png'),
  })

  await forwardToggle.click()
}

async function captureDesktopSet(page) {
  await page.goto(await resolveBaseUrl(), { waitUntil: 'networkidle', timeout: 60000 })
  await ensureEditMode(page)
  await captureInputIntro(page, '01')
  await captureLodestoneForm(page, '01')
  await captureWantSearch(page)
  await captureForwardSearch(page)
}

async function captureMobileSet(page) {
  await page.goto(await resolveBaseUrl(), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await ensureEditMode(page)
  await captureInputIntro(page, '05')
  await captureLodestoneForm(page, '05')
}

async function main() {
  const base = await resolveBaseUrl()
  console.log(`Using ${base}`)

  const browser = await chromium.launch({ headless: true })

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await captureDesktopSet(desktop)
  await desktop.close()

  const mobileContext = await browser.newContext({ ...devices['iPhone 13'] })
  const mobile = await mobileContext.newPage()
  await captureMobileSet(mobile)
  await mobile.close()

  await browser.close()
  console.log(`Saved help screenshots to ${OUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
