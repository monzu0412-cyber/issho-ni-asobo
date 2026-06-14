export type CardLayoutSource = 'browser-dom' | 'html2canvas-clone'

export type RowLayoutMetrics = {
  name: string
  selector: string
  found: boolean
  height: number
  offsetHeight: number
  top: number
  bottom: number
}

export type SampleStyleMetrics = {
  selector: string
  found: boolean
  fontSize: string
  lineHeight: string
  transform: string
}

export type CardLayoutSnapshot = {
  source: CardLayoutSource
  cardWidth: number
  cardHeight: number
  cardScrollHeight: number
  cardOffsetHeight: number
  previewModeActive: boolean
  ancestorClasses: string[]
  cssVariables: Record<string, string>
  rows: RowLayoutMetrics[]
  sampleStyles: SampleStyleMetrics[]
}

export type CardLayoutComparison = {
  browser: CardLayoutSnapshot
  clone: CardLayoutSnapshot | null
  rowHeightDiffs: Array<{
    name: string
    browserHeight: number
    cloneHeight: number
    delta: number
  }>
  cardHeightDelta: number | null
  previewModeMismatch: boolean | null
  cssVariableDiffs: Array<{
    name: string
    browserValue: string
    cloneValue: string
  }>
  verdict: 'html2canvas-clone-drift' | 'layout-css-issue' | 'inconclusive'
  verdictReason: string
}

const ROW_SELECTORS = [
  { name: '1段目', selector: '.heroLayout' },
  { name: '2段目', selector: '.middleRow' },
  { name: '3段目', selector: '.activityBox' },
  { name: '4段目', selector: '.bottomRow' },
] as const

const CSS_VARIABLE_NAMES = [
  '--layout-profile-image-size',
  '--layout-main-want-height',
  '--layout-row3-height',
] as const

const SAMPLE_STYLE_SELECTORS = [
  '.profilePhoto',
  '.mainWant h2',
  '.activityBox .interestIconImage',
  '.todoSummary strong',
  '.messageBox p',
] as const

function readCssVariables(element: HTMLElement, doc: Document) {
  const cardStyle = getComputedStyle(element)
  const appElement = element.closest('.app') ?? doc.querySelector('.app')
  const appStyle = appElement instanceof HTMLElement ? getComputedStyle(appElement) : null

  return Object.fromEntries(
    CSS_VARIABLE_NAMES.map((name) => {
      const fromApp = appStyle?.getPropertyValue(name).trim() ?? ''
      const fromCard = cardStyle.getPropertyValue(name).trim()
      return [name, fromApp || fromCard || '(empty)']
    }),
  )
}

function measureRow(card: HTMLElement, rowSelector: string, rowName: string): RowLayoutMetrics {
  const row = card.querySelector(rowSelector)
  const cardRect = card.getBoundingClientRect()

  if (!(row instanceof HTMLElement)) {
    return {
      name: rowName,
      selector: rowSelector,
      found: false,
      height: 0,
      offsetHeight: 0,
      top: 0,
      bottom: 0,
    }
  }

  const rowRect = row.getBoundingClientRect()

  return {
    name: rowName,
    selector: rowSelector,
    found: true,
    height: Math.round(rowRect.height),
    offsetHeight: row.offsetHeight,
    top: Math.round(rowRect.top - cardRect.top),
    bottom: Math.round(rowRect.bottom - cardRect.top),
  }
}

function measureSampleStyles(card: HTMLElement): SampleStyleMetrics[] {
  return SAMPLE_STYLE_SELECTORS.map((selector) => {
    const element = card.querySelector(selector)

    if (!(element instanceof HTMLElement)) {
      return {
        selector,
        found: false,
        fontSize: '(missing)',
        lineHeight: '(missing)',
        transform: '(missing)',
      }
    }

    const style = getComputedStyle(element)

    return {
      selector,
      found: true,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      transform: style.transform === 'none' ? 'none' : style.transform,
    }
  })
}

function collectAncestorClasses(element: HTMLElement) {
  const classes: string[] = []
  let current: HTMLElement | null = element

  while (current) {
    if (current.className) {
      classes.push(`${current.tagName.toLowerCase()}${current.id ? `#${current.id}` : ''}.${String(current.className).trim().replace(/\s+/g, '.')}`)
    }

    current = current.parentElement
  }

  return classes
}

export function measureCardLayout(
  card: HTMLElement,
  doc: Document,
  source: CardLayoutSource,
): CardLayoutSnapshot {
  const rect = card.getBoundingClientRect()

  return {
    source,
    cardWidth: Math.round(rect.width),
    cardHeight: Math.round(rect.height),
    cardScrollHeight: card.scrollHeight,
    cardOffsetHeight: card.offsetHeight,
    previewModeActive: card.closest('.previewMode') != null,
    ancestorClasses: collectAncestorClasses(card),
    cssVariables: readCssVariables(card, doc),
    rows: ROW_SELECTORS.map((row) => measureRow(card, row.selector, row.name)),
    sampleStyles: measureSampleStyles(card),
  }
}

export function compareCardLayoutSnapshots(
  browser: CardLayoutSnapshot,
  clone: CardLayoutSnapshot | null,
): CardLayoutComparison {
  if (!clone) {
    return {
      browser,
      clone: null,
      rowHeightDiffs: [],
      cardHeightDelta: null,
      previewModeMismatch: null,
      cssVariableDiffs: [],
      verdict: 'inconclusive',
      verdictReason: 'html2canvas clone snapshot was not captured.',
    }
  }

  const rowHeightDiffs = browser.rows.map((browserRow) => {
    const cloneRow = clone.rows.find((row) => row.name === browserRow.name)
    const cloneHeight = cloneRow?.height ?? 0

    return {
      name: browserRow.name,
      browserHeight: browserRow.height,
      cloneHeight,
      delta: cloneHeight - browserRow.height,
    }
  })

  const cardHeightDelta = clone.cardHeight - browser.cardHeight
  const previewModeMismatch = browser.previewModeActive !== clone.previewModeActive

  const cssVariableDiffs = CSS_VARIABLE_NAMES.flatMap((name) => {
    const browserValue = browser.cssVariables[name] ?? ''
    const cloneValue = clone.cssVariables[name] ?? ''

    if (browserValue === cloneValue) {
      return []
    }

    return [{ name, browserValue, cloneValue }]
  })

  const rowDrift = rowHeightDiffs.some((row) => Math.abs(row.delta) > 1)
  const cardDrift = Math.abs(cardHeightDelta) > 1
  const styleContextDrift = previewModeMismatch || cssVariableDiffs.length > 0

  let verdict: CardLayoutComparison['verdict'] = 'layout-css-issue'
  let verdictReason = 'Browser DOM and clone sizes match within 1px. If PNG still looks squashed, inspect html2canvas rendering or viewer scaling.'

  if (rowDrift || cardDrift || styleContextDrift) {
    verdict = 'html2canvas-clone-drift'
    verdictReason = [
      rowDrift ? 'Row heights differ between browser DOM and clone.' : null,
      cardDrift ? `Card height differs by ${cardHeightDelta}px.` : null,
      previewModeMismatch ? 'previewMode class presence differs.' : null,
      cssVariableDiffs.length > 0 ? 'CSS variables differ between browser DOM and clone.' : null,
    ].filter(Boolean).join(' ')
  }

  return {
    browser,
    clone,
    rowHeightDiffs,
    cardHeightDelta,
    previewModeMismatch,
    cssVariableDiffs,
    verdict,
    verdictReason,
  }
}

function formatRowMetrics(rows: RowLayoutMetrics[]) {
  return rows.map((row) => {
    if (!row.found) {
      return `${row.name}: (not found)`
    }

    return `${row.name}: height=${row.height}px offsetHeight=${row.offsetHeight}px top=${row.top}px bottom=${row.bottom}px`
  }).join('\n')
}

function formatSampleStyles(styles: SampleStyleMetrics[]) {
  return styles.map((sample) => {
    if (!sample.found) {
      return `${sample.selector}: (not found)`
    }

    return `${sample.selector}: font-size=${sample.fontSize} line-height=${sample.lineHeight} transform=${sample.transform}`
  }).join('\n')
}

export function formatCardLayoutSnapshot(snapshot: CardLayoutSnapshot) {
  return [
    `[${snapshot.source}]`,
    `card width: ${snapshot.cardWidth}`,
    `card height: ${snapshot.cardHeight}`,
    `card scrollHeight: ${snapshot.cardScrollHeight}`,
    `card offsetHeight: ${snapshot.cardOffsetHeight}`,
    `previewMode active: ${snapshot.previewModeActive ? 'yes' : 'no'}`,
    `ancestor classes:`,
    ...snapshot.ancestorClasses.map((entry) => `  - ${entry}`),
    `css variables:`,
    ...Object.entries(snapshot.cssVariables).map(([name, value]) => `  ${name}: ${value}`),
    `rows:`,
    formatRowMetrics(snapshot.rows),
    `sample styles:`,
    formatSampleStyles(snapshot.sampleStyles),
  ].join('\n')
}

export function formatCardLayoutComparison(comparison: CardLayoutComparison) {
  const lines = [
    '=== Card layout diagnostics ===',
    '',
    formatCardLayoutSnapshot(comparison.browser),
    '',
  ]

  if (comparison.clone) {
    lines.push(formatCardLayoutSnapshot(comparison.clone), '')
  } else {
    lines.push('[html2canvas-clone] (missing)', '')
  }

  lines.push(
    '--- diff ---',
    `card height delta (clone - browser): ${comparison.cardHeightDelta ?? 'n/a'}`,
    ...comparison.rowHeightDiffs.map((row) => `${row.name} height delta: ${row.delta}px (browser=${row.browserHeight}, clone=${row.cloneHeight})`),
    `previewMode mismatch: ${comparison.previewModeMismatch == null ? 'n/a' : comparison.previewModeMismatch ? 'yes' : 'no'}`,
  )

  if (comparison.cssVariableDiffs.length > 0) {
    lines.push('css variable diffs:')
    for (const diff of comparison.cssVariableDiffs) {
      lines.push(`  ${diff.name}: browser=${diff.browserValue} clone=${diff.cloneValue}`)
    }
  } else {
    lines.push('css variable diffs: none')
  }

  lines.push(
    '',
    `verdict: ${comparison.verdict}`,
    `reason: ${comparison.verdictReason}`,
  )

  return lines.join('\n')
}
