import type { LodestoneCollectionMissingEntry } from './lodestoneCollection'

export type WantedCollectionCategory = 'minion' | 'mount' | 'emote' | 'faceAccessory'

export type WantedCandidateFromCollection = {
  source: 'lodestone_collection'
  collectionCategory: WantedCollectionCategory
  itemId: number | null
  sourceDictionaryId?: string
  name: string
  displayName: string
}

export const WANTED_COLLECTION_CATEGORY_LABELS: Record<WantedCollectionCategory, string> = {
  minion: 'ミニオン',
  mount: 'マウント',
  emote: 'エモート',
  faceAccessory: 'フェイスアクセサリー',
}

export type WantedCandidateFromMissingEntry = LodestoneCollectionMissingEntry
