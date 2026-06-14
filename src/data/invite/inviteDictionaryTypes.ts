export type InviteMajorId =
  | 'savage'
  | 'ultimate'
  | 'extreme'
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

export type InviteDictionaryItem = {
  id: string
  label: string
}

export type InviteMajorCategory = {
  id: InviteMajorId
  label: string
  middleItems: InviteDictionaryItem[]
}

export type InviteContentSelection = {
  majorId: InviteMajorId
  middleId: string
  purposeId: string
}
