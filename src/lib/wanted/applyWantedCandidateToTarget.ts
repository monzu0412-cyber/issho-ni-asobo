import {
  buildTargetItemFromSearchDictionaryItem,
  getActivityCategoryFromDictionary,
  getTargetIconFromDictionary,
  resolveSearchDictionaryItemByItemId,
  resolveSearchDictionaryItemBySourceId,
} from '../../components/target/targetSearchHelpers'
import type { SearchDictionaryItem, TargetItem } from '../../types/card'
import type {
  WantedCandidateFromCollection,
} from '../../types/wantedCandidateFromCollection'
import { WANTED_COLLECTION_CATEGORY_LABELS } from '../../types/wantedCandidateFromCollection'

export type WantedCandidateApplyResolution = 'search_dictionary' | 'fallback'

export type WantedCandidateApplyResult =
  | {
      ok: true
      target: TargetItem
      searchItem: SearchDictionaryItem | null
      resolution: WantedCandidateApplyResolution
      note?: string
    }
  | {
      ok: false
      reason: string
    }

function resolveSearchDictionaryItem(candidate: WantedCandidateFromCollection): SearchDictionaryItem | null {
  if (candidate.itemId != null) {
    const byItemId = resolveSearchDictionaryItemByItemId(candidate.itemId)

    if (byItemId) {
      return byItemId
    }
  }

  if (candidate.sourceDictionaryId) {
    return resolveSearchDictionaryItemBySourceId(candidate.sourceDictionaryId) ?? null
  }

  return null
}

function buildFallbackTargetItem(candidate: WantedCandidateFromCollection): TargetItem {
  const category1 = WANTED_COLLECTION_CATEGORY_LABELS[candidate.collectionCategory]
  const searchItemStub: SearchDictionaryItem = {
    name: candidate.displayName,
    category1,
    subCategory: category1,
    sourceDictionaryId: candidate.sourceDictionaryId,
    id: candidate.itemId,
  }

  return {
    title: candidate.displayName,
    category: getActivityCategoryFromDictionary('収集'),
    subcategory: category1,
    icon: getTargetIconFromDictionary(searchItemStub),
    iconUrl: null,
    sourceDictionaryId: candidate.sourceDictionaryId,
    contentName: null,
    acquisitionRoutes: [],
  }
}

export function applyWantedCandidateToTarget(candidate: WantedCandidateFromCollection): WantedCandidateApplyResult {
  const searchItem = resolveSearchDictionaryItem(candidate)

  if (searchItem) {
    return {
      ok: true,
      target: buildTargetItemFromSearchDictionaryItem(searchItem),
      searchItem,
      resolution: 'search_dictionary',
    }
  }

  if (!candidate.sourceDictionaryId && candidate.itemId == null) {
    return {
      ok: false,
      reason: 'itemId と sourceDictionaryId の両方がないため、ほしいもの形式へ変換できません。',
    }
  }

  return {
    ok: true,
    target: buildFallbackTargetItem(candidate),
    searchItem: null,
    resolution: 'fallback',
    note: candidate.collectionCategory === 'faceAccessory'
      ? 'フェイスアクセサリーは search_dictionary 未登録のため、カテゴリ名のみ既存形式で表示します。'
      : 'search_dictionary に未登録のため、カテゴリ名のみ既存形式で表示します。',
  }
}
