import type { InviteContentSelection } from '../data/invite/inviteDictionaryTypes'

export type ActivityCategory =
  | '戦闘'
  | '収集'
  | '釣り'
  | '地図'
  | 'クラフター'
  | 'ギャザラー'
  | 'SS'
  | 'ハウジング'
  | 'ミラプリ'
  | '演奏'
  | 'PvP'
  | '交流'
  | 'RP'
  | '金策'
  | 'モブハント'
  | 'その他'

export type TodoItem = {
  title: string
  category?: string
  major?: string
  middle?: string
  comment?: string
}

export type ContentSelection = InviteContentSelection

export type TargetItem = {
  title: string
  category: ActivityCategory
  subcategory: string
  icon: string
  comment?: string
  iconUrl?: string | null
  sourceDictionaryId?: string
  contentName?: string | null
  acquisitionRoutes?: AcquisitionRoute[]
}

export type DictionaryMetadata = {
  type?: string
}

export type SearchDictionaryItem = {
  name: string
  searchNames?: string[]
  id?: number | null
  icon?: string | null
  iconPath?: string | null
  iconPathHr1?: string | null
  iconUrl?: string | null
  category?: string
  subCategory?: string
  sourceDictionaryId?: string
  category1?: string
  category2?: string | null
  contentName?: string | null
  rawCategory?: string | null
}

export type ForwardAcquisitionCategory =
  | '零式'
  | 'ノーマルレイド'
  | '極'
  | 'ID'
  | '地図'
  | '交換'
  | '釣り'
  | 'PvP'
  | 'その他'
  | 'クエスト'
  | '討滅戦'
  | 'レイド'
  | 'アライアンス'
  | 'モブハント'
  | 'クラフト・採集'
  | '特殊フィールド'
  | 'イベント'
  | '課金'
  | '実績・ショップ'

export type ForwardStep2Category = ForwardAcquisitionCategory | '探索'

export type ForwardIndexRouteSummary = {
  routeType: string
  detail: string
  dropKind: string
  tokenOrCurrency: string | null
}

export type EquipmentMetadataRoleSource = 'classJobCategory' | 'namePattern'
export type EquipmentMetadataSlotSource = 'prototype' | 'itemUiCategory' | 'none'

export type EquipmentMetadataEntry = {
  itemId: number
  equipLevel: number
  itemLevel: number
  equipRole: EquipRole
  equipJobs: string[]
  equipJobsJa: string
  equipSlot: EquipSlot | null
  itemUiCategory: string
  classJobCategoryId: number
  roleSource: EquipmentMetadataRoleSource
  slotSource: EquipmentMetadataSlotSource
}

export type ForwardIndexItem = {
  itemId: number
  name: string
  role: EquipRole
  slot: EquipSlot | null
  equipLevel: number
  itemLevel: number
  equipRole: EquipRole
  equipJobs: string[]
  equipJobsJa: string
  equipSlot: EquipSlot | null
  itemUiCategory: string
  classJobCategoryId: number
  roleSource: EquipmentMetadataRoleSource
  slotSource: EquipmentMetadataSlotSource
  sourceDictionaryId: string
  category1: string
  category2: string
  publicationStatus: 'public'
  chainId: string
  linkId: string
  routeSummary: ForwardIndexRouteSummary
  acquisitionLinkCount: number
}

export type ForwardIndexSeries = {
  seriesKey: string
  representativeItemId: number | null
  items: ForwardIndexItem[]
}

export type ForwardIndexChain = {
  chainId: string
  chainStatus: string
  chainTemplate: string
  category1: string
  category2: string
  contentName: string
  series: ForwardIndexSeries[]
}

export type ForwardIndexContent = {
  contentName: string
  contentDisplayName: string
  navigationPath: string[]
  navigationPathSource?: string
  category2: string
  acquisitionCategory: ForwardAcquisitionCategory
  chains: ForwardIndexChain[]
}

export type ForwardIndexNavigationGroup = {
  navigationGroup: string
  acquisitionCategory?: ForwardAcquisitionCategory
  contents: ForwardIndexContent[]
}

export type ForwardIndexNavigationRoot = {
  navigationRoot: string
  navigationGroups: ForwardIndexNavigationGroup[]
}

export type ForwardIndexEquipment = {
  navigationRoots: ForwardIndexNavigationRoot[]
}

export type ForwardIndexSeriesGroup = {
  seriesKey: string
  items: EnrichedSearchItem[]
}

export type EquipSlot = '頭' | '胴' | '手' | '脚' | '足'

export type EquipRole = 'タンク' | 'ヒーラー' | 'メレー' | 'レンジ' | 'キャスター' | '共通'

export type EquipTaxonomyKey = EquipSlot | EquipRole

export type EnrichedSearchItem = SearchDictionaryItem & {
  acquisitionCategory: ForwardAcquisitionCategory
  details: string[]
  contentDisplayName: string
  resolvedIconUrl: string | null
  equipSlot: EquipSlot | null
  equipRole: EquipRole | null
  equipLevel?: number | null
  itemLevel?: number | null
  equipJobs?: string[]
  equipJobsJa?: string
  itemUiCategory?: string
  classJobCategoryId?: number
  roleSource?: EquipmentMetadataRoleSource
  slotSource?: EquipmentMetadataSlotSource
}

export type ForwardContentOption = {
  key: string
  displayName: string
  groupLabel?: string
}

export type ForwardDetailOption = {
  key: string
  displayName: string
}

export type ForwardTaxonomyOption = {
  key: EquipTaxonomyKey
  displayName: string
  kind: 'slot' | 'role'
  count: number
}

export type SourceDictionaryItem = {
  id: string
  itemId?: number | null
  name: string
  category1: string
  category2: string | null
  category: string
  subCategory: string
  contentName: string | null
  acquisitionRoutes: AcquisitionRoute[]
  status: string
  chainId?: string | null
  projectedFrom?: string | null
  projectedAt?: string | null
  icon?: string | null
  iconUrl?: string | null
  image?: string | null
  imageUrl?: string | null
}

export type AcquisitionRoute = {
  routeId: string
  type: string
  contentName: string
  detail?: string
  specialConditions?: Record<string, unknown>
  conditionSteps?: ConditionStep[]
  needsReview?: boolean
  chainId?: string
  linkId?: string
  sources?: Array<{ source: string; method: string; decision: string }>
}

export type ConditionStep = {
  type?: string
  target?: string
  count?: number
  note?: string
}

export type InterestItem = {
  iconUrl?: string
  name: ActivityCategory
  level: number
}

export type TimeRange = {
  start: number
  end: number
}

export type PlayTime = {
  weekday: TimeRange
  holiday: TimeRange
}

export type ImageSettings = {
  scale: number
  x: number
  y: number
  rotation: number
}

export type LayoutMode = 'want' | 'character' | 'asobo'

export const layoutModeOptions: Array<{ value: LayoutMode; label: string }> = [
  { value: 'want', label: 'ほしいもの優先' },
  { value: 'character', label: 'キャラクター優先' },
  { value: 'asobo', label: 'あそぼ優先' },
]

export type ImageFrameTheme = 'simple' | 'cute' | 'stylish' | 'cool' | 'mechanical'
export type TargetFrameTheme = 'simple' | 'cute' | 'stylish'
export type TargetFrameCategory = 'fish' | 'mount' | 'minion' | 'gear' | 'music' | 'housing'

export type CardSectionName =
  | 'row2_left'
  | 'row2_center'
  | 'row2_right'
  | 'row3_left'
  | 'row3_center'
  | 'row3_right'
  | 'row4'

export type VoiceChat = '未設定' | 'VC OK' | '聞き専' | 'VCなし'

export const targetFrameThemeOptions: Array<{ value: TargetFrameTheme; label: string }> = [
  { value: 'simple', label: 'シンプル' },
  { value: 'cute', label: 'かわいい' },
  { value: 'stylish', label: 'おしゃれ' },
]


export type SectionTitles = import('../utils/cardDraftStorage').CharacterDraft['sectionTitles']
