import { isValidCharacterId } from './normalizeCharacterId.js'
import { getLodestoneEmoteOwnership } from './lodestoneEmoteService.js'
import { getLodestoneFaceAccessoryOwnership } from './lodestoneFaceAccessoryService.js'
import { getLodestoneMinionOwnership } from './lodestoneMinionService.js'
import { getLodestoneMountOwnership } from './lodestoneMountService.js'
import type { LodestoneApiError } from '../../types/lodestone.js'
import type {
  LodestoneCollectionCategoryKey,
  LodestoneCollectionCategoryStatus,
  LodestoneCollectionCategorySummary,
  LodestoneCollectionsApiSuccess,
  LodestoneCollectionsResult,
} from '../../types/lodestoneCollections.js'
import type { LodestoneCollectionOwnershipResult } from '../../types/lodestoneCollection.js'

const COLLECTIONS_CACHE_TTL_MS = 10 * 60 * 1000

type CategoryFetcherResult =
  | { ok: true; body: { result: LodestoneCollectionOwnershipResult; cached: boolean } }
  | { ok: false; status: number; body: LodestoneApiError }

type CategoryDefinition = {
  key: LodestoneCollectionCategoryKey
  label: string
  fetch: (characterId: string, clientKey: string) => Promise<CategoryFetcherResult>
}

const COLLECTION_CATEGORIES: CategoryDefinition[] = [
  {
    key: 'minions',
    label: 'ミニオン',
    fetch: getLodestoneMinionOwnership,
  },
  {
    key: 'mounts',
    label: 'マウント',
    fetch: getLodestoneMountOwnership,
  },
  {
    key: 'emotes',
    label: 'エモート',
    fetch: getLodestoneEmoteOwnership,
  },
  {
    key: 'faceAccessories',
    label: 'フェイスアクセサリー',
    fetch: getLodestoneFaceAccessoryOwnership,
  },
]

type CollectionsServiceResult =
  | { ok: true; status: 200; body: LodestoneCollectionsApiSuccess }
  | { ok: false; status: number; body: LodestoneApiError }

type CollectionsCacheEntry = {
  expiresAt: number
  result: LodestoneCollectionsResult
}

const collectionsState = {
  resultCache: new Map<string, CollectionsCacheEntry>(),
}

function getCachedCollections(characterId: string): LodestoneCollectionsResult | null {
  const cached = collectionsState.resultCache.get(characterId)

  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    collectionsState.resultCache.delete(characterId)
    return null
  }

  return cached.result
}

function setCachedCollections(characterId: string, result: LodestoneCollectionsResult) {
  collectionsState.resultCache.set(characterId, {
    expiresAt: Date.now() + COLLECTIONS_CACHE_TTL_MS,
    result,
  })
}

function isFailedCategoryFetch(
  fetchResult: CategoryFetcherResult,
): fetchResult is { ok: false; status: number; body: LodestoneApiError } {
  return fetchResult.ok === false
}

function resolveCategoryStatus(
  fetchResult: CategoryFetcherResult,
  ownership: LodestoneCollectionOwnershipResult | null,
): LodestoneCollectionCategoryStatus {
  if (isFailedCategoryFetch(fetchResult)) {
    if (fetchResult.status === 404 && fetchResult.body.error === 'collection_not_found') {
      return 'not_found'
    }

    return 'failed'
  }

  if (!ownership) {
    return 'failed'
  }

  return ownership.unmatchedOwned.length > 0 ? 'partial' : 'ok'
}

function buildCategorySummary(
  category: CategoryDefinition,
  fetchResult: CategoryFetcherResult,
  ownership: LodestoneCollectionOwnershipResult | null,
): LodestoneCollectionCategorySummary {
  const status = resolveCategoryStatus(fetchResult, ownership)

  if (isFailedCategoryFetch(fetchResult)) {
    return {
      key: category.key,
      label: category.label,
      status,
      owned: 0,
      missing: 0,
      unmatched: 0,
      dictionaryTotal: 0,
      error: fetchResult.body.message,
    }
  }

  if (!ownership) {
    return {
      key: category.key,
      label: category.label,
      status,
      owned: 0,
      missing: 0,
      unmatched: 0,
      dictionaryTotal: 0,
    }
  }

  return {
    key: category.key,
    label: category.label,
    status,
    owned: ownership.owned.length,
    missing: ownership.missing.length,
    unmatched: ownership.unmatchedOwned.length,
    dictionaryTotal: ownership.dictionaryTotal,
    totalOnLodestone: ownership.totalOnLodestone,
  }
}

function buildCollectionsSummary(
  categorySummaries: LodestoneCollectionCategorySummary[],
): LodestoneCollectionsResult['summary'] {
  return {
    totalOwned: categorySummaries.reduce((sum, category) => sum + category.owned, 0),
    totalMissing: categorySummaries.reduce((sum, category) => sum + category.missing, 0),
    totalUnmatched: categorySummaries.reduce((sum, category) => sum + category.unmatched, 0),
    categories: categorySummaries,
  }
}

function resolveOverallStatus(categorySummaries: LodestoneCollectionCategorySummary[]): number {
  const successCount = categorySummaries.filter((category) => category.status === 'ok' || category.status === 'partial').length

  if (successCount > 0) {
    return 200
  }

  const hasUnavailable = categorySummaries.some((category) => category.status === 'failed')

  return hasUnavailable ? 503 : 502
}

export async function getLodestoneCollections(
  characterId: string,
  clientKey = 'anonymous',
): Promise<CollectionsServiceResult> {
  if (!isValidCharacterId(characterId)) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'invalid_character_id',
        message: 'キャラクターIDの形式が正しくありません。',
      },
    }
  }

  const cached = getCachedCollections(characterId)

  if (cached) {
    return {
      ok: true,
      status: 200,
      body: {
        result: cached,
        cached: true,
      },
    }
  }

  const collections: LodestoneCollectionsResult['collections'] = {}
  const categorySummaries: LodestoneCollectionCategorySummary[] = []

  for (const category of COLLECTION_CATEGORIES) {
    const fetchResult = await category.fetch(characterId, clientKey)
    const ownership = fetchResult.ok ? fetchResult.body.result : null

    if (ownership) {
      switch (category.key) {
        case 'minions':
          collections.minions = ownership
          break
        case 'mounts':
          collections.mounts = ownership
          break
        case 'emotes':
          collections.emotes = ownership
          break
        case 'faceAccessories':
          collections.faceAccessories = ownership
          break
      }
    }

    categorySummaries.push(buildCategorySummary(category, fetchResult, ownership))
  }

  const generatedAt = new Date().toISOString()
  const result: LodestoneCollectionsResult = {
    characterId,
    generatedAt,
    collections,
    summary: buildCollectionsSummary(categorySummaries),
  }

  const overallStatus = resolveOverallStatus(categorySummaries)

  if (overallStatus !== 200) {
    return {
      ok: false,
      status: overallStatus,
      body: {
        error: 'lodestone_unavailable',
        message: 'コレクション情報を取得できませんでした。',
      },
    }
  }

  setCachedCollections(characterId, result)

  return {
    ok: true,
    status: 200,
    body: {
      result,
      cached: false,
    },
  }
}

export function clearLodestoneCollectionsServiceStateForTests() {
  collectionsState.resultCache.clear()
}

export const lodestoneCollectionsServiceConfig = {
  collectionsCacheTtlMs: COLLECTIONS_CACHE_TTL_MS,
  categoryFetchConcurrency: 1,
}
