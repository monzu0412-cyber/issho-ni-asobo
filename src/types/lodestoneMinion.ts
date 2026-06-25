export type LodestoneMinionOwnedEntry = {
  itemId: number | null
  name: string
  lodestoneName: string
  sourceDictionaryId?: string
}

export type LodestoneMinionUnmatchedReason =
  | 'dictionary_miss'
  | 'tooltip_fetch_failed'
  | 'tooltip_parse_failed'
  | 'duplicate_dictionary_match'

export type LodestoneMinionUnmatchedEntry = {
  lodestoneName: string
  tooltipHref?: string
  reason: LodestoneMinionUnmatchedReason
}

export type LodestoneMinionMissingEntry = {
  itemId: number | null
  name: string
  sourceDictionaryId?: string
}

export type LodestoneMinionOwnershipResult = {
  characterId: string
  totalOnLodestone: number
  owned: LodestoneMinionOwnedEntry[]
  unmatchedOwned: LodestoneMinionUnmatchedEntry[]
  missing: LodestoneMinionMissingEntry[]
  dictionaryTotal: number
}

export type LodestoneMinionApiSuccess = {
  result: LodestoneMinionOwnershipResult
  cached: boolean
}
