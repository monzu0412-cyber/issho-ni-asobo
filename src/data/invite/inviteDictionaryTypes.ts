export type InviteMajorGroupId =
  | 'high-difficulty'
  | 'content'
  | 'exploration'
  | 'social-life'

export type InviteMajorId =
  | 'savage'
  | 'ultimate'
  | 'extreme-arr'
  | 'extreme-heavensward'
  | 'extreme-stormblood'
  | 'extreme-shadowbringers'
  | 'extreme-endwalker'
  | 'extreme-dawntrail'
  | 'dungeon-arr'
  | 'dungeon-heavensward'
  | 'dungeon-stormblood'
  | 'dungeon-shadowbringers'
  | 'dungeon-endwalker'
  | 'dungeon-dawntrail'
  | 'unreal'
  | 'mettle'
  | 'alliance'
  | 'normal-raid'
  | 'vd'
  | 'deep-dungeon'
  | 'eureka'
  | 'bozja'
  | 'treasure-map'
  | 'fate'
  | 'blue-mage'
  | 'fishing'
  | 'social'
  | 'screenshot'
  | 'housing'
  | 'event'

export type InviteDictionaryItem = {
  id: string
  label: string
}

export type InviteMajorCategory = {
  id: InviteMajorId
  label: string
  middleItems: InviteDictionaryItem[]
}

export type InviteMajorGroup = {
  id: InviteMajorGroupId
  label: string
  majorIds: readonly InviteMajorId[]
}

export type InviteContentSelection = {
  majorId: InviteMajorId
  middleId: string
  purposeId: string
}
