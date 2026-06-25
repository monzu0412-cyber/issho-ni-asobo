export type LodestoneCollectionUnmatchedReason =
  | 'dictionary_miss'
  | 'tooltip_fetch_failed'
  | 'tooltip_parse_failed'
  | 'duplicate_dictionary_match'

export type LodestoneCollectionOwnedEntry = {
  itemId: number | null
  name: string
  lodestoneName: string
  sourceDictionaryId?: string
  lodestoneCategory?: string
}

export type LodestoneCollectionUnmatchedEntry = {
  lodestoneName: string
  tooltipHref?: string
  reason: LodestoneCollectionUnmatchedReason
}

export type LodestoneCollectionMissingEntry = {
  itemId: number | null
  name: string
  sourceDictionaryId?: string
}

export type LodestoneCollectionOwnershipResult = {
  characterId: string
  totalOnLodestone: number
  owned: LodestoneCollectionOwnedEntry[]
  unmatchedOwned: LodestoneCollectionUnmatchedEntry[]
  missing: LodestoneCollectionMissingEntry[]
  dictionaryTotal: number
}

export type LodestoneCollectionApiSuccess = {
  result: LodestoneCollectionOwnershipResult
  cached: boolean
}
