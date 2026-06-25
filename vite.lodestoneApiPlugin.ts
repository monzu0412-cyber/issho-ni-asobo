import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  getLodestoneCharacterProfile,
  resolveCharacterIdFromRequest,
} from './src/lib/lodestone/lodestoneCharacterService'
import { getLodestoneMinionOwnership } from './src/lib/lodestone/lodestoneMinionService'
import { getLodestoneMountOwnership } from './src/lib/lodestone/lodestoneMountService'
import { getLodestoneEmoteOwnership } from './src/lib/lodestone/lodestoneEmoteService'
import { getLodestoneCollections } from './src/lib/lodestone/lodestoneCollectionsService'
import { getLodestoneFaceAccessoryOwnership } from './src/lib/lodestone/lodestoneFaceAccessoryService'

function getClientKey(request: IncomingMessage): string {
  const forwarded = request.headers['x-forwarded-for']

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || 'anonymous'
  }

  return request.socket.remoteAddress ?? 'anonymous'
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

export function lodestoneDevApiPlugin(): Plugin {
  return {
    name: 'lodestone-dev-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const collectionsMatch = request.url?.match(/^\/api\/lodestone\/character\/([^/?#]+)\/collections\/?$/)

        if (collectionsMatch) {
          if (request.method !== 'GET') {
            sendJson(response, 405, {
              error: 'method_not_allowed',
              message: 'GET のみ対応しています。',
            })
            return
          }

          const characterId = resolveCharacterIdFromRequest(decodeURIComponent(collectionsMatch[1] ?? ''))

          if (!characterId) {
            sendJson(response, 400, {
              error: 'invalid_character_id',
              message: 'キャラクターIDの形式が正しくありません。',
            })
            return
          }

          const result = await getLodestoneCollections(characterId, getClientKey(request))

          if (!result.ok) {
            sendJson(response, result.status, result.body)
            return
          }

          sendJson(response, 200, result.body)
          return
        }

        const faceAccessoryMatch = request.url?.match(/^\/api\/lodestone\/character\/([^/?#]+)\/faceaccessories\/?$/)

        if (faceAccessoryMatch) {
          if (request.method !== 'GET') {
            sendJson(response, 405, {
              error: 'method_not_allowed',
              message: 'GET のみ対応しています。',
            })
            return
          }

          const characterId = resolveCharacterIdFromRequest(decodeURIComponent(faceAccessoryMatch[1] ?? ''))

          if (!characterId) {
            sendJson(response, 400, {
              error: 'invalid_character_id',
              message: 'キャラクターIDの形式が正しくありません。',
            })
            return
          }

          const result = await getLodestoneFaceAccessoryOwnership(characterId, getClientKey(request))

          if (!result.ok) {
            sendJson(response, result.status, result.body)
            return
          }

          sendJson(response, 200, result.body)
          return
        }

        const emoteMatch = request.url?.match(/^\/api\/lodestone\/character\/([^/?#]+)\/emotes\/?$/)

        if (emoteMatch) {
          if (request.method !== 'GET') {
            sendJson(response, 405, {
              error: 'method_not_allowed',
              message: 'GET のみ対応しています。',
            })
            return
          }

          const characterId = resolveCharacterIdFromRequest(decodeURIComponent(emoteMatch[1] ?? ''))

          if (!characterId) {
            sendJson(response, 400, {
              error: 'invalid_character_id',
              message: 'キャラクターIDの形式が正しくありません。',
            })
            return
          }

          const result = await getLodestoneEmoteOwnership(characterId, getClientKey(request))

          if (!result.ok) {
            sendJson(response, result.status, result.body)
            return
          }

          sendJson(response, 200, result.body)
          return
        }

        const mountMatch = request.url?.match(/^\/api\/lodestone\/character\/([^/?#]+)\/mounts\/?$/)

        if (mountMatch) {
          if (request.method !== 'GET') {
            sendJson(response, 405, {
              error: 'method_not_allowed',
              message: 'GET のみ対応しています。',
            })
            return
          }

          const characterId = resolveCharacterIdFromRequest(decodeURIComponent(mountMatch[1] ?? ''))

          if (!characterId) {
            sendJson(response, 400, {
              error: 'invalid_character_id',
              message: 'キャラクターIDの形式が正しくありません。',
            })
            return
          }

          const result = await getLodestoneMountOwnership(characterId, getClientKey(request))

          if (!result.ok) {
            sendJson(response, result.status, result.body)
            return
          }

          sendJson(response, 200, result.body)
          return
        }

        const minionMatch = request.url?.match(/^\/api\/lodestone\/character\/([^/?#]+)\/minions\/?$/)

        if (minionMatch) {
          if (request.method !== 'GET') {
            sendJson(response, 405, {
              error: 'method_not_allowed',
              message: 'GET のみ対応しています。',
            })
            return
          }

          const characterId = resolveCharacterIdFromRequest(decodeURIComponent(minionMatch[1] ?? ''))

          if (!characterId) {
            sendJson(response, 400, {
              error: 'invalid_character_id',
              message: 'キャラクターIDの形式が正しくありません。',
            })
            return
          }

          const result = await getLodestoneMinionOwnership(characterId, getClientKey(request))

          if (!result.ok) {
            sendJson(response, result.status, result.body)
            return
          }

          sendJson(response, 200, result.body)
          return
        }

        const match = request.url?.match(/^\/api\/lodestone\/character\/([^/?#]+)\/?$/)

        if (!match) {
          next()
          return
        }

        if (request.method !== 'GET') {
          sendJson(response, 405, {
            error: 'method_not_allowed',
            message: 'GET のみ対応しています。',
          })
          return
        }

        const characterId = resolveCharacterIdFromRequest(decodeURIComponent(match[1] ?? ''))

        if (!characterId) {
          sendJson(response, 400, {
            error: 'invalid_character_id',
            message: 'キャラクターIDの形式が正しくありません。',
          })
          return
        }

        const result = await getLodestoneCharacterProfile(characterId, getClientKey(request))

        if (!result.ok) {
          sendJson(response, result.status, result.body)
          return
        }

        sendJson(response, 200, result.body)
      })
    },
  }
}
