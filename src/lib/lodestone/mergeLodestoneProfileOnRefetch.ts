import type { LodestoneCardState, LodestoneCharacterProfile } from '../../types/lodestone'

export function mergeLodestoneProfileOnRefetch(
  current: LodestoneCardState,
  profile: LodestoneCharacterProfile,
): LodestoneCardState {
  return {
    characterId: profile.characterId,
    input: current.input.trim() || profile.characterId,
    profile,
    jobSelections: { ...current.jobSelections },
    leftColumnDisplayMode: current.leftColumnDisplayMode,
  }
}
