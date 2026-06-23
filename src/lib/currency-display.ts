export const CENTURIO_SEAL_CANONICAL_JA = '百獣司令官の記章' as const
export const CENTURIO_SEAL_DISPLAY_JA = 'セントリオ記章' as const

const CURRENCY_DISPLAY_NAME_BY_CANONICAL: Readonly<Record<string, string>> = {
  [CENTURIO_SEAL_CANONICAL_JA]: CENTURIO_SEAL_DISPLAY_JA,
}

const CURRENCY_EARN_SUFFIX = 'を集める' as const
const CURRENCY_QUANTITY_PATTERN = /^(.+?)\s*×(\d+)$/

export function formatCurrencyDisplayName(canonicalName: string): string {
  const trimmed = canonicalName.trim()

  if (!trimmed) {
    return trimmed
  }

  return CURRENCY_DISPLAY_NAME_BY_CANONICAL[trimmed] ?? trimmed
}

export function formatCurrencyDisplayText(text: string): string {
  const trimmed = text.trim()

  if (!trimmed) {
    return trimmed
  }

  if (trimmed.endsWith(CURRENCY_EARN_SUFFIX)) {
    const base = trimmed.slice(0, -CURRENCY_EARN_SUFFIX.length).trim()
    return `${formatCurrencyDisplayText(base)}${CURRENCY_EARN_SUFFIX}`
  }

  const quantityMatch = trimmed.match(CURRENCY_QUANTITY_PATTERN)

  if (quantityMatch) {
    const [, currencyName, quantity] = quantityMatch
    const displayName = formatCurrencyDisplayName(currencyName.trim())

    if (displayName !== currencyName.trim()) {
      return `${displayName} ×${quantity}`
    }
  }

  return formatCurrencyDisplayName(trimmed)
}
