import { CardActivityBox } from './CardActivityBox'
import { CardBottomRow } from './CardBottomRow'
import { CharacterSummaryPanel } from './CharacterSummaryPanel'
import { MainWantPanel } from './MainWantPanel'
import { ProfileImageColumn } from './ProfileImageColumn'
import { WantSlotPanel } from './WantSlotPanel'
import type { CardBodyProps } from './CardBody'

export function CardBodyWant(props: CardBodyProps) {
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
    collectionOwnershipIndex,
  } = props

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
          showMobileHorizontalImageHint={showMobileHorizontalImageHint}
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
          collectionOwnershipIndex={collectionOwnershipIndex}
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
          collectionOwnershipIndex={collectionOwnershipIndex}
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
        leftColumnDisplayMode={leftColumnDisplayMode}
        lodestoneProfile={lodestoneProfile}
        jobSelections={jobSelections}
        onLeftColumnDisplayModeChange={onLeftColumnDisplayModeChange}
        onJobSelectionChange={onJobSelectionChange}
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
