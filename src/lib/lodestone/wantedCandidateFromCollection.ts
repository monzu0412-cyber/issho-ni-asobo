import type { LodestoneCollectionCategoryKey } from '../../types/lodestoneCollections'
import type {
  WantedCandidateFromCollection,
  WantedCollectionCategory,
} from '../../types/wantedCandidateFromCollection'
import type { LodestoneCollectionMissingEntry } from '../../types/lodestoneCollection'

export const COLLECTION_CATEGORY_TO_WANTED: Record<LodestoneCollectionCategoryKey, WantedCollectionCategory> = {
  minions: 'minion',
  mounts: 'mount',
  emotes: 'emote',
  faceAccessories: 'faceAccessory',
}

export function getWantedCandidateKey(candidate: WantedCandidateFromCollection): string {
  if (candidate.itemId != null) {
    return `item:${candidate.itemId}`
  }

  if (candidate.sourceDictionaryId) {
    return `source:${candidate.sourceDictionaryId}`
  }

  return `name:${candidate.collectionCategory}:${candidate.name}`
}

export function buildWantedCandidateFromMissing(
  collectionCategory: WantedCollectionCategory,
  entry: LodestoneCollectionMissingEntry,
): WantedCandidateFromCollection {
  return {
    source: 'lodestone_collection',
    collectionCategory,
    itemId: entry.itemId ?? null,
    sourceDictionaryId: entry.sourceDictionaryId,
    name: entry.name,
    displayName: entry.name,
  }
}

export function addWantedCandidate(
  candidates: WantedCandidateFromCollection[],
  candidate: WantedCandidateFromCollection,
): WantedCandidateFromCollection[] {
  const key = getWantedCandidateKey(candidate)

  if (candidates.some((existing) => getWantedCandidateKey(existing) === key)) {
    return candidates
  }

  return [...candidates, candidate]
}

export function removeWantedCandidate(
  candidates: WantedCandidateFromCollection[],
  candidate: WantedCandidateFromCollection,
): WantedCandidateFromCollection[] {
  const key = getWantedCandidateKey(candidate)

  return candidates.filter((existing) => getWantedCandidateKey(existing) !== key)
}

export function isWantedCandidateSelected(
  candidates: WantedCandidateFromCollection[],
  candidate: WantedCandidateFromCollection,
): boolean {
  const key = getWantedCandidateKey(candidate)

  return candidates.some((existing) => getWantedCandidateKey(existing) === key)
}
