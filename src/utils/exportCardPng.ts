import html2canvas from 'html2canvas'
import {
  formatInterestLayoutSnapshot,
  measureInterestLayoutSnapshot,
} from './interestLayoutDiagnostics'
import {
  compareInterestIconSnapshots,
  formatInterestIconComparison,
  measureInterestIconSnapshot,
  type InterestIconComparison,
  type InterestIconSnapshot,
} from './interestIconDiagnostics'
import {
  compareCardLayoutSnapshots,
  formatCardLayoutComparison,
  measureCardLayout,
  type CardLayoutComparison,
  type CardLayoutSnapshot,
} from './cardLayoutDiagnostics'
import { deliverExportedPng, type PngDeliveryMethod } from './deliverExportedPng'

/** Uniform upscale target width. Height follows DOM aspect ratio. */
export const CARD_EXPORT_TARGET_WIDTH = 1400
export const CARD_EXPORT_FILENAME = 'issho-asobo-card.png'

/** Reserved for future Policy B (DOM must match this ratio before export). */
export const CARD_EXPORT_ASPECT_WIDTH = 1400
export const CARD_EXPORT_ASPECT_HEIGHT = 2000

export type PngExportMetrics = {
  domCardWidth: number
  domCardHeight: number
  cloneCardWidth: number | null
  cloneCardHeight: number | null
  domRectWidth: number
  domOffsetWidth: number
  domClientWidth: number
  domScrollWidth: number
  domCssWidth: string
  html2canvasCaptureWidth: number
  html2canvasCaptureHeight: number
  captureCanvasWidth: number
  captureCanvasHeight: number
  finalPngWidth: number
  finalPngHeight: number
  captureScale: number
  devicePixelRatio: number
  scaleX: number
  scaleY: number
  uniformScale: boolean
  expectedCanvasWidth: number
  expectedCanvasHeight: number
  canvasWidthDelta: number
  canvasHeightDelta: number
}

export type PngExportResult = {
  metrics: PngExportMetrics
  layoutComparison: CardLayoutComparison
  interestIconComparison: InterestIconComparison
  browserSnapshot: CardLayoutSnapshot
  cloneSnapshot: CardLayoutSnapshot | null
  deliveryMethod: PngDeliveryMethod
}

function measureCardSize(cardElement: HTMLElement) {
  const rect = cardElement.getBoundingClientRect()
  const computedStyle = getComputedStyle(cardElement)

  return {
    width: Math.round(rect.width),
    height: Math.round(Math.max(rect.height, cardElement.scrollHeight, cardElement.offsetHeight)),
    rectWidth: rect.width,
    offsetWidth: cardElement.offsetWidth,
    clientWidth: cardElement.clientWidth,
    scrollWidth: cardElement.scrollWidth,
    cssWidth: computedStyle.width,
  }
}

async function measureBlobImageSize(blob: Blob) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  }

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
      URL.revokeObjectURL(objectUrl)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to decode PNG blob'))
    }

    image.src = objectUrl
  })
}

/** Set true to draw a red outline on the html2canvas clone for capture-boundary checks. */
export const EXPORT_CAPTURE_DEBUG_OUTLINE = import.meta.env.DEV

/** Bump when export sizing logic changes — confirm in Console after reload. */
export const EXPORT_PNG_PIPELINE_VERSION = 'w1400-v4'

/** Matches `.card { width: 1024px }` in App.css — used to lock clone layout during export. */
export const CARD_DOM_WIDTH = 1024

function getExportWindowMinWidth(cardWidth: number) {
  return Math.max(cardWidth + 128, 1126, CARD_DOM_WIDTH + 128)
}

function getExportWindowMinHeight(cardHeight: number) {
  return Math.max(cardHeight + 128, window.innerHeight)
}

function unlockOverflowForCapture(element: HTMLElement) {
  let current: HTMLElement | null = element

  while (current) {
    current.style.overflow = 'visible'
    current.style.overflowX = 'visible'
    current.style.overflowY = 'visible'
    current = current.parentElement
  }
}

function prepareCardElementForCapture(cardElement: HTMLElement, captureDomWidth: number) {
  unlockOverflowForCapture(cardElement)

  cardElement.style.width = `${captureDomWidth}px`
  cardElement.style.minWidth = `${captureDomWidth}px`
  cardElement.style.maxWidth = `${captureDomWidth}px`
  cardElement.style.boxSizing = 'border-box'
  cardElement.style.flexShrink = '0'
}

function resetCardElementCaptureStyles(cardElement: HTMLElement) {
  cardElement.style.width = ''
  cardElement.style.minWidth = ''
  cardElement.style.maxWidth = ''
  cardElement.style.boxSizing = ''
  cardElement.style.flexShrink = ''
}

function stabilizeCloneForExport(
  clonedDocument: Document,
  clonedElement: HTMLElement,
  cardWidth: number,
  cardHeight: number,
) {
  const exportWindowMinWidth = getExportWindowMinWidth(cardWidth)

  clonedDocument.documentElement.style.width = `${exportWindowMinWidth}px`
  clonedDocument.documentElement.style.minWidth = `${exportWindowMinWidth}px`
  clonedDocument.documentElement.style.maxWidth = 'none'

  if (clonedDocument.body) {
    clonedDocument.body.style.width = `${exportWindowMinWidth}px`
    clonedDocument.body.style.minWidth = `${exportWindowMinWidth}px`
    clonedDocument.body.style.maxWidth = 'none'
    clonedDocument.body.style.margin = '0'
    clonedDocument.body.style.overflow = 'visible'
  }

  const root = clonedDocument.getElementById('root')
  if (root instanceof HTMLElement) {
    root.style.width = `${exportWindowMinWidth}px`
    root.style.minWidth = `${exportWindowMinWidth}px`
    root.style.maxWidth = 'none'
  }

  const app = clonedElement.closest('.app')
  if (app instanceof HTMLElement) {
    app.style.width = `${exportWindowMinWidth}px`
    app.style.minWidth = `${exportWindowMinWidth}px`
    app.style.maxWidth = 'none'
    app.style.flexShrink = '0'
  }

  clonedElement.style.width = `${cardWidth}px`
  clonedElement.style.minWidth = `${cardWidth}px`
  clonedElement.style.maxWidth = `${cardWidth}px`
  clonedElement.style.minHeight = `${cardHeight}px`
  clonedElement.style.boxSizing = 'border-box'
  clonedElement.style.flexShrink = '0'
  clonedElement.style.overflow = 'visible'

  if (EXPORT_CAPTURE_DEBUG_OUTLINE) {
    clonedElement.style.outline = '4px solid #e00'
    clonedElement.style.outlineOffset = '-4px'
  }
}

function ensureTargetCanvasSize(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  if (sourceCanvas.width === targetWidth && sourceCanvas.height === targetHeight) {
    return sourceCanvas
  }

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = targetWidth
  outputCanvas.height = targetHeight

  const context = outputCanvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to create export canvas context')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight)
  return outputCanvas
}

function removeCloneFileInputs(clonedDocument: Document) {
  clonedDocument.querySelectorAll('input[type="file"]').forEach((input) => {
    input.remove()
  })
}

async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'))

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve()
            return
          }

          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  )
}

function buildExportMetrics(
  cardSize: ReturnType<typeof measureCardSize>,
  canvas: HTMLCanvasElement,
  captureScale: number,
  finalPngWidth: number,
  finalPngHeight: number,
  cloneSnapshot: CardLayoutSnapshot | null,
): PngExportMetrics {
  const { width: cardWidth, height: cardHeight } = cardSize
  const html2canvasCaptureWidth = canvas.width / captureScale
  const html2canvasCaptureHeight = canvas.height / captureScale
  const expectedCanvasWidth = Math.round(cardWidth * captureScale)
  const expectedCanvasHeight = Math.round(cardHeight * captureScale)
  const scaleX = canvas.width / cardWidth
  const scaleY = canvas.height / cardHeight

  return {
    domCardWidth: cardWidth,
    domCardHeight: cardHeight,
    cloneCardWidth: cloneSnapshot?.cardWidth ?? null,
    cloneCardHeight: cloneSnapshot?.cardHeight ?? null,
    domRectWidth: cardSize.rectWidth,
    domOffsetWidth: cardSize.offsetWidth,
    domClientWidth: cardSize.clientWidth,
    domScrollWidth: cardSize.scrollWidth,
    domCssWidth: cardSize.cssWidth,
    html2canvasCaptureWidth: Math.round(html2canvasCaptureWidth * 100) / 100,
    html2canvasCaptureHeight: Math.round(html2canvasCaptureHeight * 100) / 100,
    captureCanvasWidth: canvas.width,
    captureCanvasHeight: canvas.height,
    finalPngWidth,
    finalPngHeight,
    captureScale,
    devicePixelRatio: window.devicePixelRatio,
    scaleX,
    scaleY,
    uniformScale: Math.abs(scaleX - scaleY) < 0.01,
    expectedCanvasWidth,
    expectedCanvasHeight,
    canvasWidthDelta: canvas.width - expectedCanvasWidth,
    canvasHeightDelta: canvas.height - expectedCanvasHeight,
  }
}

export function formatPngSizeDiagnostics(metrics: PngExportMetrics) {
  return [
    '=== PNG size diagnostics ===',
    `pipeline version: ${EXPORT_PNG_PIPELINE_VERSION}`,
    `DOM card width: ${metrics.domCardWidth}`,
    `DOM card height: ${metrics.domCardHeight}`,
    `clone card width: ${metrics.cloneCardWidth ?? 'n/a'}`,
    `clone card height: ${metrics.cloneCardHeight ?? 'n/a'}`,
    `capture scale: ${metrics.captureScale.toFixed(6)}`,
    `canvas width: ${metrics.captureCanvasWidth}`,
    `canvas height: ${metrics.captureCanvasHeight}`,
    `final PNG width: ${metrics.finalPngWidth}`,
    `final PNG height: ${metrics.finalPngHeight}`,
    `devicePixelRatio: ${metrics.devicePixelRatio}`,
    '',
    '--- width mismatch hints ---',
    `CSS width: ${metrics.domCssWidth}`,
    `DOM rect width (raw): ${metrics.domRectWidth}`,
    `DOM offsetWidth: ${metrics.domOffsetWidth}`,
    `DOM clientWidth: ${metrics.domClientWidth}`,
    `DOM scrollWidth: ${metrics.domScrollWidth}`,
    `html2canvas inferred capture width: ${metrics.html2canvasCaptureWidth}`,
    `html2canvas inferred capture height: ${metrics.html2canvasCaptureHeight}`,
    `expected canvas width (DOM width × scale): ${metrics.expectedCanvasWidth}`,
    `expected canvas height (DOM height × scale): ${metrics.expectedCanvasHeight}`,
    `canvas width delta: ${metrics.canvasWidthDelta}`,
    `canvas height delta: ${metrics.canvasHeightDelta}`,
    `scaleX (canvas / DOM): ${metrics.scaleX.toFixed(4)}`,
    `scaleY (canvas / DOM): ${metrics.scaleY.toFixed(4)}`,
    `scaleX === scaleY: ${metrics.uniformScale ? 'yes' : 'no'}`,
  ].join('\n')
}

export function formatPngExportReport(result: PngExportResult) {
  return [
    formatPngSizeDiagnostics(result.metrics),
    '',
    formatInterestIconComparison(result.interestIconComparison),
    '',
    formatCardLayoutComparison(result.layoutComparison),
  ].join('\n')
}

export async function exportCardPng(cardElement: HTMLElement): Promise<PngExportResult> {
  await waitForImages(cardElement)

  const captureDomWidth = CARD_DOM_WIDTH

  prepareCardElementForCapture(cardElement, captureDomWidth)
  cardElement.scrollIntoView({ block: 'start', inline: 'start' })
  void cardElement.offsetHeight

  try {
    const browserSnapshot = measureCardLayout(cardElement, document, 'browser-dom')
    const cardSize = measureCardSize(cardElement)
    const captureDomHeight = cardSize.height

    if (captureDomHeight === 0) {
      throw new Error('Card has no dimensions')
    }

    if (cardSize.offsetWidth !== captureDomWidth) {
      console.warn(
        `[PNG export] DOM offsetWidth (${cardSize.offsetWidth}) differs from export domWidth (${captureDomWidth}). Export uses ${captureDomWidth}px.`,
      )
    }

    const captureScale = CARD_EXPORT_TARGET_WIDTH / captureDomWidth
    const targetCanvasWidth = Math.round(captureDomWidth * captureScale)
    const targetCanvasHeight = Math.round(captureDomHeight * captureScale)
    const exportWindowMinWidth = getExportWindowMinWidth(captureDomWidth)
    const exportWindowMinHeight = getExportWindowMinHeight(captureDomHeight)
    let cloneSnapshot: CardLayoutSnapshot | null = null
    let cloneInterestIconSnapshot: InterestIconSnapshot | null = null
    const browserInterestIconSnapshot = measureInterestIconSnapshot(cardElement, 'browser-dom')
    const browserInterestLayoutSnapshot = measureInterestLayoutSnapshot(cardElement, 'browser-dom')

    console.info('[PNG export] interest layout (browser-dom)\n' + formatInterestLayoutSnapshot(browserInterestLayoutSnapshot))

    console.info('[PNG export] capture target', {
      tagName: cardElement.tagName,
      className: cardElement.className,
      id: cardElement.id,
      offsetWidth: cardElement.offsetWidth,
      offsetHeight: cardElement.offsetHeight,
      scrollWidth: cardElement.scrollWidth,
      scrollHeight: cardElement.scrollHeight,
    })

    console.info('[PNG export] pre-capture', {
      pipelineVersion: EXPORT_PNG_PIPELINE_VERSION,
      domCardWidth: cardSize.width,
      domCardHeight: captureDomHeight,
      captureDomWidth,
      captureDomHeight,
      captureScale,
      targetCanvasWidth,
      targetCanvasHeight,
      devicePixelRatio: window.devicePixelRatio,
      cssWidth: cardSize.cssWidth,
      offsetWidth: cardSize.offsetWidth,
      clientWidth: cardSize.clientWidth,
      scrollWidth: cardSize.scrollWidth,
      exportWindowMinWidth,
      exportWindowMinHeight,
    })

    const sourceCanvas = await html2canvas(cardElement, {
      backgroundColor: null,
      scale: captureScale,
      width: captureDomWidth,
      height: captureDomHeight,
      windowWidth: exportWindowMinWidth,
      windowHeight: exportWindowMinHeight,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDocument, clonedElement) => {
        removeCloneFileInputs(clonedDocument)

        if (clonedElement instanceof HTMLElement) {
          stabilizeCloneForExport(clonedDocument, clonedElement, captureDomWidth, captureDomHeight)
          cloneSnapshot = measureCardLayout(clonedElement, clonedDocument, 'html2canvas-clone')
          cloneInterestIconSnapshot = measureInterestIconSnapshot(clonedElement, 'html2canvas-clone')
          console.info('[PNG export] interest layout (html2canvas-clone)\n' + formatInterestLayoutSnapshot(
            measureInterestLayoutSnapshot(clonedElement, 'html2canvas-clone'),
          ))
        }
      },
    })

    const exportCanvas = ensureTargetCanvasSize(sourceCanvas, targetCanvasWidth, targetCanvasHeight)

    console.info('[PNG export] post-capture canvas', {
      pipelineVersion: EXPORT_PNG_PIPELINE_VERSION,
      sourceCanvasWidth: sourceCanvas.width,
      sourceCanvasHeight: sourceCanvas.height,
      exportCanvasWidth: exportCanvas.width,
      exportCanvasHeight: exportCanvas.height,
      inferredCaptureWidth: sourceCanvas.width / captureScale,
      inferredCaptureHeight: sourceCanvas.height / captureScale,
      expectedCanvasWidth: targetCanvasWidth,
      expectedCanvasHeight: targetCanvasHeight,
    })

    const blob = await new Promise<Blob | null>((resolve) => {
      exportCanvas.toBlob(resolve, 'image/png')
    })

    if (!blob) {
      throw new Error('Failed to create PNG blob')
    }

    const finalPngSize = await measureBlobImageSize(blob)
    const layoutComparison = compareCardLayoutSnapshots(browserSnapshot, cloneSnapshot)
    const interestIconComparison = compareInterestIconSnapshots(
      browserInterestIconSnapshot,
      cloneInterestIconSnapshot,
    )
    const metrics = buildExportMetrics(
      { ...cardSize, width: captureDomWidth, height: captureDomHeight },
      exportCanvas,
      captureScale,
      finalPngSize.width,
      finalPngSize.height,
      cloneSnapshot,
    )

    console.info('[PNG export diagnostics]\n' + formatPngExportReport({
      metrics,
      layoutComparison,
      interestIconComparison,
      browserSnapshot,
      cloneSnapshot,
      deliveryMethod: 'download',
    }))

    if (metrics.finalPngWidth !== CARD_EXPORT_TARGET_WIDTH) {
      throw new Error(
        `[PNG export] final PNG width is ${metrics.finalPngWidth}, expected ${CARD_EXPORT_TARGET_WIDTH}. Hard-reload the page (Ctrl+Shift+R) and confirm Console shows pipelineVersion "${EXPORT_PNG_PIPELINE_VERSION}".`,
      )
    }

    if (metrics.canvasWidthDelta !== 0) {
      console.warn(`[PNG export] canvas width delta is ${metrics.canvasWidthDelta} (expected 0).`)
    }

    if (metrics.cloneCardWidth !== null && metrics.cloneCardWidth !== captureDomWidth) {
      console.warn(
        `[PNG export] clone card width is ${metrics.cloneCardWidth}, expected ${captureDomWidth}.`,
      )
    }

    const deliveryMethod = await deliverExportedPng(blob, CARD_EXPORT_FILENAME)

    console.info('[PNG export] delivery', { deliveryMethod })

    return {
      metrics,
      layoutComparison,
      interestIconComparison,
      browserSnapshot,
      cloneSnapshot,
      deliveryMethod,
    }
  } finally {
    resetCardElementCaptureStyles(cardElement)
  }
}
