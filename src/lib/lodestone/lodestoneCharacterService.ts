import { isValidCharacterId, normalizeCharacterIdInput } from './normalizeCharacterId.js'
import { parseLodestoneCharacterProfile } from './parseCharacterProfile.js'
import {
  fetchLodestoneHtml,
  LOCALE,
  mapLodestoneFetchError,
  mapLodestoneHttpStatus,
} from './lodestoneHttp.js'
import type { LodestoneApiError, LodestoneApiSuccess, LodestoneCharacterProfile } from '../../types/lodestone.js'

const CACHE_TTL_MS = 10 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 5_000
const RATE_LIMIT_MAX_REQUESTS = 1

type CacheEntry = {
  expiresAt: number
  profile: LodestoneCharacterProfile
}

type ServiceResult =
  | { ok: true; status: 200; body: LodestoneApiSuccess }
  | { ok: false; status: number; body: LodestoneApiError }

const profileCache = new Map<string, CacheEntry>()
const rateLimitByClient = new Map<string, number[]>()

function buildCharacterUrls(characterId: string) {
  const base = `https://${LOCALE}.finalfantasyxiv.com/lodestone/character/${characterId}`

  return {
    profileUrl: `${base}/`,
    classJobUrl: `${base}/class_job/`,
  }
}

function getCachedProfile(characterId: string): LodestoneCharacterProfile | null {
  const cached = profileCache.get(characterId)

  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    profileCache.delete(characterId)
    return null
  }

  return cached.profile
}

function setCachedProfile(characterId: string, profile: LodestoneCharacterProfile) {
  profileCache.set(characterId, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    profile,
  })
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now()
  const recent = (rateLimitByClient.get(clientKey) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitByClient.set(clientKey, recent)
    return true
  }

  recent.push(now)
  rateLimitByClient.set(clientKey, recent)
  return false
}

export function resolveCharacterIdFromRequest(idParam: string | undefined): string | null {
  if (!idParam) {
    return null
  }

  return normalizeCharacterIdInput(idParam) ?? (isValidCharacterId(idParam) ? idParam : null)
}

export async function getLodestoneCharacterProfile(
  characterId: string,
  clientKey = 'anonymous',
): Promise<ServiceResult> {
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

  const cached = getCachedProfile(characterId)

  if (cached) {
    return {
      ok: true,
      status: 200,
      body: {
        profile: cached,
        cached: true,
      },
    }
  }

  if (isRateLimited(clientKey)) {
    return {
      ok: false,
      status: 429,
      body: {
        error: 'rate_limited',
        message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
      },
    }
  }

  const { profileUrl, classJobUrl } = buildCharacterUrls(characterId)

  try {
    const profileResponse = await fetchLodestoneHtml(profileUrl)
    const profileError = mapLodestoneHttpStatus(profileResponse.status)

    if (profileError) {
      return { ok: false, ...profileError }
    }

    const classJobResponse = await fetchLodestoneHtml(classJobUrl)
    const classJobError = mapLodestoneHttpStatus(classJobResponse.status)

    if (classJobError) {
      return { ok: false, ...classJobError }
    }

    const profile = parseLodestoneCharacterProfile({
      characterId,
      profileHtml: profileResponse.html,
      classJobHtml: classJobResponse.html,
    })

    setCachedProfile(characterId, profile)

    return {
      ok: true,
      status: 200,
      body: {
        profile,
        cached: false,
      },
    }
  } catch (error) {
    return { ok: false, ...mapLodestoneFetchError(error) }
  }
}

export function clearLodestoneServiceStateForTests() {
  profileCache.clear()
  rateLimitByClient.clear()
}
