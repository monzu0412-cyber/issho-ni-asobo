import type { LodestoneApiError } from '../../types/lodestone.js'

export const LOCALE = 'jp'
export const USER_AGENT = 'issho-ni-asobo/1.0 (+https://github.com/issho-ni-asobo)'
export const FETCH_TIMEOUT_MS = 12_000

export async function fetchLodestoneHtml(url: string): Promise<{ status: number; html: string }> {
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
      // Vercel API compile target does not include Error.cause in lib typings.
      // eslint-disable-next-line preserve-caught-error -- timeout is mapped in mapLodestoneFetchError
      throw new Error('timeout')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export function isLodestonePrivatePage(html: string): boolean {
  return html.includes('このページは非公開に設定されています')
    || html.includes('character-private')
}

export function mapLodestoneHttpStatus(
  status: number,
  options?: { privateMessage?: string; notFoundMessage?: string },
): { status: number; body: LodestoneApiError } | null {
  if (status === 404) {
    return {
      status: 404,
      body: {
        error: 'character_not_found',
        message: options?.notFoundMessage ?? 'キャラクターが見つかりません。',
      },
    }
  }

  if (status === 403) {
    return {
      status: 403,
      body: {
        error: 'character_private',
        message: options?.privateMessage ?? 'プロフィールが非公開、またはアクセスが拒否されました。',
      },
    }
  }

  if (status >= 500) {
    return {
      status: 503,
      body: {
        error: 'lodestone_unavailable',
        message: 'ロードストーンに接続できません。',
      },
    }
  }

  if (status !== 200) {
    return {
      status: 503,
      body: {
        error: 'lodestone_unavailable',
        message: 'ロードストーンからデータを取得できませんでした。',
      },
    }
  }

  return null
}

export function mapLodestoneFetchError(error: unknown): { status: number; body: LodestoneApiError } {
  if (error instanceof Error && error.message === 'timeout') {
    return {
      status: 504,
      body: {
        error: 'timeout',
        message: '取得がタイムアウトしました。しばらくして再試行してください。',
      },
    }
  }

  if (error instanceof Error && error.message.startsWith('parse_failed')) {
    return {
      status: 502,
      body: {
        error: 'parse_failed',
        message: 'ロードストーンのHTMLを解析できませんでした。',
      },
    }
  }

  return {
    status: 503,
    body: {
      error: 'lodestone_unavailable',
      message: 'ロードストーンに接続できません。',
    },
  }
}
