import type { ChangeEvent, CSSProperties, RefObject, SyntheticEvent } from 'react'
import type {
  ActivityCategory,
  CardSectionName,
  ContentSelection,
  ImageSettings,
  InterestItem,
  PlayTime,
  SearchDictionaryItem,
  SectionTitles,
  TargetFrameTheme,
  TargetItem,
  TodoItem,
  VoiceChat,
} from '../../types/card'
import type { HelpSectionSubtitle, WantSectionSubtitle } from '../../data/activityColumnTitles'
import { CardActivityBox } from './CardActivityBox'
import { CardBottomRow } from './CardBottomRow'
import { CharacterSummaryPanel } from './CharacterSummaryPanel'
import { MainWantPanel } from './MainWantPanel'
import { ProfileImageColumn } from './ProfileImageColumn'
import { WantSlotPanel } from './WantSlotPanel'

type DataCenter = 'Elemental' | 'Gaia' | 'Mana' | 'Meteor'

export type CardBodyProps = {
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
}

export function CardBody({
  imageUrl,
  imageSettings,
  isMobileViewport,
  isDesktopImageAdjustUi,
  isImageAdjustOpen,
  effectivePreviewMode,
  restoredFromDraft,
  showImageAdjustPanel,
  showImageAdjustReopen,
  imageMoveRange,
  profileImageInputRef,
  onProfileImageFileChange,
  openImageAdjustPanel,
  updateImageSetting,
  resetImageRotation,
  setIsImageAdjustOpen,
  topTarget,
  hasTargetFrame,
  targetFrameUrl,
  targetFrameTheme,
  targetSearchQueries,
  onTargetFrameLoad,
  onTargetFrameError,
  updateTopTargetComment,
  updateTargetSearchQuery,
  selectSearchTarget,
  selectUnsupportedTarget,
  updateTargetFrameTheme,
  characterName,
  characterDc,
  characterWorld,
  characterRoles,
  playTime,
  characterVc,
  dataCenters,
  worldsByDc,
  voiceChatOptions,
  timeOptions,
  updateCharacterName,
  updateDataCenter,
  updateWorld,
  updateRole,
  updatePlayTime,
  updateVoiceChat,
  targets,
  getCardSectionBackgroundStyle,
  updateSecondaryTargetComment,
  interests,
  todoList,
  unfinishedList,
  sectionTitles,
  contentSelections,
  contentDisplayLimit,
  updateInterestLevel,
  updateActivitySubtitle,
  updateContentSelection,
  addContentItem,
  removeContentItem,
  characterMessage,
  updateCharacterMessage,
}: CardBodyProps) {
  return (
    <div className="cardBody">
      <div className="heroLayout">
      <section className="topRow">
        <ProfileImageColumn
          imageUrl={imageUrl}
          imageSettings={imageSettings}
          isMobileViewport={isMobileViewport}
          isDesktopImageAdjustUi={isDesktopImageAdjustUi}
          isImageAdjustOpen={isImageAdjustOpen}
          effectivePreviewMode={effectivePreviewMode}
          restoredFromDraft={restoredFromDraft}
          showImageAdjustPanel={showImageAdjustPanel}
          showImageAdjustReopen={showImageAdjustReopen}
          imageMoveRange={imageMoveRange}
          profileImageInputRef={profileImageInputRef}
          onProfileImageFileChange={onProfileImageFileChange}
          openImageAdjustPanel={openImageAdjustPanel}
          updateImageSetting={updateImageSetting}
          resetImageRotation={resetImageRotation}
          setIsImageAdjustOpen={setIsImageAdjustOpen}
        />

        <MainWantPanel
          topTarget={topTarget}
          hasTargetFrame={hasTargetFrame}
          targetFrameUrl={targetFrameUrl}
          targetFrameTheme={targetFrameTheme}
          effectivePreviewMode={effectivePreviewMode}
          targetSearchQuery={targetSearchQueries[0] ?? ''}
          onTargetFrameLoad={onTargetFrameLoad}
          onTargetFrameError={onTargetFrameError}
          updateTopTargetComment={updateTopTargetComment}
          updateTargetSearchQuery={(query) => updateTargetSearchQuery(0, query)}
          selectSearchTarget={(item) => selectSearchTarget(0, item)}
          selectUnsupportedTarget={() => selectUnsupportedTarget(0)}
          updateTargetFrameTheme={updateTargetFrameTheme}
        />
      </section>
      </div>

      <section className="middleRow">
        <CharacterSummaryPanel
          name={characterName}
          dc={characterDc}
          world={characterWorld}
          roles={characterRoles}
          playTime={playTime}
          vc={characterVc}
          sectionBackgroundStyle={getCardSectionBackgroundStyle('row2_left')}
          dataCenters={dataCenters}
          worldsByDc={worldsByDc}
          voiceChatOptions={voiceChatOptions}
          timeOptions={timeOptions}
          updateCharacterName={updateCharacterName}
          updateDataCenter={updateDataCenter}
          updateWorld={updateWorld}
          updateRole={updateRole}
          updatePlayTime={updatePlayTime}
          updateVoiceChat={updateVoiceChat}
        />

        <WantSlotPanel
          targets={targets}
          targetFrameTheme={targetFrameTheme}
          effectivePreviewMode={effectivePreviewMode}
          targetSearchQueries={targetSearchQueries}
          getCardSectionBackgroundStyle={getCardSectionBackgroundStyle}
          updateSecondaryTargetComment={updateSecondaryTargetComment}
          updateTargetSearchQuery={updateTargetSearchQuery}
          selectSearchTarget={selectSearchTarget}
          selectUnsupportedTarget={selectUnsupportedTarget}
        />
      </section>

      <CardActivityBox
        interests={interests}
        todoList={todoList}
        unfinishedList={unfinishedList}
        sectionTitles={sectionTitles}
        contentSelections={contentSelections}
        contentDisplayLimit={contentDisplayLimit}
        effectivePreviewMode={effectivePreviewMode}
        interestSectionStyle={getCardSectionBackgroundStyle('row3_left')}
        wantSectionStyle={getCardSectionBackgroundStyle('row3_center')}
        helpSectionStyle={getCardSectionBackgroundStyle('row3_right')}
        updateInterestLevel={updateInterestLevel}
        updateActivitySubtitle={updateActivitySubtitle}
        updateContentSelection={updateContentSelection}
        addContentItem={addContentItem}
        removeContentItem={removeContentItem}
      />

      <CardBottomRow
        message={characterMessage}
        effectivePreviewMode={effectivePreviewMode}
        sectionBackgroundStyle={getCardSectionBackgroundStyle('row4')}
        updateCharacterMessage={updateCharacterMessage}
      />
    </div>
  )
}
