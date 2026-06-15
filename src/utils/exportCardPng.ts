import {
  captureCardPng,
  CARD_EXPORT_FILENAME,
  formatPngCaptureReport,
  type PngCaptureResult,
  type PngExportMetrics,
} from './captureCardPng'
import { deliverExportedPng, type PngDeliveryMethod } from './deliverExportedPng'

export {
  CARD_DOM_WIDTH,
  CARD_EXPORT_ASPECT_HEIGHT,
  CARD_EXPORT_ASPECT_WIDTH,
  CARD_EXPORT_FILENAME,
  CARD_EXPORT_TARGET_WIDTH,
  EXPORT_CAPTURE_DEBUG_OUTLINE,
  EXPORT_PNG_PIPELINE_VERSION,
  formatPngSizeDiagnostics,
} from './captureCardPng'

export type { PngExportMetrics }

export type PngExportResult = PngCaptureResult & {
  deliveryMethod: PngDeliveryMethod
}

export function formatPngExportReport(result: PngExportResult) {
  return formatPngCaptureReport(result)
}

export async function exportCardPng(cardElement: HTMLElement): Promise<PngExportResult> {
  const captureResult = await captureCardPng(cardElement)
  const deliveryMethod = await deliverExportedPng(captureResult.blob, CARD_EXPORT_FILENAME)

  console.info('[PNG export] delivery', { deliveryMethod })

  return {
    ...captureResult,
    deliveryMethod,
  }
}
