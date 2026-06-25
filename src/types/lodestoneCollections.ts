import type { LodestoneEmoteOwnershipResult } from './lodestoneEmote.js'
import type { LodestoneFaceAccessoryOwnershipResult } from './lodestoneFaceAccessory.js'
import type { LodestoneMinionOwnershipResult } from './lodestoneMinion.js'
import type { LodestoneMountOwnershipResult } from './lodestoneMount.js'

export type LodestoneCollectionCategoryKey =
  | 'minions'
  | 'mounts'
  | 'emotes'
  | 'faceAccessories'

export type LodestoneCollectionCategoryStatus = 'ok' | 'partial' | 'failed' | 'not_found'

export type LodestoneCollectionCategorySummary = {
  key: LodestoneCollectionCategoryKey
  label: string
  status: LodestoneCollectionCategoryStatus
  owned: number
  missing: number
  unmatched: number
  dictionaryTotal: number
  totalOnLodestone?: number
  error?: string
}

export type LodestoneCollectionsSummary = {
  totalOwned: number
  totalMissing: number
  totalUnmatched: number
  categories: LodestoneCollectionCategorySummary[]
}

export type LodestoneCollectionsResult = {
  characterId: string
  generatedAt: string
  collections: {
    minions?: LodestoneMinionOwnershipResult
    mounts?: LodestoneMountOwnershipResult
    emotes?: LodestoneEmoteOwnershipResult
    faceAccessories?: LodestoneFaceAccessoryOwnershipResult
  }
  summary: LodestoneCollectionsSummary
}

export type LodestoneCollectionsApiSuccess = {
  result: LodestoneCollectionsResult
  cached: boolean
}
