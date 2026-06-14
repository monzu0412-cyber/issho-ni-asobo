export type PngDeliveryMethod = 'share' | 'tab' | 'download'

function prefersMobileFriendlyDelivery() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || window.innerWidth <= 768
}

export async function deliverExportedPng(blob: Blob, filename: string): Promise<PngDeliveryMethod> {
  if (!prefersMobileFriendlyDelivery()) {
    return downloadExportedPng(blob, filename)
  }

  const file = new File([blob], filename, { type: 'image/png' })

  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'いっしょに あ・そ・ぼ！カード',
        })
        return 'share'
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'share'
      }

      console.warn('[PNG delivery] Web Share failed, falling back', error)
    }
  }

  const objectUrl = URL.createObjectURL(blob)
  const openedTab = window.open(objectUrl, '_blank', 'noopener,noreferrer')

  if (openedTab) {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    return 'tab'
  }

  return downloadExportedPng(blob, filename, objectUrl)
}

function downloadExportedPng(blob: Blob, filename: string, existingObjectUrl?: string): PngDeliveryMethod {
  const objectUrl = existingObjectUrl ?? URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
  return 'download'
}
