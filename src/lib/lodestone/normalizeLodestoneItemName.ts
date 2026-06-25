const WHITESPACE_PATTERN = /[\s\u3000]+/g
const MIDDLE_DOT_PATTERN = /[・･·]/g

export function normalizeLodestoneItemName(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(WHITESPACE_PATTERN, '')
    .replace(MIDDLE_DOT_PATTERN, '')
    .toLowerCase()
}
