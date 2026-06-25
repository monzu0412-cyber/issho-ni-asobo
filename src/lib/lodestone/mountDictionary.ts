import {
  clearCollectionDictionaryCacheForTests,
  getCollectionDictionaryEntries,
  lookupCollectionDictionaryEntry,
  type CollectionDictionaryEntry,
} from './collectionDictionary.js'

const CATEGORY = 'マウント'

export type MountDictionaryEntry = CollectionDictionaryEntry

export function getMountDictionaryEntries() {
  return getCollectionDictionaryEntries(CATEGORY)
}

export function clearMountDictionaryCacheForTests() {
  clearCollectionDictionaryCacheForTests()
}

export function lookupMountDictionaryEntry(lodestoneName: string): MountDictionaryEntry | null {
  return lookupCollectionDictionaryEntry(CATEGORY, lodestoneName)
}
