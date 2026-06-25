import itemNameDictionary from '../../data/reverse-search/manual/item_name_dictionary.json' with { type: 'json' }
import { normalizeLodestoneItemName } from './normalizeLodestoneItemName.js'

export type CollectionDictionaryEntry = {
  sourceDictionaryId: string
  itemId: number | null
  name: string
  normalizedKeys: string[]
}

type DictionaryIndex = {
  byExactJa: Map<string, CollectionDictionaryEntry>
  byAlias: Map<string, CollectionDictionaryEntry>
  entries: CollectionDictionaryEntry[]
}

const indexByCategory = new Map<string, DictionaryIndex>()

function buildCollectionDictionaryIndex(category1: string): DictionaryIndex {
  const byExactJa = new Map<string, CollectionDictionaryEntry>()
  const byAlias = new Map<string, CollectionDictionaryEntry>()
  const entries: CollectionDictionaryEntry[] = []

  for (const row of itemNameDictionary) {
    if (row.category1 !== category1 || typeof row.ja !== 'string' || row.ja.length === 0 || !row.sourceDictionaryId) {
      continue
    }

    const entry: CollectionDictionaryEntry = {
      sourceDictionaryId: row.sourceDictionaryId,
      itemId: row.itemId ?? null,
      name: row.ja,
      normalizedKeys: [
        normalizeLodestoneItemName(row.ja),
        ...((row.searchNames ?? [])
          .map((searchName) => normalizeLodestoneItemName(searchName))
          .filter((key) => key.length > 0)),
      ],
    }

    entries.push(entry)

    const exactKey = normalizeLodestoneItemName(row.ja)
    if (!byExactJa.has(exactKey)) {
      byExactJa.set(exactKey, entry)
    }

    for (const searchName of row.searchNames ?? []) {
      const aliasKey = normalizeLodestoneItemName(searchName)

      if (aliasKey.length === 0 || aliasKey === exactKey) {
        continue
      }

      if (!byAlias.has(aliasKey) && !byExactJa.has(aliasKey)) {
        byAlias.set(aliasKey, entry)
      }
    }
  }

  return { byExactJa, byAlias, entries }
}

function ensureCollectionDictionaryIndex(category1: string): DictionaryIndex {
  const cached = indexByCategory.get(category1)

  if (cached) {
    return cached
  }

  const built = buildCollectionDictionaryIndex(category1)
  indexByCategory.set(category1, built)
  return built
}

export function getCollectionDictionaryEntries(category1: string): CollectionDictionaryEntry[] {
  return ensureCollectionDictionaryIndex(category1).entries
}

export function lookupCollectionDictionaryEntry(
  category1: string,
  lodestoneName: string,
): CollectionDictionaryEntry | null {
  const index = ensureCollectionDictionaryIndex(category1)
  const key = normalizeLodestoneItemName(lodestoneName)
  return index.byExactJa.get(key) ?? index.byAlias.get(key) ?? null
}

let globalIndex: DictionaryIndex | null = null

function ensureGlobalDictionaryIndex(): DictionaryIndex {
  if (globalIndex) {
    return globalIndex
  }

  const byExactJa = new Map<string, CollectionDictionaryEntry>()
  const byAlias = new Map<string, CollectionDictionaryEntry>()
  const entries: CollectionDictionaryEntry[] = []

  for (const row of itemNameDictionary) {
    if (typeof row.ja !== 'string' || row.ja.length === 0 || !row.sourceDictionaryId) {
      continue
    }

    const entry: CollectionDictionaryEntry = {
      sourceDictionaryId: row.sourceDictionaryId,
      itemId: row.itemId ?? null,
      name: row.ja,
      normalizedKeys: [
        normalizeLodestoneItemName(row.ja),
        ...((row.searchNames ?? [])
          .map((searchName) => normalizeLodestoneItemName(searchName))
          .filter((key) => key.length > 0)),
      ],
    }

    const exactKey = normalizeLodestoneItemName(row.ja)

    if (!byExactJa.has(exactKey)) {
      byExactJa.set(exactKey, entry)
    }

    for (const searchName of row.searchNames ?? []) {
      const aliasKey = normalizeLodestoneItemName(searchName)

      if (aliasKey.length === 0 || aliasKey === exactKey) {
        continue
      }

      if (!byAlias.has(aliasKey) && !byExactJa.has(aliasKey)) {
        byAlias.set(aliasKey, entry)
      }
    }
  }

  globalIndex = { byExactJa, byAlias, entries }
  return globalIndex
}

export function lookupGlobalDictionaryEntryByJa(lodestoneName: string): CollectionDictionaryEntry | null {
  const index = ensureGlobalDictionaryIndex()
  const key = normalizeLodestoneItemName(lodestoneName)
  return index.byExactJa.get(key) ?? index.byAlias.get(key) ?? null
}

export function clearCollectionDictionaryCacheForTests() {
  indexByCategory.clear()
  globalIndex = null
}

export function entryOwnershipKey(entry: CollectionDictionaryEntry): string {
  return entry.itemId != null
    ? `item:${entry.itemId}`
    : `source:${entry.sourceDictionaryId}`
}
