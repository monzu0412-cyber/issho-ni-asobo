import type { ChangeEvent, CSSProperties, RefObject, SyntheticEvent } from 'react'
import type {
  ActivityCategory,
  CardSectionName,
  ContentSelection,
  ImageSettings,
  InterestItem,
  LayoutMode,
  PlayTime,
  SearchDictionaryItem,
  SectionTitles,
  TargetFrameTheme,
  TargetItem,
  TodoItem,
  VoiceChat,
} from '../../types/card'
import type { HelpSectionSubtitle, WantSectionSubtitle } from '../../data/activityColumnTitles'
import type {
  JobUserSelection,
  LeftColumnDisplayMode,
  LodestoneCharacterProfile,
} from '../../types/lodestone'
import { CardBodyAsobo } from './CardBodyAsobo'
import { CardBodyCharacter } from './CardBodyCharacter'
import { CardBodyWant } from './CardBodyWant'

type DataCenter = 'Elemental' | 'Gaia' | 'Mana' | 'Meteor'

export type CardBodyProps = {
  layoutMode: LayoutMode
  imageUrl: string
  imageSettings: ImageSettings
  isMobileViewport: boolean
  isDesktopImageAdjustUi: boolean
  isImageAdjustOpen: boolean
  effectivePreviewMode: boolean
  restoredFromDraft: boolean
  showImageAdjustPanel: boolean
  showImageAdjustReopen: boolean
  imageMoveRange: number
  showMobileHorizontalImageHint: boolean
  profileImageInputRef: RefObject<HTMLInputElement | null>
  onProfileImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  openImageAdjustPanel: () => void
  updateImageSetting: (field: keyof ImageSettings, value: number) => void
  resetImageRotation: () => void
  setIsImageAdjustOpen: (open: boolean) => void
  topTarget: TargetItem
  hasTargetFrame: boolean
  targetFrameUrl: string
  targetFrameTheme: TargetFrameTheme
  targetSearchQueries: string[]
  onTargetFrameLoad: () => void
  onTargetFrameError: (event: SyntheticEvent<HTMLImageElement>) => void
  updateTopTargetComment: (comment: string) => void
  updateTargetSearchQuery: (targetIndex: number, query: string) => void
  selectSearchTarget: (targetIndex: number, item: SearchDictionaryItem) => void
  selectUnsupportedTarget: (targetIndex: number) => void
  updateTargetFrameTheme: (theme: TargetFrameTheme) => void
  characterName: string
  characterDc: DataCenter
  characterWorld: string
  characterRoles: {
    tank: boolean
    healer: boolean
    dps: boolean
  }
  playTime: PlayTime
  characterVc: VoiceChat
  dataCenters: DataCenter[]
  worldsByDc: Record<DataCenter, readonly string[]>
  voiceChatOptions: readonly VoiceChat[]
  timeOptions: number[]
  updateCharacterName: (value: string) => void
  updateDataCenter: (dc: DataCenter) => void
  updateWorld: (world: string) => void
  updateRole: (role: 'tank' | 'healer' | 'dps', active: boolean) => void
  updatePlayTime: (day: 'weekday' | 'holiday', field: 'start' | 'end', value: number) => void
  updateVoiceChat: (vc: VoiceChat) => void
  targets: TargetItem[]
  getCardSectionBackgroundStyle: (section: CardSectionName) => CSSProperties
  updateSecondaryTargetComment: (targetIndex: number, comment: string) => void
  interests: InterestItem[]
  todoList: TodoItem[]
  unfinishedList: TodoItem[]
  sectionTitles: SectionTitles
  contentSelections: {
    todoList: ContentSelection
    unfinishedList: ContentSelection
  }
  contentDisplayLimit: number
  updateInterestLevel: (interestName: ActivityCategory, level: number) => void
  updateActivitySubtitle: (column: 'want' | 'help', value: WantSectionSubtitle | HelpSectionSubtitle) => void
  updateContentSelection: (listKey: 'todoList' | 'unfinishedList', field: keyof ContentSelection, value: string) => void
  addContentItem: (listKey: 'todoList' | 'unfinishedList') => void
  removeContentItem: (listKey: 'todoList' | 'unfinishedList', itemKey: string) => void
  characterMessage: string
  updateCharacterMessage: (message: string) => void
  lodestoneInput: string
  lodestoneFetchError: string | null
  lodestoneApplyMessage: string | null
  lodestoneApplyError: string | null
  isLodestoneFetching: boolean
  leftColumnDisplayMode: LeftColumnDisplayMode
  lodestoneProfile: LodestoneCharacterProfile | null
  jobSelections: Record<string, JobUserSelection>
  updateLodestoneInput: (value: string) => void
  fetchLodestoneProfile: () => void
  refetchLodestoneProfile: () => void
  savedLodestoneCharacterId: string | null
  applyLodestoneProfileToCard: (overwrite: boolean) => void
  onLeftColumnDisplayModeChange: (mode: LeftColumnDisplayMode) => void
  onJobSelectionChange: (jobId: string, selection: JobUserSelection) => void
}

export function CardBody(props: CardBodyProps) {
  if (props.layoutMode === 'character') {
    return <CardBodyCharacter {...props} />
  }

  if (props.layoutMode === 'asobo') {
    return <CardBodyAsobo {...props} />
  }

  return <CardBodyWant {...props} />
}
