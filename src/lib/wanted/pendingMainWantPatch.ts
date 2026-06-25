import type { TargetItem } from '../../types/card'

const PENDING_MAIN_WANT_KEY = 'issho-asobo-pending-main-want'

export function setPendingMainWantTarget(target: TargetItem): void {
  try {
    sessionStorage.setItem(PENDING_MAIN_WANT_KEY, JSON.stringify(target))
  } catch {
    // Ignore storage failures in private browsing.
  }
}

export function consumePendingMainWantTarget(): TargetItem | null {
  try {
    const raw = sessionStorage.getItem(PENDING_MAIN_WANT_KEY)

    if (!raw) {
      return null
    }

    sessionStorage.removeItem(PENDING_MAIN_WANT_KEY)
    return JSON.parse(raw) as TargetItem
  } catch {
    return null
  }
}
