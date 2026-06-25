import { isValidCharacterId } from './normalizeCharacterId.js'
import {
  FETCH_TIMEOUT_MS,
  LOCALE,
  fetchLodestoneHtml,
  isLodestonePrivatePage,
  mapLodestoneFetchError,
  mapLodestoneHttpStatus,
} from './lodestoneHttp.js'
import {
  buildCollectionOwnershipResult,
  parseCollectionListPage,
  parseCollectionTooltipName,
  type CollectionListPageConfig,
  type ParsedCollectionListItem,
} from './parseCollectionOwnership.js'
import type { LodestoneApiError } from '../../types/lodestone.js'
import type {
  LodestoneCollectionApiSuccess,
  LodestoneCollectionOwnershipResult,
  LodestoneCollectionUnmatchedEntry,
} from '../../types/lodestoneCollection.js'
import type { ResolvedLodestoneCollectionItem } from './parseCollectionOwnership.js'

const CACHE_TTL_MS = 10 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 5_000
const RATE_LIMIT_MAX_REQUESTS = 1
const TOOLTIP_FETCH_CONCURRENCY = 4
const TOOLTIP_CACHE_TTL_MS = 30 * 60 * 1000

export type CollectionServiceConfig = {
  listPath: 'minion' | 'mount' | 'faceaccessory'
  category1: string
  privatePageMessage: string
  parseFailedMessage: string
  listPageConfig: CollectionListPageConfig
  listNotFoundError?: LodestoneApiError
  buildOwnership?: (
    characterId: string,
    totalOnLodestone: number,
    lodestoneItems: ResolvedLodestoneCollectionItem[],
    unmatchedFromFetch: LodestoneCollectionUnmatchedEntry[],
  ) => LodestoneCollectionOwnershipResult
}

type CollectionServiceResult =
  | { ok: true; status: 200; body: LodestoneCollectionApiSuccess }
  | { ok: false; status: number; body: LodestoneApiError }

type CollectionCacheEntry = {
  expiresAt: number
  result: LodestoneCollectionApiSuccess['result']
}

type CollectionServiceState = {
  resultCache: Map<string, CollectionCacheEntry>
  tooltipNameCache: Map<string, { expiresAt: number; name: string }>
  rateLimitByClient: Map<string, number[]>
}

function buildListUrl(characterId: string, listPath: string): string {
  return `https://${LOCALE}.finalfantasyxiv.com/lodestone/character/${characterId}/${listPath}/`
}

function buildTooltipUrl(tooltipHref: string): string {
  if (tooltipHref.startsWith('http')) {
    return tooltipHref
  }

  return `https://${LOCALE}.finalfantasyxiv.com${tooltipHref.startsWith('/') ? tooltipHref : `/${tooltipHref}`}`
}

function getCachedResult(
  state: CollectionServiceState,
  characterId: string,
): LodestoneCollectionApiSuccess['result'] | null {
  const cached = state.resultCache.get(characterId)

  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    state.resultCache.delete(characterId)
    return null
  }

  return cached.result
}

function setCachedResult(
  state: CollectionServiceState,
  characterId: string,
  result: LodestoneCollectionApiSuccess['result'],
) {
  state.resultCache.set(characterId, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    result,
  })
}

function getCachedTooltipName(state: CollectionServiceState, tooltipHash: string): string | null {
  const cached = state.tooltipNameCache.get(tooltipHash)

  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    state.tooltipNameCache.delete(tooltipHash)
    return null
  }

  return cached.name
}

function setCachedTooltipName(state: CollectionServiceState, tooltipHash: string, name: string) {
  state.tooltipNameCache.set(tooltipHash, {
    expiresAt: Date.now() + TOOLTIP_CACHE_TTL_MS,
    name,
  })
}

function isRateLimited(state: CollectionServiceState, clientKey: string): boolean {
  const now = Date.now()
  const recent = (state.rateLimitByClient.get(clientKey) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  )

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    state.rateLimitByClient.set(clientKey, recent)
    return true
  }

  recent.push(now)
  state.rateLimitByClient.set(clientKey, recent)
  return false
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results
}

type TooltipFetchResult =
  | { ok: true; lodestoneName: string; tooltipHref: string }
  | { ok: false; tooltipHref: string; reason: 'tooltip_fetch_failed' | 'tooltip_parse_failed' }

function isFailedTooltipFetch(
  result: TooltipFetchResult,
): result is { ok: false; tooltipHref: string; reason: 'tooltip_fetch_failed' | 'tooltip_parse_failed' } {
  return result.ok === false
}

async function fetchTooltipName(
  state: CollectionServiceState,
  item: ParsedCollectionListItem,
  tooltipLabelClass: string,
): Promise<TooltipFetchResult> {
  const cachedName = getCachedTooltipName(state, item.tooltipHash)

  if (cachedName) {
    return {
      ok: true,
      lodestoneName: cachedName,
      tooltipHref: item.tooltipHref,
    }
  }

  try {
    const tooltipUrl = buildTooltipUrl(item.tooltipHref)
    const response = await fetchLodestoneHtml(tooltipUrl)

    if (response.status !== 200) {
      return {
        ok: false,
        tooltipHref: item.tooltipHref,
        reason: 'tooltip_fetch_failed',
      }
    }

    const lodestoneName = parseCollectionTooltipName(response.html, tooltipLabelClass)

    if (!lodestoneName) {
      return {
        ok: false,
        tooltipHref: item.tooltipHref,
        reason: 'tooltip_parse_failed',
      }
    }

    setCachedTooltipName(state, item.tooltipHash, lodestoneName)

    return {
      ok: true,
      lodestoneName,
      tooltipHref: item.tooltipHref,
    }
  } catch {
    return {
      ok: false,
      tooltipHref: item.tooltipHref,
      reason: 'tooltip_fetch_failed',
    }
  }
}

export type InlineCollectionServiceConfig = {
  listPath: 'emote'
  category1: string
  privatePageMessage: string
  parseFailedMessage: string
  parseListPage: (html: string) => {
    totalOnLodestone: number
    items: Array<{ lodestoneName: string; tooltipHref?: string; category?: string }>
  }
  buildOwnershipResult: (
    characterId: string,
    totalOnLodestone: number,
    items: Array<{ lodestoneName: string; tooltipHref?: string; category?: string }>,
  ) => LodestoneCollectionApiSuccess['result']
}

export function createLodestoneInlineCollectionOwnershipService(config: InlineCollectionServiceConfig) {
  const state: CollectionServiceState = {
    resultCache: new Map(),
    tooltipNameCache: new Map(),
    rateLimitByClient: new Map(),
  }

  async function getOwnership(
    characterId: string,
    clientKey = 'anonymous',
  ): Promise<CollectionServiceResult> {
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

    const cached = getCachedResult(state, characterId)

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

    if (isRateLimited(state, clientKey)) {
      return {
        ok: false,
        status: 429,
        body: {
          error: 'rate_limited',
          message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
        },
      }
    }

    try {
      const listUrl = buildListUrl(characterId, config.listPath)
      const listResponse = await fetchLodestoneHtml(listUrl)

      if (listResponse.status === 403 || (listResponse.status === 200 && isLodestonePrivatePage(listResponse.html))) {
        return {
          ok: false,
          status: 403,
          body: {
            error: 'character_private',
            message: config.privatePageMessage,
          },
        }
      }

      const listError = mapLodestoneHttpStatus(listResponse.status, {
        notFoundMessage: 'キャラクターが見つかりません。',
      })

      if (listError) {
        return { ok: false, ...listError }
      }

      const { totalOnLodestone, items } = config.parseListPage(listResponse.html)

      if (
        items.length === 0
        && listResponse.html.includes('emote__list')
        && /<li\b[^>]*data-category=/i.test(listResponse.html)
      ) {
        return {
          ok: false,
          status: 502,
          body: {
            error: 'parse_failed',
            message: config.parseFailedMessage,
          },
        }
      }

      const ownership = config.buildOwnershipResult(characterId, totalOnLodestone, items)

      setCachedResult(state, characterId, ownership)

      return {
        ok: true,
        status: 200,
        body: {
          result: ownership,
          cached: false,
        },
      }
    } catch (error) {
      return { ok: false, ...mapLodestoneFetchError(error) }
    }
  }

  function clearStateForTests() {
    state.resultCache.clear()
    state.tooltipNameCache.clear()
    state.rateLimitByClient.clear()
  }

  return {
    getOwnership,
    clearStateForTests,
    config: {
      cacheTtlMs: CACHE_TTL_MS,
      fetchTimeoutMs: FETCH_TIMEOUT_MS,
      rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
      rateLimitMaxRequests: RATE_LIMIT_MAX_REQUESTS,
      tooltipFetchConcurrency: 0,
    },
  }
}

export function createLodestoneCollectionOwnershipService(config: CollectionServiceConfig) {
  const state: CollectionServiceState = {
    resultCache: new Map(),
    tooltipNameCache: new Map(),
    rateLimitByClient: new Map(),
  }

  async function getOwnership(
    characterId: string,
    clientKey = 'anonymous',
  ): Promise<CollectionServiceResult> {
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

    const cached = getCachedResult(state, characterId)

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

    if (isRateLimited(state, clientKey)) {
      return {
        ok: false,
        status: 429,
        body: {
          error: 'rate_limited',
          message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
        },
      }
    }

    try {
      const listUrl = buildListUrl(characterId, config.listPath)
      const listResponse = await fetchLodestoneHtml(listUrl)

      if (listResponse.status === 403 || (listResponse.status === 200 && isLodestonePrivatePage(listResponse.html))) {
        return {
          ok: false,
          status: 403,
          body: {
            error: 'character_private',
            message: config.privatePageMessage,
          },
        }
      }

      const listError = listResponse.status === 404 && config.listNotFoundError
        ? { status: 404 as const, body: config.listNotFoundError }
        : mapLodestoneHttpStatus(listResponse.status, {
            notFoundMessage: 'キャラクターが見つかりません。',
          })

      if (listError) {
        return { ok: false, ...listError }
      }

      const { totalOnLodestone, items } = parseCollectionListPage(listResponse.html, config.listPageConfig)

      if (totalOnLodestone > 0 && items.length === 0) {
        return {
          ok: false,
          status: 502,
          body: {
            error: 'parse_failed',
            message: config.parseFailedMessage,
          },
        }
      }

      const tooltipResults = await mapWithConcurrency(items, TOOLTIP_FETCH_CONCURRENCY, (item) =>
        fetchTooltipName(state, item, config.listPageConfig.tooltipLabelClass))

      const resolvedItems: Array<{ tooltipHref: string; lodestoneName: string }> = []
      const unmatchedFromFetch: Array<{
        lodestoneName: string
        tooltipHref?: string
        reason: 'tooltip_fetch_failed' | 'tooltip_parse_failed'
      }> = []

      for (const result of tooltipResults) {
        if (result.ok) {
          resolvedItems.push({
            tooltipHref: result.tooltipHref,
            lodestoneName: result.lodestoneName,
          })
        } else if (isFailedTooltipFetch(result)) {
          unmatchedFromFetch.push({
            lodestoneName: '',
            tooltipHref: result.tooltipHref,
            reason: result.reason,
          })
        }
      }

      const ownership = config.buildOwnership
        ? config.buildOwnership(characterId, totalOnLodestone, resolvedItems, unmatchedFromFetch)
        : buildCollectionOwnershipResult(
            config.category1,
            characterId,
            totalOnLodestone,
            resolvedItems,
            unmatchedFromFetch,
          )

      setCachedResult(state, characterId, ownership)

      return {
        ok: true,
        status: 200,
        body: {
          result: ownership,
          cached: false,
        },
      }
    } catch (error) {
      return { ok: false, ...mapLodestoneFetchError(error) }
    }
  }

  function clearStateForTests() {
    state.resultCache.clear()
    state.tooltipNameCache.clear()
    state.rateLimitByClient.clear()
  }

  return {
    getOwnership,
    clearStateForTests,
    config: {
      cacheTtlMs: CACHE_TTL_MS,
      tooltipCacheTtlMs: TOOLTIP_CACHE_TTL_MS,
      tooltipFetchConcurrency: TOOLTIP_FETCH_CONCURRENCY,
      fetchTimeoutMs: FETCH_TIMEOUT_MS,
      rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
      rateLimitMaxRequests: RATE_LIMIT_MAX_REQUESTS,
    },
  }
}
