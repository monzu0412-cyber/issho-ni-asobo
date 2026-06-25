import { resetInitialAppStateCache } from '../../utils/characterState'
import { patchMainWantInCardDraft } from '../../utils/cardDraftStorage'
import type { WantedCandidateFromCollection } from '../../types/wantedCandidateFromCollection'
import {
  applyWantedCandidateToTarget,
  type WantedCandidateApplyResult,
} from './applyWantedCandidateToTarget'
import { setPendingMainWantTarget } from './pendingMainWantPatch'

export type WantedCandidateMainWantApplyResult =
  | (Extract<WantedCandidateApplyResult, { ok: true }> & { appliedToCard: true })
  | Extract<WantedCandidateApplyResult, { ok: false }>

export function applyWantedCandidateToMainWant(
  candidate: WantedCandidateFromCollection,
): WantedCandidateMainWantApplyResult {
  const result = applyWantedCandidateToTarget(candidate)

  if (!result.ok) {
    return result
  }

  setPendingMainWantTarget(result.target)
  patchMainWantInCardDraft(result.target)
  resetInitialAppStateCache()

  return {
    ...result,
    appliedToCard: true,
  }
}
