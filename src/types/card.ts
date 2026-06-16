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

export type ForwardAcquisitionCategory = '零式' | '極' | 'ID' | '地図' | '交換' | '釣り' | 'PvP' | 'その他'

export type EnrichedSearchItem = SearchDictionaryItem & {
  acquisitionCategory: ForwardAcquisitionCategory
  details: string[]
  contentDisplayName: string
  resolvedIconUrl: string | null
}

export type ForwardContentOption = {
  key: string
  displayName: string
}

export type ForwardDetailOption = {
  key: string
  displayName: string
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

export type LayoutMode = 'want' | 'character'

export const layoutModeOptions: Array<{ value: LayoutMode; label: string }> = [
  { value: 'want', label: 'ほしいもの優先' },
  { value: 'character', label: 'キャラクター優先' },
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
