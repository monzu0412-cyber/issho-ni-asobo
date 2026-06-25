import type { LodestoneApiError } from '../../types/lodestone'
import type { LodestoneCollectionsApiSuccess } from '../../types/lodestoneCollections'

export type LodestoneCollectionsFetchResult =
  | { ok: true; data: LodestoneCollectionsApiSuccess; status: number }
  | { ok: false; error: LodestoneApiError; status: number }

export async function fetchLodestoneCollections(characterId: string): Promise<LodestoneCollectionsFetchResult> {
  const response = await fetch(`/api/lodestone/character/${encodeURIComponent(characterId)}/collections`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const body = await response.json() as LodestoneCollectionsApiSuccess | LodestoneApiError

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: body as LodestoneApiError,
    }
  }

  return {
    ok: true,
    status: response.status,
    data: body as LodestoneCollectionsApiSuccess,
  }
}
