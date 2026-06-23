import {
  getLodestoneCharacterProfile,
  resolveCharacterIdFromRequest,
} from '../../../src/lib/lodestone/lodestoneCharacterService.js'

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  socket?: {
    remoteAddress?: string | null
  }
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  end: () => void
}

function getClientKey(request: ApiRequest): string {
  const forwarded = request.headers?.['x-forwarded-for']

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || 'anonymous'
  }

  return request.socket?.remoteAddress ?? 'anonymous'
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'GET') {
    response.status(405).json({
      error: 'method_not_allowed',
      message: 'GET のみ対応しています。',
    })
    return
  }

  const idParam = (request as ApiRequest & { query?: { id?: string | string[] } }).query?.id
  const rawId = Array.isArray(idParam) ? idParam[0] : idParam
  const characterId = resolveCharacterIdFromRequest(rawId)

  if (!characterId) {
    response.status(400).json({
      error: 'invalid_character_id',
      message: 'キャラクターIDの形式が正しくありません。',
    })
    return
  }

  const result = await getLodestoneCharacterProfile(characterId, getClientKey(request))

  if (!result.ok) {
    response.status(result.status).json(result.body)
    return
  }

  response.status(200).json(result.body)
}
