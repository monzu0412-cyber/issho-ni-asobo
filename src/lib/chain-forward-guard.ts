import type { SourceDictionaryItem } from '../types/card'

export function resolveSourceChainId(source: SourceDictionaryItem | null | undefined): string | null {
  if (!source) {
    return null
  }

  if (source.chainId?.trim()) {
    return source.chainId.trim()
  }

  for (const route of source.acquisitionRoutes ?? []) {
    if (route.chainId?.trim()) {
      return route.chainId.trim()
    }
  }

  return null
}

export function buildChainBackedContentNames(
  sources: Iterable<SourceDictionaryItem>,
): Set<string> {
  const names = new Set<string>()

  for (const source of sources) {
    if (source.status !== 'confirmed') {
      continue
    }

    const contentName = source.contentName?.trim()

    if (!contentName) {
      continue
    }

    if (resolveSourceChainId(source)) {
      names.add(contentName)
    }
  }

  return names
}

export function passesChainForwardGuard(
  contentName: string | null | undefined,
  source: SourceDictionaryItem | null | undefined,
  chainBackedContentNames: ReadonlySet<string>,
): boolean {
  const key = contentName?.trim()

  if (!key || !chainBackedContentNames.has(key)) {
    return true
  }

  return resolveSourceChainId(source) != null
}
