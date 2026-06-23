import { isValidCharacterId, normalizeCharacterIdInput } from './normalizeCharacterId.js'
import { parseLodestoneCharacterProfile } from './parseCharacterProfile.js'
import type { LodestoneApiError, LodestoneApiSuccess, LodestoneCharacterProfile } from '../../types/lodestone.js'

const LOCALE = 'jp'
const USER_AGENT = 'issho-ni-asobo/1.0 (+https://github.com/issho-ni-asobo)'
const FETCH_TIMEOUT_MS = 12_000
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

async function fetchLodestoneHtml(url: string): Promise<{ status: number; html: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ja-JP,ja;q=0.9',
      },
      signal: controller.signal,
    })

    const html = await response.text()

    return { status: response.status, html }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('timeout')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
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

function mapFetchStatus(status: number): ServiceResult | null {
  if (status === 404) {
    return {
      ok: false,
      status: 404,
      body: {
        error: 'character_not_found',
        message: 'キャラクターが見つかりません。',
      },
    }
  }

  if (status === 403) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'character_private',
        message: 'プロフィールが非公開、またはアクセスが拒否されました。',
      },
    }
  }

  if (status >= 500) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'lodestone_unavailable',
        message: 'ロードストーンに接続できません。',
      },
    }
  }

  if (status !== 200) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'lodestone_unavailable',
        message: 'ロードストーンからデータを取得できませんでした。',
      },
    }
  }

  return null
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
    const profileError = mapFetchStatus(profileResponse.status)

    if (profileError) {
      return profileError
    }

    const classJobResponse = await fetchLodestoneHtml(classJobUrl)
    const classJobError = mapFetchStatus(classJobResponse.status)

    if (classJobError) {
      return classJobError
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
    if (error instanceof Error && error.message === 'timeout') {
      return {
        ok: false,
        status: 504,
        body: {
          error: 'timeout',
          message: '取得がタイムアウトしました。しばらくして再試行してください。',
        },
      }
    }

    if (error instanceof Error && error.message.startsWith('parse_failed')) {
      return {
        ok: false,
        status: 502,
        body: {
          error: 'parse_failed',
          message: 'ロードストーンのHTMLを解析できませんでした。',
        },
      }
    }

    return {
      ok: false,
      status: 503,
      body: {
        error: 'lodestone_unavailable',
        message: 'ロードストーンに接続できません。',
      },
    }
  }
}

export function clearLodestoneServiceStateForTests() {
  profileCache.clear()
  rateLimitByClient.clear()
}
