const HORIZONTAL_ROW4_MIN_HEIGHT = 120

export function syncHorizontalRow4Height(
  leftColumn: HTMLElement | null,
  rightColumn: HTMLElement | null,
): boolean {
  if (!leftColumn || !rightColumn) {
    return false
  }

  const activityBox = rightColumn.querySelector('.activityBox')

  if (!(activityBox instanceof HTMLElement)) {
    return false
  }

  const leftHeight = leftColumn.getBoundingClientRect().height
  const row3Height = activityBox.getBoundingClientRect().height
  const columnStyle = getComputedStyle(rightColumn)
  const gap = Number.parseFloat(columnStyle.rowGap || columnStyle.gap) || 0
  const row4Height = Math.max(
    HORIZONTAL_ROW4_MIN_HEIGHT,
    Math.round(leftHeight - row3Height - gap),
  )

  rightColumn.style.setProperty('--layout-horizontal-row4-height', `${row4Height}px`)

  return true
}

export function clearHorizontalRow4Height(rightColumn: HTMLElement | null): void {
  rightColumn?.style.removeProperty('--layout-horizontal-row4-height')
}
