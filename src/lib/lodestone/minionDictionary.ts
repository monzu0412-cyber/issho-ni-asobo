import {
  clearCollectionDictionaryCacheForTests,
  getCollectionDictionaryEntries,
  lookupCollectionDictionaryEntry,
  type CollectionDictionaryEntry,
} from './collectionDictionary.js'

const CATEGORY = 'ミニオン'

export type MinionDictionaryEntry = CollectionDictionaryEntry

export function getMinionDictionaryIndex() {
  return getCollectionDictionaryEntries(CATEGORY)
}

export function getMinionDictionaryEntries() {
  return getCollectionDictionaryEntries(CATEGORY)
}

export function clearMinionDictionaryCacheForTests() {
  clearCollectionDictionaryCacheForTests()
}

export function lookupMinionDictionaryEntry(lodestoneName: string): MinionDictionaryEntry | null {
  return lookupCollectionDictionaryEntry(CATEGORY, lodestoneName)
}
