import faceAccessoryDisplayNames from '../../data/lodestone/face_accessory_display_names.json' with { type: 'json' }
import {
  clearCollectionDictionaryCacheForTests,
  lookupGlobalDictionaryEntryByJa,
  type CollectionDictionaryEntry,
} from './collectionDictionary.js'
import { normalizeLodestoneItemName } from './normalizeLodestoneItemName.js'

export type FaceAccessoryDictionaryEntry = CollectionDictionaryEntry

type FaceAccessoryDictionaryIndex = {
  byExactJa: Map<string, FaceAccessoryDictionaryEntry>
  byAlias: Map<string, FaceAccessoryDictionaryEntry>
  entries: FaceAccessoryDictionaryEntry[]
}

let faceAccessoryIndex: FaceAccessoryDictionaryIndex | null = null

function buildFaceAccessoryDictionaryIndex(): FaceAccessoryDictionaryIndex {
  const byExactJa = new Map<string, FaceAccessoryDictionaryEntry>()
  const byAlias = new Map<string, FaceAccessoryDictionaryEntry>()
  const entries: FaceAccessoryDictionaryEntry[] = []

  for (const displayName of faceAccessoryDisplayNames) {
    const dictionaryEntry = lookupGlobalDictionaryEntryByJa(displayName)
    const normalizedDisplayName = normalizeLodestoneItemName(displayName)
    const entry: FaceAccessoryDictionaryEntry = dictionaryEntry ?? {
      sourceDictionaryId: `face_accessory:${normalizedDisplayName}`,
      itemId: null,
      name: displayName,
      normalizedKeys: [normalizedDisplayName],
    }

    entries.push(entry)

    const exactKey = normalizeLodestoneItemName(entry.name)
    if (!byExactJa.has(exactKey)) {
      byExactJa.set(exactKey, entry)
    }

    for (const aliasKey of entry.normalizedKeys) {
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

function ensureFaceAccessoryDictionaryIndex(): FaceAccessoryDictionaryIndex {
  if (faceAccessoryIndex) {
    return faceAccessoryIndex
  }

  faceAccessoryIndex = buildFaceAccessoryDictionaryIndex()
  return faceAccessoryIndex
}

export function getFaceAccessoryDictionaryEntries() {
  return ensureFaceAccessoryDictionaryIndex().entries
}

export function clearFaceAccessoryDictionaryCacheForTests() {
  faceAccessoryIndex = null
  clearCollectionDictionaryCacheForTests()
}

export function lookupFaceAccessoryDictionaryEntry(lodestoneName: string): FaceAccessoryDictionaryEntry | null {
  const index = ensureFaceAccessoryDictionaryIndex()
  const key = normalizeLodestoneItemName(lodestoneName)
  return index.byExactJa.get(key) ?? index.byAlias.get(key) ?? null
}

export const FACE_ACCESSORY_DICTIONARY_CATEGORY = 'フェイスアクセサリー'
