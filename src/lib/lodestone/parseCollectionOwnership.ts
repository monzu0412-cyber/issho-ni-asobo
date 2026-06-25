import {
  entryOwnershipKey,
  getCollectionDictionaryEntries,
  lookupCollectionDictionaryEntry,
  type CollectionDictionaryEntry,
} from './collectionDictionary.js'
import type {
  LodestoneCollectionOwnershipResult,
  LodestoneCollectionUnmatchedEntry,
} from '../../types/lodestoneCollection.js'

export type ParsedCollectionListItem = {
  tooltipHref: string
  tooltipHash: string
}

export type CollectionListPageConfig = {
  category1: string
  listPath: 'minion' | 'mount' | 'faceaccessory'
  totalClassNames: string[]
  tooltipLabelClass: string
}

export function parseCollectionListPage(
  html: string,
  config: CollectionListPageConfig,
): { totalOnLodestone: number; items: ParsedCollectionListItem[] } {
  let totalOnLodestone = 0

  for (const className of config.totalClassNames) {
    const totalMatch = html.match(new RegExp(`${className}[^>]*>TOTAL\\s*<span>(\\d[\\d,]*)<\\/span>`, 'i'))

    if (totalMatch) {
      totalOnLodestone = Number(totalMatch[1].replace(/,/g, ''))
      break
    }
  }

  const items: ParsedCollectionListItem[] = []
  const seenHashes = new Set<string>()
  const tooltipPattern = new RegExp(
    `data-tooltip_href="([^"]*/${config.listPath}/tooltip/([a-f0-9]+))"`,
    'gi',
  )

  for (const match of html.matchAll(tooltipPattern)) {
    const tooltipHref = match[1]
    const tooltipHash = match[2]

    if (!tooltipHash || seenHashes.has(tooltipHash)) {
      continue
    }

    seenHashes.add(tooltipHash)
    items.push({ tooltipHref, tooltipHash })
  }

  return { totalOnLodestone, items }
}

export function parseCollectionTooltipName(html: string, tooltipLabelClass: string): string | null {
  const labelMatch = html.match(new RegExp(`${tooltipLabelClass}[^>]*>([^<]+)<`))
  const label = labelMatch?.[1]?.trim()

  return label && label.length > 0 ? label : null
}

export type ResolvedLodestoneCollectionItem = {
  tooltipHref?: string
  lodestoneName: string
  lodestoneCategory?: string
}

export type CollectionDictionaryProvider = {
  lookup: (lodestoneName: string) => CollectionDictionaryEntry | null
  getEntries: () => CollectionDictionaryEntry[]
}

export function buildCollectionOwnershipResult(
  category1: string,
  characterId: string,
  totalOnLodestone: number,
  lodestoneItems: ResolvedLodestoneCollectionItem[],
  unmatchedFromFetch: LodestoneCollectionUnmatchedEntry[],
  dictionaryProvider?: CollectionDictionaryProvider,
): LodestoneCollectionOwnershipResult {
  const lookup = dictionaryProvider?.lookup
    ?? ((lodestoneName: string) => lookupCollectionDictionaryEntry(category1, lodestoneName))
  const getDictionaryEntries = dictionaryProvider?.getEntries
    ?? (() => getCollectionDictionaryEntries(category1))

  const ownedKeys = new Set<string>()
  const owned: LodestoneCollectionOwnershipResult['owned'] = []
  const unmatchedOwned: LodestoneCollectionUnmatchedEntry[] = [...unmatchedFromFetch]

  for (const item of lodestoneItems) {
    const dictionaryEntry = lookup(item.lodestoneName)

    if (!dictionaryEntry) {
      unmatchedOwned.push({
        lodestoneName: item.lodestoneName,
        tooltipHref: item.tooltipHref,
        reason: 'dictionary_miss',
      })
      continue
    }

    const key = entryOwnershipKey(dictionaryEntry)

    if (ownedKeys.has(key)) {
      unmatchedOwned.push({
        lodestoneName: item.lodestoneName,
        tooltipHref: item.tooltipHref,
        reason: 'duplicate_dictionary_match',
      })
      continue
    }

    ownedKeys.add(key)
    owned.push(toOwnedEntry(dictionaryEntry, item.lodestoneName, item.lodestoneCategory))
  }

  const dictionaryEntries = getDictionaryEntries()
  const missing: LodestoneCollectionOwnershipResult['missing'] = []
  const missingKeys = new Set<string>()

  for (const entry of dictionaryEntries) {
    const key = entryOwnershipKey(entry)

    if (ownedKeys.has(key) || missingKeys.has(key)) {
      continue
    }

    missingKeys.add(key)
    missing.push(toMissingEntry(entry))
  }

  return {
    characterId,
    totalOnLodestone,
    owned,
    unmatchedOwned,
    missing,
    dictionaryTotal: dictionaryEntries.length,
  }
}

function toOwnedEntry(
  entry: CollectionDictionaryEntry,
  lodestoneName: string,
  lodestoneCategory?: string,
) {
  return {
    itemId: entry.itemId,
    name: entry.name,
    lodestoneName,
    sourceDictionaryId: entry.sourceDictionaryId,
    ...(lodestoneCategory ? { lodestoneCategory } : {}),
  }
}

function toMissingEntry(entry: CollectionDictionaryEntry) {
  return {
    itemId: entry.itemId,
    name: entry.name,
    sourceDictionaryId: entry.sourceDictionaryId,
  }
}
