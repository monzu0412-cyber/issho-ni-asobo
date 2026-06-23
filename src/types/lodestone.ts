export type LodestoneCharacterJob = {
  jobId: string
  jobName: string
  level: number
  isCapped: boolean
}

export type LodestoneCharacterProfile = {
  characterId: string
  name: string
  world: string
  dataCenter?: string
  jobs: LodestoneCharacterJob[]
}

export type LeftColumnDisplayMode = 'interests' | 'jobs'

export type JobUserSelection = 'baseline' | 'playable' | 'main'

export type LodestoneCardState = {
  characterId: string
  input: string
  profile: LodestoneCharacterProfile | null
  jobSelections: Record<string, JobUserSelection>
  leftColumnDisplayMode: LeftColumnDisplayMode
}

export function createDefaultLodestoneCardState(): LodestoneCardState {
  return {
    characterId: '',
    input: '',
    profile: null,
    jobSelections: {},
    leftColumnDisplayMode: 'interests',
  }
}

export type LodestoneApiErrorCode =
  | 'invalid_character_id'
  | 'character_not_found'
  | 'character_private'
  | 'lodestone_unavailable'
  | 'parse_failed'
  | 'timeout'
  | 'rate_limited'
  | 'method_not_allowed'

export type LodestoneApiError = {
  error: LodestoneApiErrorCode
  message: string
}

export type LodestoneApiSuccess = {
  profile: LodestoneCharacterProfile
  cached: boolean
}
