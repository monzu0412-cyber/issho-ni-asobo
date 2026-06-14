function roundPx(value: number) {
  return Math.round(value * 100) / 100
}

function readBoxMetrics(element: HTMLElement) {
  const style = getComputedStyle(element)
  const rect = element.getBoundingClientRect()

  return {
    cssWidth: style.width,
    cssHeight: style.height,
    rectWidth: roundPx(rect.width),
    rectHeight: roundPx(rect.height),
    offsetWidth: element.offsetWidth,
    offsetHeight: element.offsetHeight,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    padding: style.padding,
    paddingTop: style.paddingTop,
    paddingRight: style.paddingRight,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    gap: style.gap,
    justifyContent: style.justifyContent,
    alignItems: style.alignItems,
    overflow: style.overflow,
  }
}

export type InterestLayoutSample = {
  index: number
  alt: string
  interestItem: ReturnType<typeof readBoxMetrics>
  interestName: ReturnType<typeof readBoxMetrics>
  img: ReturnType<typeof readBoxMetrics> & {
    naturalWidth: number
    naturalHeight: number
    objectFit: string
    objectPosition: string
    transform: string
    maxWidth: string
    maxHeight: string
  }
  starsHeight: number
  imgWidthUtilizationPct: number
  imgHeightUtilizationPct: number
  horizontalWhitespacePx: number
  verticalWhitespaceInNamePx: number
}

export type InterestLayoutSnapshot = {
  source: 'browser-dom' | 'html2canvas-clone'
  interestGrid: ReturnType<typeof readBoxMetrics> & {
    gridTemplateColumns: string
    columnGap: string
    rowGap: string
    estimatedColumnWidth: number
    itemCount: number
  }
  interestBox: ReturnType<typeof readBoxMetrics> | null
  samples: InterestLayoutSample[]
}

export function measureInterestLayoutSnapshot(
  root: ParentNode,
  source: InterestLayoutSnapshot['source'],
): InterestLayoutSnapshot {
  const grid = root.querySelector('.activityBox .interestGrid')
  const interestBox = root.querySelector('.activityBox .interestBox')
  const items = Array.from(root.querySelectorAll('.activityBox .interestItem'))

  const gridStyle = grid instanceof HTMLElement ? getComputedStyle(grid) : null
  const firstItem = items[0] instanceof HTMLElement ? items[0] : null
  const estimatedColumnWidth = firstItem ? roundPx(firstItem.getBoundingClientRect().width) : 0

  const samples = items.slice(0, 3).map((item, index) => {
    if (!(item instanceof HTMLElement)) {
      throw new Error('Invalid interest item')
    }

    const name = item.querySelector('.interestName')
    const icon = item.querySelector('.interestIconImage')
    const stars = item.querySelector('.stars')

    if (!(name instanceof HTMLElement) || !(icon instanceof HTMLElement)) {
      throw new Error(`Missing interest layout nodes at index ${index}`)
    }

    const itemMetrics = readBoxMetrics(item)
    const nameMetrics = readBoxMetrics(name)
    const iconStyle = getComputedStyle(icon)
    const iconRect = icon.getBoundingClientRect()
    const nameRect = name.getBoundingClientRect()
    const label = name.querySelector('strong')

    const imgMetrics = {
      ...readBoxMetrics(icon),
      naturalWidth: 0,
      naturalHeight: 0,
      objectFit: iconStyle.backgroundSize,
      objectPosition: iconStyle.backgroundPosition,
      transform: iconStyle.transform === 'none' ? 'none' : iconStyle.transform,
      maxWidth: iconStyle.maxWidth,
      maxHeight: iconStyle.maxHeight,
    }

    const starsHeight = stars instanceof HTMLElement ? roundPx(stars.getBoundingClientRect().height) : 0
    const horizontalWhitespacePx = roundPx(Math.max(nameRect.width - iconRect.width, 0))
    const verticalWhitespaceInNamePx = roundPx(Math.max(nameRect.height - iconRect.height, 0))
    const imgWidthUtilizationPct = nameRect.width > 0
      ? roundPx((iconRect.width / nameRect.width) * 100)
      : 0
    const imgHeightUtilizationPct = nameRect.height > 0
      ? roundPx((iconRect.height / nameRect.height) * 100)
      : 0

    return {
      index,
      alt: label instanceof HTMLElement ? label.textContent?.trim() ?? `(icon-${index})` : `(icon-${index})`,
      interestItem: itemMetrics,
      interestName: nameMetrics,
      img: imgMetrics,
      starsHeight,
      imgWidthUtilizationPct,
      imgHeightUtilizationPct,
      horizontalWhitespacePx,
      verticalWhitespaceInNamePx,
    }
  })

  return {
    source,
    interestGrid: {
      ...(grid instanceof HTMLElement ? readBoxMetrics(grid) : {
        cssWidth: '(missing)',
        cssHeight: '(missing)',
        rectWidth: 0,
        rectHeight: 0,
        offsetWidth: 0,
        offsetHeight: 0,
        clientWidth: 0,
        clientHeight: 0,
        padding: '(missing)',
        paddingTop: '(missing)',
        paddingRight: '(missing)',
        paddingBottom: '(missing)',
        paddingLeft: '(missing)',
        gap: '(missing)',
        justifyContent: '(missing)',
        alignItems: '(missing)',
        overflow: '(missing)',
      }),
      gridTemplateColumns: gridStyle?.gridTemplateColumns ?? '(missing)',
      columnGap: gridStyle?.columnGap ?? '(missing)',
      rowGap: gridStyle?.rowGap ?? '(missing)',
      estimatedColumnWidth,
      itemCount: items.length,
    },
    interestBox: interestBox instanceof HTMLElement ? readBoxMetrics(interestBox) : null,
    samples,
  }
}

function formatBox(label: string, box: ReturnType<typeof readBoxMetrics>) {
  return [
    `${label}:`,
    `  css width x height: ${box.cssWidth} x ${box.cssHeight}`,
    `  rect width x height: ${box.rectWidth} x ${box.rectHeight}`,
    `  offset width x height: ${box.offsetWidth} x ${box.offsetHeight}`,
    `  client width x height: ${box.clientWidth} x ${box.clientHeight}`,
    `  padding: ${box.padding}`,
    `  gap: ${box.gap}`,
    `  justify-content: ${box.justifyContent}`,
    `  align-items: ${box.alignItems}`,
    `  overflow: ${box.overflow}`,
  ].join('\n')
}

export function formatInterestLayoutSnapshot(snapshot: InterestLayoutSnapshot) {
  const lines = [
    '=== Interest layout diagnostics ===',
    `[${snapshot.source}]`,
    '',
    '--- interestGrid ---',
    formatBox('grid', snapshot.interestGrid),
    `  grid-template-columns: ${snapshot.interestGrid.gridTemplateColumns}`,
    `  column-gap: ${snapshot.interestGrid.columnGap}`,
    `  row-gap: ${snapshot.interestGrid.rowGap}`,
    `  estimated column width (item rect): ${snapshot.interestGrid.estimatedColumnWidth}px`,
    `  item count: ${snapshot.interestGrid.itemCount}`,
    '',
  ]

  if (snapshot.interestBox) {
    lines.push('--- interestBox ---', formatBox('interestBox', snapshot.interestBox), '')
  }

  for (const sample of snapshot.samples) {
    lines.push(
      `--- sample #${sample.index} ${sample.alt} ---`,
      formatBox('interestItem', sample.interestItem),
      formatBox('interestName', sample.interestName),
      [
        'img:',
        `  css width x height: ${sample.img.cssWidth} x ${sample.img.cssHeight}`,
        `  rect width x height: ${sample.img.rectWidth} x ${sample.img.rectHeight}`,
        `  offset width x height: ${sample.img.offsetWidth} x ${sample.img.offsetHeight}`,
        `  natural width x height: ${sample.img.naturalWidth} x ${sample.img.naturalHeight}`,
        `  max-width: ${sample.img.maxWidth}`,
        `  max-height: ${sample.img.maxHeight}`,
        `  object-fit: ${sample.img.objectFit}`,
        `  object-position: ${sample.img.objectPosition}`,
        `  transform: ${sample.img.transform}`,
      ].join('\n'),
      `  stars height: ${sample.starsHeight}px`,
      `  img width utilization in interestName: ${sample.imgWidthUtilizationPct}%`,
      `  img height utilization in interestName: ${sample.imgHeightUtilizationPct}%`,
      `  horizontal whitespace in interestName: ${sample.horizontalWhitespacePx}px`,
      `  vertical whitespace in interestName: ${sample.verticalWhitespaceInNamePx}px`,
      '',
    )
  }

  return lines.join('\n').trimEnd()
}
