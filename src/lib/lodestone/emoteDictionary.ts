import {
  clearCollectionDictionaryCacheForTests,
  getCollectionDictionaryEntries,
  lookupCollectionDictionaryEntry,
  type CollectionDictionaryEntry,
} from './collectionDictionary.js'

const CATEGORY = 'エモート'

export type EmoteDictionaryEntry = CollectionDictionaryEntry

export function getEmoteDictionaryEntries() {
  return getCollectionDictionaryEntries(CATEGORY)
}

export function clearEmoteDictionaryCacheForTests() {
  clearCollectionDictionaryCacheForTests()
}

export function lookupEmoteDictionaryEntry(lodestoneName: string): EmoteDictionaryEntry | null {
  return lookupCollectionDictionaryEntry(CATEGORY, lodestoneName)
}
