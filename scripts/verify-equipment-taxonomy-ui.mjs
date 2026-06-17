import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/'
const RHYTHM = '機工城アレキサンダー零式：律動編'

async function openForwardSearch(page) {
  const panel = page.locator('.targetSearch').first()
  await panel.locator('button.forwardSearchToggle').click()
  await page.waitForSelector('.forwardSearchPanel', { state: 'visible' })
  return panel.locator('.forwardSearchPanel')
}

async function selectByLabel(panel, labelText, value) {
  const select = panel.locator(`label:has-text("${labelText}") select`)
  await select.selectOption(value)
}

async function getTaxonomyOptions(panel) {
  const select = panel.locator('label:has-text("④ 分類") select')
  if (!(await select.isVisible())) return []
  return select.locator('option').evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        value: node.value,
        text: node.textContent?.trim() ?? '',
        parent: node.parentElement?.tagName ?? '',
        parentLabel: node.parentElement?.label ?? '',
      }))
      .filter((o) => o.value),
  )
}

async function getCandidateCount(panel) {
  const title = panel.locator('.forwardSearchCandidatesTitle span')
  if (!(await title.isVisible())) return null
  const text = await title.textContent()
  const match = text?.match(/(\d+)件/)
  return match ? Number(match[1]) : null
}

async function getCandidateNames(panel) {
  return panel.locator('.forwardSearchResultList button span').allTextContents()
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge',
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const report = { base: BASE, checks: {}, failures: [] }

  await page.goto(BASE, { waitUntil: 'networkidle' })

  // --- Equipment taxonomy ---
  const panel = await openForwardSearch(page)
  await selectByLabel(panel, '① 種類', '装備')
  await selectByLabel(panel, '② 入手カテゴリ', '零式')
  await selectByLabel(panel, '③ コンテンツ', RHYTHM)

  const taxonomy = await getTaxonomyOptions(panel)
  report.checks.rhythmTaxonomy = taxonomy

  const expectedTaxonomy = [
    '頭（21）',
    'タンク（3）',
    'ヒーラー（3）',
    'メレー（6）',
    'レンジ（6）',
    'キャスター（3）',
  ]
  const taxonomyTexts = taxonomy.map((o) => o.text)
  if (!expectedTaxonomy.every((label) => taxonomyTexts.includes(label))) {
    report.failures.push(`taxonomy mismatch: got ${taxonomyTexts.join(', ')}`)
  }
  if (taxonomyTexts.some((t) => t.includes('共通'))) {
    report.failures.push('共通 should be hidden (0 count)')
  }

  const slotGroup = taxonomy.filter((o) => o.parent === 'OPTGROUP' && o.parentLabel === '部位')
  const roleGroup = taxonomy.filter((o) => o.parent === 'OPTGROUP' && o.parentLabel === 'ロール')
  report.checks.optgroups = { slot: slotGroup.length, role: roleGroup.length }
  if (slotGroup.length !== 1 || roleGroup.length !== 5) {
    report.failures.push(`optgroup counts: slot=${slotGroup.length}, role=${roleGroup.length}`)
  }

  await selectByLabel(panel, '④ 分類', '頭')
  const headCount = await getCandidateCount(panel)
  const headNames = await getCandidateNames(panel)
  report.checks.head = { count: headCount, sample: headNames.slice(0, 3) }
  if (headCount !== 21) report.failures.push(`頭 filter: expected 21, got ${headCount}`)

  await selectByLabel(panel, '④ 分類', 'ヒーラー')
  const healerCount = await getCandidateCount(panel)
  report.checks.healer = { count: healerCount }
  if (healerCount !== 3) report.failures.push(`ヒーラー filter: expected 3, got ${healerCount}`)

  await selectByLabel(panel, '④ 分類', 'タンク')
  const tankCount = await getCandidateCount(panel)
  report.checks.tank = { count: tankCount }
  if (tankCount !== 3) report.failures.push(`タンク filter: expected 3, got ${tankCount}`)

  // --- Reverse name search ---
  await page.locator('.targetSearch').first().locator('button.forwardSearchToggle').click()
  const searchInput = page.locator('.targetSearch').first().locator('input[type="search"]')
  await searchInput.fill('オメガ・ディフェンダー')
  await page.waitForTimeout(300)
  const reverseCount = await page.locator('.targetSearch').first().locator('.searchResultList button').count()
  report.checks.reverseSearch = { query: 'オメガ・ディフェンダー', count: reverseCount }
  if (reverseCount < 1) report.failures.push('reverse search returned no results')

  // --- Unsupported item button ---
  await searchInput.fill('')
  const unsupportedVisible = await page.locator('.unsupportedTargetSelect').first().isVisible()
  report.checks.unsupportedButton = unsupportedVisible
  if (!unsupportedVisible) report.failures.push('unsupported item button missing')

  // --- Non-equipment forward search (マウント) ---
  const panel2 = await openForwardSearch(page)
  await selectByLabel(panel2, '① 種類', 'マウント')
  const acqOptions = await panel2.locator('label:has-text("② 入手カテゴリ") select option').evaluateAll((nodes) =>
    nodes.map((n) => n.value).filter(Boolean),
  )
  report.checks.mountAcquisitionOptions = acqOptions.length
  if (acqOptions.length < 1) report.failures.push('マウント acquisition categories empty')

  const hasDetailNotTaxonomy = !(await panel2.locator('label:has-text("④ 分類")').isVisible())
  report.checks.mountUsesDetailNotTaxonomy = hasDetailNotTaxonomy

  // --- Card generation: select item from forward search ---
  await page.locator('.targetSearch').first().locator('button.forwardSearchToggle').click()
  const panel3 = await openForwardSearch(page)
  await selectByLabel(panel3, '① 種類', '装備')
  await selectByLabel(panel3, '② 入手カテゴリ', '零式')
  await selectByLabel(panel3, '③ コンテンツ', RHYTHM)
  await selectByLabel(panel3, '④ 分類', 'タンク')
  const firstCandidate = panel3.locator('.forwardSearchResultList button').first()
  const selectedName = await firstCandidate.locator('span').textContent()
  await firstCandidate.click()
  await page.waitForTimeout(400)
  const wantSlotText = await page.locator('.mainWant').textContent()
  report.checks.cardSelection = { selectedName, wantSlotContains: wantSlotText?.includes(selectedName?.trim() ?? '') ?? false }
  if (!report.checks.cardSelection.wantSlotContains) {
    report.failures.push('selected item not reflected on card')
  }

  // --- PNG export ---
  await page.click('button:has-text("プレビューモード")')
  await page.waitForTimeout(400)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.click('button.cardExportButton'),
  ])
  const pngPath = await download.path()
  report.checks.pngExport = {
    filename: download.suggestedFilename(),
    ok: Boolean(pngPath),
  }
  if (!pngPath) report.failures.push('PNG export failed')

  await browser.close()

  mkdirSync('scripts/output', { recursive: true })
  writeFileSync('scripts/output/equipment-taxonomy-ui-verify.json', JSON.stringify(report, null, 2))

  console.log(JSON.stringify(report, null, 2))
  if (report.failures.length) {
    console.error('FAILURES:', report.failures.join('; '))
    process.exit(1)
  }
  console.log('All UI checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
