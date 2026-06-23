import { CardActivityBox } from './CardActivityBox'
import { CardBottomRow } from './CardBottomRow'
import { CharacterSummaryPanel } from './CharacterSummaryPanel'
import { ProfileImageColumn } from './ProfileImageColumn'
import { WantSlotColumn } from './WantSlotColumn'
import type { CardBodyProps } from './CardBody'
import { resolveLayoutSectionBackground } from '../../utils/layoutSectionBackground'

const rankVariants = ['gold', 'silver', 'bronze'] as const

export function CardBodyAsobo(props: CardBodyProps) {
  const {
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
    showMobileHorizontalImageHint,
    profileImageInputRef,
    onProfileImageFileChange,
    openImageAdjustPanel,
    updateImageSetting,
    resetImageRotation,
    setIsImageAdjustOpen,
    targetFrameTheme,
    targetSearchQueries,
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
    lodestoneInput,
    lodestoneFetchError,
    lodestoneApplyMessage,
    lodestoneApplyError,
    isLodestoneFetching,
    leftColumnDisplayMode,
    lodestoneProfile,
    jobSelections,
    updateLodestoneInput,
    fetchLodestoneProfile,
    refetchLodestoneProfile,
    savedLodestoneCharacterId,
    applyLodestoneProfileToCard,
    onLeftColumnDisplayModeChange,
    onJobSelectionChange,
  } = props

  const wantRankSlots = ['wantRank1', 'wantRank2', 'wantRank3'] as const

  return (
    <div className="cardBody cardBody--layout-asobo">
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
            showMobileHorizontalImageHint={showMobileHorizontalImageHint}
            profileImageInputRef={profileImageInputRef}
            onProfileImageFileChange={onProfileImageFileChange}
            openImageAdjustPanel={openImageAdjustPanel}
            updateImageSetting={updateImageSetting}
            resetImageRotation={resetImageRotation}
            setIsImageAdjustOpen={setIsImageAdjustOpen}
          />

          <CharacterSummaryPanel
            name={characterName}
            dc={characterDc}
            world={characterWorld}
            roles={characterRoles}
            playTime={playTime}
            vc={characterVc}
            sectionBackgroundStyle={getCardSectionBackgroundStyle(
              resolveLayoutSectionBackground('asobo', 'character'),
            )}
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
            lodestoneInput={lodestoneInput}
            lodestoneFetchError={lodestoneFetchError}
            lodestoneApplyMessage={lodestoneApplyMessage}
            lodestoneApplyError={lodestoneApplyError}
            isLodestoneFetching={isLodestoneFetching}
            lodestoneProfile={lodestoneProfile}
            updateLodestoneInput={updateLodestoneInput}
            fetchLodestoneProfile={fetchLodestoneProfile}
            refetchLodestoneProfile={refetchLodestoneProfile}
            savedLodestoneCharacterId={savedLodestoneCharacterId}
            applyLodestoneProfileToCard={applyLodestoneProfileToCard}
          />
        </section>
      </div>

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
        leftColumnDisplayMode={leftColumnDisplayMode}
        lodestoneProfile={lodestoneProfile}
        jobSelections={jobSelections}
        onLeftColumnDisplayModeChange={onLeftColumnDisplayModeChange}
        onJobSelectionChange={onJobSelectionChange}
      />

      <section className="middleRow">
        {targets.slice(0, 3).map((target, targetIndex) => (
          <WantSlotColumn
            key={targetIndex}
            targetIndex={targetIndex}
            target={target}
            rankVariant={rankVariants[targetIndex] ?? 'bronze'}
            sectionBackgroundStyle={getCardSectionBackgroundStyle(
              resolveLayoutSectionBackground('asobo', wantRankSlots[targetIndex] ?? 'wantRank3'),
            )}
            targetFrameTheme={targetFrameTheme}
            effectivePreviewMode={effectivePreviewMode}
            targetSearchQuery={targetSearchQueries[targetIndex] ?? ''}
            onTargetSearchQueryChange={(query) => updateTargetSearchQuery(targetIndex, query)}
            onSelectSearchTarget={(item) => selectSearchTarget(targetIndex, item)}
            onSelectUnsupportedTarget={() => selectUnsupportedTarget(targetIndex)}
            onCommentChange={(comment) => updateSecondaryTargetComment(targetIndex, comment)}
            showFrameThemeSelect={targetIndex === 0}
            onTargetFrameThemeChange={updateTargetFrameTheme}
          />
        ))}
      </section>

      <CardBottomRow
        message={characterMessage}
        effectivePreviewMode={effectivePreviewMode}
        sectionBackgroundStyle={getCardSectionBackgroundStyle('row4')}
        updateCharacterMessage={updateCharacterMessage}
      />
    </div>
  )
}
