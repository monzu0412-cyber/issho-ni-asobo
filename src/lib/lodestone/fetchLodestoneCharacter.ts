import { normalizeCharacterIdInput } from '../../lib/lodestone/normalizeCharacterId'
import type { LodestoneApiError, LodestoneApiSuccess } from '../../types/lodestone'

export type LodestoneFetchResult =
  | { ok: true; data: LodestoneApiSuccess; status: number }
  | { ok: false; error: LodestoneApiError; status: number }

export async function fetchLodestoneCharacterProfile(characterId: string): Promise<LodestoneFetchResult> {
  const response = await fetch(`/api/lodestone/character/${encodeURIComponent(characterId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const body = await response.json() as LodestoneApiSuccess | LodestoneApiError

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
    data: body as LodestoneApiSuccess,
  }
}

export function normalizeLodestoneInput(input: string): string | null {
  return normalizeCharacterIdInput(input)
}
