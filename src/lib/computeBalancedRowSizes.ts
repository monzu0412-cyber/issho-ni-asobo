/**
 * Split jobs into row sizes for card layout.
 * - At most `maxPerRow` icons per row
 * - Avoid a final row of 1 when possible (e.g. 16 → 4+4+4+4, not 5+5+5+1)
 */
export function computeBalancedRowSizes(jobCount: number, maxPerRow = 5): number[] {
  if (jobCount <= 0) {
    return []
  }

  if (jobCount <= maxPerRow) {
    return [jobCount]
  }

  let rowCount = Math.ceil(jobCount / maxPerRow)

  if (jobCount % maxPerRow === 1) {
    rowCount = Math.max(2, Math.ceil(jobCount / (maxPerRow - 1)))
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const base = Math.floor(jobCount / rowCount)
    const remainder = jobCount % rowCount
    const sizes = Array.from({ length: rowCount }, (_, index) => base + (index < remainder ? 1 : 0))

    if (sizes.at(-1) === 1 && rowCount > 1) {
      rowCount++
      continue
    }

    if (sizes.every((size) => size <= maxPerRow)) {
      return sizes
    }

    rowCount++
  }

  const fallback: number[] = []
  for (let index = 0; index < jobCount; index += maxPerRow) {
    fallback.push(Math.min(maxPerRow, jobCount - index))
  }

  return fallback
}
