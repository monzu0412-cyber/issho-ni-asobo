import { chromium, devices } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5175/'
const STORAGE_KEY = 'issho-asobo-card-draft'
const SAVE_KEY = 'issho-asobo-card-save-enabled'

async function checkDesktop(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.selectOption('label.cardThemePicker:has-text("レイアウト") select', 'asobo')
  await page.waitForTimeout(300)

  return page.evaluate(() => {
    const cardBody = document.querySelector('.cardBody')
    const children = cardBody ? [...cardBody.children].map((el) => el.className) : []
    const hero = document.querySelector('.heroLayout')
    const activity = document.querySelector('.activityBox')
    const middle = document.querySelector('.middleRow')
    const img = hero?.querySelector('.profileImageColumn')
    const character = hero?.querySelector('.characterSummary')
    const imgRect = img?.getBoundingClientRect()
    const characterRect = character?.getBoundingClientRect()
    const activityRect = activity?.getBoundingClientRect()
    const middleRect = middle?.getBoundingClientRect()

    return {
      cardBodyClass: cardBody?.className ?? '',
      rowOrder: children,
      hasCharacterInHero: Boolean(hero?.querySelector('.characterSummary')),
      hasMainWantInHero: Boolean(hero?.querySelector('.mainWant')),
      wantSlotCount: document.querySelectorAll('.wantSlotColumn').length,
      activityBeforeMiddle: activityRect && middleRect ? activityRect.top < middleRect.top : null,
      characterIsLeftOfImage:
        characterRect && imgRect ? characterRect.left < imgRect.left : null,
      activityColumns: activity
        ? [...activity.querySelectorAll(':scope > .activityColumn')].map((el) => {
            const title = el.querySelector('.sectionTitle, .activityColumnTitleMain')?.textContent?.trim()
            return title ?? el.className
          })
        : [],
    }
  })
}

async function getMobileOrder(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.selectOption('label.cardThemePicker:has-text("レイアウト") select', 'asobo')
  await page.waitForTimeout(400)

  return page.evaluate(() => {
    const cardBody = document.querySelector('.cardBody')
    if (!cardBody) return []

    const order = []
    for (const el of cardBody.querySelectorAll(
      '.profileImageColumn, .characterSummary, .activityBox > .activityColumn, .wantSlotColumn, .bottomRow',
    )) {
      if (el.classList.contains('profileImageColumn')) order.push('image')
      else if (el.classList.contains('characterSummary')) order.push('character')
      else if (el.classList.contains('wantSlotColumn')) {
        const title = el.querySelector('.sectionTitle')?.textContent?.trim() ?? 'want'
        order.push(title)
      } else if (el.classList.contains('interestBox')) order.push('interest')
      else if (el.classList.contains('activityColumn')) {
        const mainTitle = el.querySelector('.activityColumnTitleMain')?.textContent?.trim()
        if (mainTitle?.includes('？')) order.push('asobo-question')
        else if (mainTitle?.includes('！')) order.push('asobo-exclaim')
        else order.push('activity-column')
      } else if (el.classList.contains('bottomRow')) order.push('bottom')
    }
    return order
  })
}

async function checkStorage(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ draftKey, saveKey }) => {
    localStorage.removeItem(draftKey)
    localStorage.removeItem(saveKey)
  }, { draftKey: STORAGE_KEY, saveKey: SAVE_KEY })

  await page.reload({ waitUntil: 'domcontentloaded' })
  const saveToggle = page.locator('.draftSaveToggle button')
  if ((await saveToggle.textContent())?.trim() !== 'ON') {
    await saveToggle.click()
  }
  await page.selectOption('label.cardThemePicker:has-text("レイアウト") select', 'asobo')
  await page.waitForTimeout(400)

  const stored = await page.evaluate((key) => {
    const draft = JSON.parse(localStorage.getItem(key) ?? '{}')
    return draft.layoutMode
  }, STORAGE_KEY)

  await page.reload({ waitUntil: 'domcontentloaded' })
  const restored = await page.locator('label.cardThemePicker:has-text("レイアウト") select').inputValue()

  return { stored, restored }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  const desktopData = await checkDesktop(desktop)
  console.log('[Desktop asobo]', JSON.stringify(desktopData, null, 2))

  await desktop.click('button:has-text("プレビューモード")')
  await desktop.waitForTimeout(400)
  const preview = await desktop.evaluate(() => ({
    previewMode: document.querySelector('main.app')?.classList.contains('previewMode'),
    pngButton: Boolean(document.querySelector('button.cardExportButton')),
  }))
  console.log('[Desktop asobo preview]', preview)

  const [download] = await Promise.all([
    desktop.waitForEvent('download', { timeout: 20000 }),
    desktop.click('button.cardExportButton'),
  ])
  console.log('[Desktop asobo PNG]', {
    suggested: download.suggestedFilename(),
    hasFile: Boolean(await download.path()),
  })

  const iphone = await browser.newContext({ ...devices['iPhone 13'] })
  const mobile = await iphone.newPage()
  const mobileOrder = await getMobileOrder(mobile)
  console.log('[Mobile asobo order]', mobileOrder)

  await mobile.click('.cardConfirmButton').catch(() => null)
  await mobile.waitForTimeout(600)
  const modal = await mobile.locator('.cardConfirmModal').isVisible().catch(() => false)
  console.log('[Mobile asobo confirm modal]', modal)

  const storagePage = await browser.newPage()
  const storage = await checkStorage(storagePage)
  console.log('[Asobo storage]', storage)

  await browser.close()

  const failures = []
  if (!desktopData.cardBodyClass.includes('layout-asobo')) failures.push('missing layout-asobo modifier')
  if (!desktopData.hasCharacterInHero || desktopData.hasMainWantInHero) failures.push('row1 wrong')
  if (desktopData.wantSlotCount !== 3) failures.push('expected 3 want slots')
  if (desktopData.activityBeforeMiddle !== true) failures.push('activityBox should be above middleRow')
  if (desktopData.characterIsLeftOfImage !== true) failures.push('character should be left of image')
  if (desktopData.rowOrder[1]?.includes('activityBox') !== true) failures.push('row2 should be activityBox')
  if (desktopData.rowOrder[2]?.includes('middleRow') !== true) failures.push('row3 should be middleRow')

  const expectedMobile = [
    'image',
    'character',
    'interest',
    'asobo-question',
    'asobo-exclaim',
    'ほしいもの1位！',
    'ほしいもの2位！',
    'ほしいもの3位！',
    'bottom',
  ]
  for (let i = 0; i < expectedMobile.length; i += 1) {
    if (mobileOrder[i] !== expectedMobile[i]) {
      failures.push(`mobile order at ${i}: expected ${expectedMobile[i]}, got ${mobileOrder[i]}`)
      break
    }
  }

  if (storage.stored !== 'asobo' || storage.restored !== 'asobo') {
    failures.push(`storage expected asobo, got stored=${storage.stored}, restored=${storage.restored}`)
  }

  if (!modal) failures.push('mobile confirm modal not visible')

  if (failures.length) {
    console.error('FAILURES:', failures.join('; '))
    process.exit(1)
  }
  console.log('Asobo layout checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
