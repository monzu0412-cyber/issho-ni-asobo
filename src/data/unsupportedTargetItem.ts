export const UNSUPPORTED_TARGET_TITLE = '未対応アイテム'

export const UNSUPPORTED_TARGET_SOURCE_ID = 'system:unsupported-item'

export const UNSUPPORTED_TARGET_CATEGORY = 'その他' as const

export const UNSUPPORTED_TARGET_SUBCATEGORY = '未対応'

export const UNSUPPORTED_TARGET_ICON = '📦'

export function isUnsupportedTargetItem(value: {
  title?: string
  sourceDictionaryId?: string
}): boolean {
  return value.title === UNSUPPORTED_TARGET_TITLE || value.sourceDictionaryId === UNSUPPORTED_TARGET_SOURCE_ID
}
