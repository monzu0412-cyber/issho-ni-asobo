export const INTEREST_ICON_SELECTOR = '.activityBox .interestIconImage'

export type InterestIconSource = 'browser-dom' | 'html2canvas-clone'

export type InterestIconMetrics = {
  index: number
  alt: string
  found: boolean
  width: string
  height: string
  computedWidthPx: number
  computedHeightPx: number
  rectWidth: number
  rectHeight: number
  offsetWidth: number
  offsetHeight: number
  naturalWidth: number
  naturalHeight: number
  maxWidth: string
  maxHeight: string
  objectFit: string
  objectPosition: string
  transform: string
  display: string
  aspectRatio: string
  parentWidth: string
  parentHeight: string
  parentRectWidth: number
  parentRectHeight: number
  parentOffsetWidth: number
  parentOffsetHeight: number
  imageComplete: boolean
  currentSrc: string
}

export type InterestIconSnapshot = {
  source: InterestIconSource
  selector: string
  icons: InterestIconMetrics[]
}

export type InterestIconFieldDiff = {
  index: number
  alt: string
  field: string
  browserValue: string
  cloneValue: string
}

export type InterestIconComparison = {
  browser: InterestIconSnapshot
  clone: InterestIconSnapshot | null
  fieldDiffs: InterestIconFieldDiff[]
  verdict: 'css-clone-drift' | 'css-match-img-render-issue' | 'inconclusive'
  verdictReason: string
}

const TRACKED_FIELDS: Array<keyof InterestIconMetrics> = [
  'width',
  'height',
  'computedWidthPx',
  'computedHeightPx',
  'rectWidth',
  'rectHeight',
  'offsetWidth',
  'offsetHeight',
  'naturalWidth',
  'naturalHeight',
  'maxWidth',
  'maxHeight',
  'objectFit',
  'objectPosition',
  'transform',
  'display',
  'aspectRatio',
  'parentWidth',
  'parentHeight',
  'parentRectWidth',
  'parentRectHeight',
  'parentOffsetWidth',
  'parentOffsetHeight',
  'imageComplete',
  'currentSrc',
]

function roundPx(value: number) {
  return Math.round(value * 100) / 100
}

function measureSingleIcon(iconElement: HTMLElement, index: number): InterestIconMetrics {
  const style = getComputedStyle(iconElement)
  const rect = iconElement.getBoundingClientRect()
  const parent = iconElement.parentElement
  const parentStyle = parent instanceof HTMLElement ? getComputedStyle(parent) : null
  const parentRect = parent instanceof HTMLElement ? parent.getBoundingClientRect() : null
  const label = parent?.querySelector('strong')
  const alt = label instanceof HTMLElement ? label.textContent?.trim() ?? `(icon-${index})` : `(icon-${index})`

  return {
    index,
    alt,
    found: true,
    width: style.width,
    height: style.height,
    computedWidthPx: roundPx(rect.width),
    computedHeightPx: roundPx(rect.height),
    rectWidth: roundPx(rect.width),
    rectHeight: roundPx(rect.height),
    offsetWidth: iconElement.offsetWidth,
    offsetHeight: iconElement.offsetHeight,
    naturalWidth: 0,
    naturalHeight: 0,
    maxWidth: style.maxWidth,
    maxHeight: style.maxHeight,
    objectFit: style.backgroundSize,
    objectPosition: style.backgroundPosition,
    transform: style.transform === 'none' ? 'none' : style.transform,
    display: style.display,
    aspectRatio: style.aspectRatio,
    parentWidth: parentStyle?.width ?? '(missing)',
    parentHeight: parentStyle?.height ?? '(missing)',
    parentRectWidth: parentRect ? roundPx(parentRect.width) : 0,
    parentRectHeight: parentRect ? roundPx(parentRect.height) : 0,
    parentOffsetWidth: parent instanceof HTMLElement ? parent.offsetWidth : 0,
    parentOffsetHeight: parent instanceof HTMLElement ? parent.offsetHeight : 0,
    imageComplete: style.backgroundImage !== 'none',
    currentSrc: style.backgroundImage,
  }
}

export function measureInterestIconSnapshot(
  root: ParentNode,
  source: InterestIconSource,
): InterestIconSnapshot {
  const images = Array.from(root.querySelectorAll(INTEREST_ICON_SELECTOR))

  return {
    source,
    selector: INTEREST_ICON_SELECTOR,
    icons: images.map((node, index) => {
      if (!(node instanceof HTMLElement)) {
        return {
          index,
          alt: `(non-image-${index})`,
          found: false,
          width: '(missing)',
          height: '(missing)',
          computedWidthPx: 0,
          computedHeightPx: 0,
          rectWidth: 0,
          rectHeight: 0,
          offsetWidth: 0,
          offsetHeight: 0,
          naturalWidth: 0,
          naturalHeight: 0,
          maxWidth: '(missing)',
          maxHeight: '(missing)',
          objectFit: '(missing)',
          objectPosition: '(missing)',
          transform: '(missing)',
          display: '(missing)',
          aspectRatio: '(missing)',
          parentWidth: '(missing)',
          parentHeight: '(missing)',
          parentRectWidth: 0,
          parentRectHeight: 0,
          parentOffsetWidth: 0,
          parentOffsetHeight: 0,
          imageComplete: false,
          currentSrc: '(missing)',
        }
      }

      return measureSingleIcon(node, index)
    }),
  }
}

function formatMetricValue(value: string | number | boolean) {
  return String(value)
}

function valuesEqual(field: keyof InterestIconMetrics, browserValue: unknown, cloneValue: unknown) {
  if (typeof browserValue === 'number' && typeof cloneValue === 'number') {
    if (field.includes('Width') || field.includes('Height') || field.includes('Px')) {
      return Math.abs(browserValue - cloneValue) <= 0.5
    }
  }

  return formatMetricValue(browserValue as string | number | boolean)
    === formatMetricValue(cloneValue as string | number | boolean)
}

export function compareInterestIconSnapshots(
  browser: InterestIconSnapshot,
  clone: InterestIconSnapshot | null,
): InterestIconComparison {
  if (!clone) {
    return {
      browser,
      clone: null,
      fieldDiffs: [],
      verdict: 'inconclusive',
      verdictReason: 'html2canvas clone snapshot was not captured.',
    }
  }

  const fieldDiffs: InterestIconFieldDiff[] = []
  const iconCount = Math.max(browser.icons.length, clone.icons.length)

  for (let index = 0; index < iconCount; index += 1) {
    const browserIcon = browser.icons[index]
    const cloneIcon = clone.icons[index]

    if (!browserIcon?.found || !cloneIcon?.found) {
      fieldDiffs.push({
        index,
        alt: browserIcon?.alt ?? cloneIcon?.alt ?? `(icon-${index})`,
        field: 'found',
        browserValue: browserIcon?.found ? 'yes' : 'no',
        cloneValue: cloneIcon?.found ? 'yes' : 'no',
      })
      continue
    }

    for (const field of TRACKED_FIELDS) {
      const browserValue = browserIcon[field]
      const cloneValue = cloneIcon[field]

      if (!valuesEqual(field, browserValue, cloneValue)) {
        fieldDiffs.push({
          index,
          alt: browserIcon.alt,
          field,
          browserValue: formatMetricValue(browserValue),
          cloneValue: formatMetricValue(cloneValue),
        })
      }
    }
  }

  let verdict: InterestIconComparison['verdict'] = 'css-match-img-render-issue'
  let verdictReason =
    'Browser DOM and clone computed/layout values match for interest icons. If PNG still stretches icons, html2canvas image rendering or source image loading is the likely cause.'

  if (fieldDiffs.length > 0) {
    verdict = 'css-clone-drift'
    verdictReason = `Interest icon CSS/layout differs between browser DOM and clone (${fieldDiffs.length} field diff(s)).`
  }

  return {
    browser,
    clone,
    fieldDiffs,
    verdict,
    verdictReason,
  }
}

function formatIconBlock(icon: InterestIconMetrics) {
  if (!icon.found) {
    return [`#${icon.index} ${icon.alt}: (not found)`]
  }

  return [
    `#${icon.index} ${icon.alt}`,
    `  width: ${icon.width}`,
    `  height: ${icon.height}`,
    `  rectWidth: ${icon.rectWidth}`,
    `  rectHeight: ${icon.rectHeight}`,
    `  offsetWidth: ${icon.offsetWidth}`,
    `  offsetHeight: ${icon.offsetHeight}`,
    `  naturalWidth: ${icon.naturalWidth}`,
    `  naturalHeight: ${icon.naturalHeight}`,
    `  max-width: ${icon.maxWidth}`,
    `  max-height: ${icon.maxHeight}`,
    `  object-fit: ${icon.objectFit}`,
    `  object-position: ${icon.objectPosition}`,
    `  transform: ${icon.transform}`,
    `  display: ${icon.display}`,
    `  aspect-ratio: ${icon.aspectRatio}`,
    `  parent .interestName width: ${icon.parentWidth}`,
    `  parent .interestName height: ${icon.parentHeight}`,
    `  parent rectWidth: ${icon.parentRectWidth}`,
    `  parent rectHeight: ${icon.parentRectHeight}`,
    `  parent offsetWidth: ${icon.parentOffsetWidth}`,
    `  parent offsetHeight: ${icon.parentOffsetHeight}`,
    `  imageComplete: ${icon.imageComplete ? 'yes' : 'no'}`,
    `  currentSrc: ${icon.currentSrc}`,
  ]
}

export function formatInterestIconSnapshot(snapshot: InterestIconSnapshot) {
  const lines = [
    `[${snapshot.source}] selector: ${snapshot.selector}`,
    `icon count: ${snapshot.icons.length}`,
    '',
  ]

  if (snapshot.icons.length === 0) {
    lines.push('(no icons found)')
    return lines.join('\n')
  }

  for (const icon of snapshot.icons) {
    lines.push(...formatIconBlock(icon), '')
  }

  return lines.join('\n').trimEnd()
}

export function formatInterestIconComparison(comparison: InterestIconComparison) {
  const lines = [
    '=== Interest icon diagnostics ===',
    '',
    formatInterestIconSnapshot(comparison.browser),
    '',
  ]

  if (comparison.clone) {
    lines.push(formatInterestIconSnapshot(comparison.clone), '')
  } else {
    lines.push('[html2canvas-clone] (missing)', '')
  }

  lines.push('--- field diffs ---')

  if (comparison.fieldDiffs.length === 0) {
    lines.push('none')
  } else {
    for (const diff of comparison.fieldDiffs) {
      lines.push(
        `#${diff.index} ${diff.alt} ${diff.field}: browser=${diff.browserValue} clone=${diff.cloneValue}`,
      )
    }
  }

  lines.push(
    '',
    `verdict: ${comparison.verdict}`,
    `reason: ${comparison.verdictReason}`,
  )

  return lines.join('\n')
}
