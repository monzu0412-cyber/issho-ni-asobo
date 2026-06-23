const CHARACTER_ID_PATTERN = /^\d{7,10}$/
const CHARACTER_URL_PATTERN = /\/lodestone\/character\/(\d{7,10})\/?/i

export function normalizeCharacterIdInput(input: string): string | null {
  const trimmed = input.trim()

  if (!trimmed) {
    return null
  }

  if (CHARACTER_ID_PATTERN.test(trimmed)) {
    return trimmed
  }

  const urlMatch = trimmed.match(CHARACTER_URL_PATTERN)

  if (urlMatch?.[1]) {
    return urlMatch[1]
  }

  try {
    const url = new URL(trimmed)
    const pathMatch = url.pathname.match(CHARACTER_URL_PATTERN)

    if (pathMatch?.[1]) {
      return pathMatch[1]
    }
  } catch {
    return null
  }

  return null
}

export function isValidCharacterId(characterId: string): boolean {
  return CHARACTER_ID_PATTERN.test(characterId)
}
