import { type CSSProperties, type SyntheticEvent, useEffect, useRef, useState } from 'react'
import { CardConfirmModal, type CardConfirmModalPhase } from './components/CardConfirmModal'
import { getActivityPurposeItem, getActivityPurposeItems } from './data/invite/activityPurposeDictionary'
import {
  defaultActivitySectionTitles,
  type HelpSectionSubtitle,
  type WantSectionSubtitle,
} from './data/activityColumnTitles'
import { getXPostIntentUrl } from './data/postShareTemplate'
import {
  getInviteMajorCategory,
  getInviteMiddleItem,
  getInviteMiddleItems,
} from './data/invite/inviteContentDictionary'
import type { InviteMajorId } from './data/invite/inviteDictionaryTypes'
import {
  UNSUPPORTED_TARGET_CATEGORY,
  UNSUPPORTED_TARGET_ICON,
  UNSUPPORTED_TARGET_SOURCE_ID,
  UNSUPPORTED_TARGET_SUBCATEGORY,
  UNSUPPORTED_TARGET_TITLE,
} from './data/unsupportedTargetItem'
import { CardBody } from './components/card/CardBody'
import {
  getActivityCategoryFromDictionary,
  getTargetIconFromDictionary,
  resolveTargetIconUrl,
  sourceItemById,
} from './components/target/targetSearchHelpers'
import type {
  ActivityCategory,
  CardSectionName,
  ContentSelection,
  ImageSettings,
  PlayTime,
  SearchDictionaryItem,
  TargetFrameTheme,
  TimeRange,
} from './types/card'
import {
  CARD_CONTENT_DISPLAY_LIMIT,
  EDIT_CONTENT_DISPLAY_LIMIT,
  getTodoItemKey,
  getTargetFrameUrl,
  IMAGE_ROTATION_MAX,
  IMAGE_ROTATION_MIN,
  IMAGE_SCALE_MAX,
  IMAGE_SCALE_MIN,
  normalizePlayTime,
} from './utils/cardDisplayUtils'
import {
  createDefaultCardDraftForWorlds,
  createEmptyCharacter,
  getInitialAppState,
  normalizeContentList,
  normalizeTargets,
  updateTargetAtIndex,
  type CharacterState,
  type RoleKey,
} from './utils/characterState'

import './App.css'
import { HelpModal } from './components/HelpModal'
import {
  buildCharacterDraft,
  CARD_DRAFT_VERSION,
  clearCardDraft,
  normalizeSecondaryTargetComment,
  writeCardDraft,
  writeSaveEnabled,
} from './utils/cardDraftStorage'
import { captureCardPng, CARD_EXPORT_FILENAME } from './utils/captureCardPng'
import { deliverExportedPng } from './utils/deliverExportedPng'
import { exportCardPng } from './utils/exportCardPng'
import { useMobileViewport } from './utils/isMobileViewport'


const worldsByDc = {
  Elemental: ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'],
  Gaia: ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
  Mana: ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan'],
  Meteor: ['Belias', 'Mandragora', 'Ramuh', 'Shinryu', 'Unicorn', 'Valefor', 'Yojimbo', 'Zeromus'],
} as const

type DataCenter = keyof typeof worldsByDc

const dataCenters = Object.keys(worldsByDc) as DataCenter[]

const voiceChatOptions = ['未設定', 'VC OK', '聞き専', 'VCなし'] as const

type VoiceChat = typeof voiceChatOptions[number]

const cardColorThemeOptions = [
  'white',
  'blue',
  'lightblue',
  'red',
  'pink',
  'green',
  'lime',
  'yellow',
  'beige',
] as const

type CardColorTheme = typeof cardColorThemeOptions[number]

const cardBaseBackgroundOptions = [
  { value: '01', label: '01' },
  { value: '02', label: '02' },
  { value: '03', label: '03' },
  { value: '04', label: '04' },
  { value: '05', label: '05' },
] as const

type CardBaseBackground = typeof cardBaseBackgroundOptions[number]['value']

const cardSectionThemeOptions = [
  { value: 'fish', label: '魚' },
  { value: 'mount', label: 'マウント' },
  { value: 'minion', label: 'ミニオン' },
  { value: 'music', label: '音楽' },
  { value: 'housing', label: 'ハウジング' },
  { value: 'adventure', label: '冒険' },
] as const

const cardSectionStyleOptions = [
  { value: 'simple', label: 'シンプル' },
  { value: 'cute', label: 'かわいい' },
  { value: 'stylish', label: 'おしゃれ' },
] as const

type CardSectionTheme = typeof cardSectionThemeOptions[number]['value']
type CardSectionStyle = typeof cardSectionStyleOptions[number]['value']


const cardSectionNames: CardSectionName[] = [
  'row2_left',
  'row2_center',
  'row2_right',
  'row3_left',
  'row3_center',
  'row3_right',
  'row4',
]

const sectionBackgroundBaseStyle: CSSProperties = {
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
}

const row3SectionNames = new Set<CardSectionName>(['row3_left', 'row3_center', 'row3_right'])

function buildCardSectionBackgroundUrl(
  theme: CardSectionTheme,
  style: CardSectionStyle,
  section: CardSectionName,
) {
  return `/backgrounds/card_sections/${theme}/${style}/${theme}_${style}_${section}.png`
}

function useCardSectionBackgroundStyles(theme: CardSectionTheme, style: CardSectionStyle) {
  const [styles, setStyles] = useState<Partial<Record<CardSectionName, CSSProperties>>>({})
  const loadIdRef = useRef(0)

  useEffect(() => {
    loadIdRef.current += 1
    const loadId = loadIdRef.current

    let pending = cardSectionNames.length
    const nextStyles: Partial<Record<CardSectionName, CSSProperties>> = {}

    const finalize = () => {
      pending -= 1
      if (pending === 0 && loadIdRef.current === loadId) {
        setStyles({ ...nextStyles })
      }
    }

    cardSectionNames.forEach((section) => {
      const imageUrl = buildCardSectionBackgroundUrl(theme, style, section)
      const image = new Image()

      image.onload = () => {
        if (loadIdRef.current !== loadId) {
          return
        }

        if (row3SectionNames.has(section)) {
          nextStyles[section] = {
            ['--section-bg-image' as string]: `url("${imageUrl}")`,
          }
        } else {
          nextStyles[section] = {
            ...sectionBackgroundBaseStyle,
            backgroundImage: `url("${imageUrl}")`,
          }
        }
        finalize()
      }

      image.onerror = () => {
        if (loadIdRef.current !== loadId) {
          return
        }

        finalize()
      }

      image.src = imageUrl
    })
  }, [theme, style])

  return (section: CardSectionName): CSSProperties => styles[section] ?? {}
}

function getCardBaseBackgroundStyle(background: CardBaseBackground): CSSProperties {
  return {
    backgroundImage: `url("/backgrounds/card_base/${background}.png")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  }
}




const timeOptions = Array.from({ length: 25 }, (_, hour) => hour)

function getInviteMiddleOptions(majorId: InviteMajorId) {
  return getInviteMiddleItems(majorId)
}

function getInviteMajorOption(majorId: InviteMajorId) {
  return getInviteMajorCategory(majorId)
}

function getInviteMiddleOption(selection: Pick<ContentSelection, 'majorId' | 'middleId'>) {
  return getInviteMiddleItem(selection.majorId, selection.middleId)
}

function getInvitePurposeOption(selection: ContentSelection) {
  return getActivityPurposeItem(selection.majorId, selection.purposeId, selection.middleId)
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getImageMoveRange(scale: number) {
  return Math.round((scale - 1) * 90)
}

function getConfirmCaptureErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('no dimensions')) {
      return 'カードの表示準備ができていません。'
    }

    if (error.message.includes('final PNG width')) {
      return '画像生成の形式が正しくありません。ページを再読み込みしてください。'
    }
  }

  return '生成に失敗しました。もう一度お試しください。'
}

function App() {
  const [character, setCharacter] = useState<CharacterState>(() => getInitialAppState(worldsByDc).character)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isCapturePreview, setIsCapturePreview] = useState(false)
  const [confirmModalPhase, setConfirmModalPhase] = useState<CardConfirmModalPhase | 'closed'>('closed')
  const [confirmPreviewUrl, setConfirmPreviewUrl] = useState<string | null>(null)
  const [confirmPreviewBlob, setConfirmPreviewBlob] = useState<Blob | null>(null)
  const [confirmErrorMessage, setConfirmErrorMessage] = useState<string | null>(null)
  const [confirmSaveErrorMessage, setConfirmSaveErrorMessage] = useState<string | null>(null)
  const [isSavingPng, setIsSavingPng] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [isExportingCard, setIsExportingCard] = useState(false)
  const isMobileViewport = useMobileViewport()
  const isDesktopPreviewMode = isPreviewMode && !isMobileViewport
  const cardRef = useRef<HTMLElement>(null)
  const [hasTargetFrame, setHasTargetFrame] = useState(false)
  const [isSaveEnabled, setIsSaveEnabled] = useState(() => getInitialAppState(worldsByDc).isSaveEnabled)
  const [restoredFromDraft, setRestoredFromDraft] = useState(() => getInitialAppState(worldsByDc).restoredFromDraft)
  const [isImageAdjustOpen, setIsImageAdjustOpen] = useState(false)
  const profileImageInputRef = useRef<HTMLInputElement>(null)
  const [cardColorTheme, setCardColorTheme] = useState<CardColorTheme>(() => getInitialAppState(worldsByDc).cardColorTheme)
  const [cardBaseBackground, setCardBaseBackground] = useState<CardBaseBackground>(() => getInitialAppState(worldsByDc).cardBaseBackground)
  const [cardSectionTheme, setCardSectionTheme] = useState<CardSectionTheme>(() => getInitialAppState(worldsByDc).cardSectionTheme)
  const [cardSectionStyle, setCardSectionStyle] = useState<CardSectionStyle>(() => getInitialAppState(worldsByDc).cardSectionStyle)
  const getCardSectionBackgroundStyle = useCardSectionBackgroundStyles(cardSectionTheme, cardSectionStyle)
  const [targetSearchQueries, setTargetSearchQueries] = useState(() => getInitialAppState(worldsByDc).targetSearchQueries)
  const [contentSelections, setContentSelections] = useState<{
    todoList: ContentSelection
    unfinishedList: ContentSelection
  }>(() => getInitialAppState(worldsByDc).contentSelections)

  function updateCharacterName(value: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      name: value,
    }))
  }

  function updateCharacterMessage(message: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      message,
    }))
  }

  function updateCharacterImage(file: File | undefined) {
    if (!file) {
      return
    }

    const imageUrl = URL.createObjectURL(file)

    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      imageUrl,
      imageSettings: currentCharacter.imageSettings ?? {
        scale: 1,
        x: 0,
        y: 0,
        rotation: 0,
      },
    }))
    setIsImageAdjustOpen(true)
  }

  function handleProfileImageFileChange(event: SyntheticEvent<HTMLInputElement>) {
    updateCharacterImage(event.currentTarget.files?.[0])
    event.currentTarget.value = ''
  }

  function openImageAdjustPanel() {
    setIsImageAdjustOpen(true)
  }

  function updateImageSetting(field: keyof ImageSettings, value: number) {
    setCharacter((currentCharacter) => {
      const currentSettings = currentCharacter.imageSettings ?? { scale: 1, x: 0, y: 0, rotation: 0 }

      if (field === 'scale') {
        const nextScale = clampNumber(value, IMAGE_SCALE_MIN, IMAGE_SCALE_MAX)
        const nextMoveRange = getImageMoveRange(nextScale)

        return {
          ...currentCharacter,
          imageSettings: {
            ...currentSettings,
            scale: nextScale,
            x: clampNumber(currentSettings.x, -nextMoveRange, nextMoveRange),
            y: clampNumber(currentSettings.y, -nextMoveRange, nextMoveRange),
          },
        }
      }

      if (field === 'rotation') {
        return {
          ...currentCharacter,
          imageSettings: {
            ...currentSettings,
            rotation: clampNumber(value, IMAGE_ROTATION_MIN, IMAGE_ROTATION_MAX),
          },
        }
      }

      const moveRange = getImageMoveRange(currentSettings.scale)

      return {
        ...currentCharacter,
        imageSettings: {
          ...currentSettings,
          [field]: clampNumber(value, -moveRange, moveRange),
        },
      }
    })
  }

  function resetImageRotation() {
    setCharacter((currentCharacter) => {
      const currentSettings = currentCharacter.imageSettings ?? { scale: 1, x: 0, y: 0, rotation: 0 }

      return {
        ...currentCharacter,
        imageSettings: {
          ...currentSettings,
          rotation: 0,
        },
      }
    })
  }

  function updateDataCenter(dc: DataCenter) {
    setCharacter((currentCharacter) => {
      const worlds = worldsByDc[dc]
      const world = (worlds as readonly string[]).includes(currentCharacter.world)
        ? currentCharacter.world
        : worlds[0]

      return {
        ...currentCharacter,
        dc,
        world,
      }
    })
  }

  function updateWorld(world: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      world,
    }))
  }

  function updateRole(role: RoleKey, checked: boolean) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      roles: {
        ...currentCharacter.roles,
        [role]: checked,
      },
    }))
  }

  function updatePlayTime(day: keyof PlayTime, field: keyof TimeRange, value: number) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      playTime: {
        ...normalizePlayTime(currentCharacter.playTime),
        [day]: {
          ...normalizePlayTime(currentCharacter.playTime)[day],
          [field]: value,
        },
      },
    }))
  }

  function updateVoiceChat(vc: VoiceChat) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      vc,
    }))
  }

  function updateTargetSearchQuery(targetIndex: number, query: string) {
    setTargetSearchQueries((currentQueries) => currentQueries.map((currentQuery, index) => (
      index === targetIndex ? query : currentQuery
    )))
  }

  function selectSearchTarget(targetIndex: number, item: SearchDictionaryItem) {
    const sourceItem = item.sourceDictionaryId ? sourceItemById.get(item.sourceDictionaryId) : undefined
    const category = getActivityCategoryFromDictionary(sourceItem?.category ?? item.category)
    const subcategory = sourceItem?.subCategory ?? item.subCategory ?? ''
    const iconUrl = resolveTargetIconUrl(item, sourceItem)

    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      targets: updateTargetAtIndex(currentCharacter.targets, targetIndex, (target) => ({
        ...target,
        title: item.name,
        category,
        subcategory,
        icon: iconUrl ? '' : getTargetIconFromDictionary(item, sourceItem),
        iconUrl: iconUrl ?? null,
        sourceDictionaryId: item.sourceDictionaryId,
        contentName: sourceItem?.contentName ?? null,
        acquisitionRoutes: sourceItem?.acquisitionRoutes ?? [],
      })),
    }))
    updateTargetSearchQuery(targetIndex, item.name)
  }

  function selectUnsupportedTarget(targetIndex: number) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      targets: updateTargetAtIndex(currentCharacter.targets, targetIndex, (target) => ({
        ...target,
        title: UNSUPPORTED_TARGET_TITLE,
        category: UNSUPPORTED_TARGET_CATEGORY,
        subcategory: UNSUPPORTED_TARGET_SUBCATEGORY,
        icon: UNSUPPORTED_TARGET_ICON,
        iconUrl: null,
        sourceDictionaryId: UNSUPPORTED_TARGET_SOURCE_ID,
        contentName: null,
        acquisitionRoutes: [],
      })),
    }))
    updateTargetSearchQuery(targetIndex, '')
  }

  function updateTopTargetComment(comment: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      targets: updateTargetAtIndex(currentCharacter.targets, 0, (target) => ({
        ...target,
        comment,
      })),
    }))
  }

  function updateSecondaryTargetComment(targetIndex: number, comment: string) {
    const sanitizedComment = normalizeSecondaryTargetComment(comment)

    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      targets: updateTargetAtIndex(currentCharacter.targets, targetIndex, (target) => ({
        ...target,
        comment: sanitizedComment,
      })),
    }))
  }

  function updateTargetFrameTheme(targetFrameTheme: TargetFrameTheme) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      targetFrameTheme,
    }))
  }

  function updateInterestLevel(interestName: ActivityCategory, level: number) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      interests: currentCharacter.interests.map((interest) => (
        interest.name === interestName ? { ...interest, level } : interest
      )),
    }))
  }

  function updateActivitySubtitle(
    columnKey: 'want' | 'help',
    value: WantSectionSubtitle | HelpSectionSubtitle,
  ) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      sectionTitles: {
        ...currentCharacter.sectionTitles,
        [columnKey]: value,
      },
    }))
  }

  function updateContentSelection(
    listKey: 'todoList' | 'unfinishedList',
    field: keyof ContentSelection,
    value: string,
  ) {
    setContentSelections((currentSelections) => {
      const currentSelection = currentSelections[listKey]

      if (field === 'majorId') {
        const majorId = value as InviteMajorId
        const middleOption = getInviteMiddleOptions(majorId)[0]
        const purposeOption = getActivityPurposeItems(majorId, middleOption.id)[0]

        return {
          ...currentSelections,
          [listKey]: {
            majorId,
            middleId: middleOption.id,
            purposeId: purposeOption.id,
          },
        }
      }

      if (field === 'middleId') {
        const middleId = value
        const purposeOption = getActivityPurposeItems(currentSelection.majorId, middleId)[0]

        return {
          ...currentSelections,
          [listKey]: {
            ...currentSelection,
            middleId,
            purposeId: purposeOption.id,
          },
        }
      }

      return {
        ...currentSelections,
        [listKey]: { ...currentSelection, purposeId: value },
      }
    })
  }

  function addContentItem(listKey: 'todoList' | 'unfinishedList') {
    const selection = contentSelections[listKey]
    const majorOption = getInviteMajorOption(selection.majorId)
    const middleOption = getInviteMiddleOption(selection)
    const purposeOption = getInvitePurposeOption(selection)

    setCharacter((currentCharacter) => {
      const currentList = normalizeContentList(currentCharacter[listKey])

      if (currentList.some((item) => item.middle === middleOption.label && item.title === purposeOption.label)) {
        return currentCharacter
      }

      return {
        ...currentCharacter,
        [listKey]: [
          ...currentList,
          {
            title: purposeOption.label,
            major: majorOption.label,
            middle: middleOption.label,
          },
        ],
      }
    })
  }

  function removeContentItem(listKey: 'todoList' | 'unfinishedList', itemKey: string) {
    setCharacter((currentCharacter) => ({
      ...currentCharacter,
      [listKey]: normalizeContentList(currentCharacter[listKey]).filter((item) => getTodoItemKey(item) !== itemKey),
    }))
  }

  function handleSaveEnabledChange(enabled: boolean) {
    setIsSaveEnabled(enabled)
    writeSaveEnabled(enabled)
  }

  function handleClearSavedData() {
    if (!window.confirm('保存した入力内容を削除して初期状態に戻しますか？')) {
      return
    }

    const defaultDraft = createDefaultCardDraftForWorlds(worldsByDc)

    clearCardDraft()
    writeSaveEnabled(false)
    setIsSaveEnabled(false)
    setRestoredFromDraft(false)
    setCharacter(createEmptyCharacter(worldsByDc))
    setCardColorTheme(defaultDraft.cardColorTheme)
    setCardBaseBackground(defaultDraft.cardBaseBackground)
    setCardSectionTheme(defaultDraft.cardSectionTheme)
    setCardSectionStyle(defaultDraft.cardSectionStyle)
    setTargetSearchQueries([...defaultDraft.targetSearchQueries])
    setContentSelections({ ...defaultDraft.contentSelections })
  }

  useEffect(() => {
    if (!isSaveEnabled) {
      return
    }

    writeCardDraft({
      version: CARD_DRAFT_VERSION,
      character: buildCharacterDraft(character),
      cardColorTheme,
      cardBaseBackground,
      cardSectionTheme,
      cardSectionStyle,
      targetSearchQueries: [
        targetSearchQueries[0] ?? '',
        targetSearchQueries[1] ?? '',
        targetSearchQueries[2] ?? '',
      ],
      contentSelections,
    })
  }, [
    isSaveEnabled,
    character,
    cardColorTheme,
    cardBaseBackground,
    cardSectionTheme,
    cardSectionStyle,
    targetSearchQueries,
    contentSelections,
  ])

  useEffect(() => {
    return () => {
      if (confirmPreviewUrl) {
        URL.revokeObjectURL(confirmPreviewUrl)
      }
    }
  }, [confirmPreviewUrl])

  function handlePostOnX() {
    window.open(getXPostIntentUrl(), '_blank', 'noopener,noreferrer')
  }

  function revokeConfirmPreviewUrl(url: string | null = confirmPreviewUrl) {
    if (url) {
      URL.revokeObjectURL(url)
    }
  }

  function resetConfirmModalState() {
    revokeConfirmPreviewUrl()
    setConfirmPreviewUrl(null)
    setConfirmPreviewBlob(null)
    setConfirmErrorMessage(null)
    setConfirmSaveErrorMessage(null)
    setConfirmModalPhase('closed')
    setIsSavingPng(false)
  }

  function handleCloseConfirmModal() {
    if (confirmModalPhase === 'generating') {
      return
    }

    resetConfirmModalState()
  }

  async function handleMobileConfirm() {
    if (!isMobileViewport || !cardRef.current || confirmModalPhase === 'generating') {
      return
    }

    setConfirmModalPhase('generating')
    setConfirmErrorMessage(null)
    setConfirmSaveErrorMessage(null)
    revokeConfirmPreviewUrl()
    setConfirmPreviewUrl(null)
    setConfirmPreviewBlob(null)

    setIsCapturePreview(true)
    document.body.classList.add('card-png-export')

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })

      const cardElement = cardRef.current
      cardElement.scrollIntoView({ block: 'start', inline: 'nearest' })
      void cardElement.offsetHeight

      const captureResult = await captureCardPng(cardElement)
      const previewUrl = URL.createObjectURL(captureResult.blob)

      setConfirmPreviewBlob(captureResult.blob)
      setConfirmPreviewUrl(previewUrl)
      setConfirmModalPhase('ready')
    } catch (error) {
      console.error('Failed to capture card PNG for confirm modal', error)
      setConfirmErrorMessage(getConfirmCaptureErrorMessage(error))
      setConfirmModalPhase('error')
    } finally {
      setIsCapturePreview(false)
      document.body.classList.remove('card-png-export')
    }
  }

  async function handleConfirmModalSave() {
    if (!confirmPreviewBlob || isSavingPng) {
      return
    }

    setIsSavingPng(true)
    setConfirmSaveErrorMessage(null)

    try {
      await deliverExportedPng(confirmPreviewBlob, CARD_EXPORT_FILENAME)
    } catch (error) {
      console.error('Failed to save PNG from confirm modal', error)
      setConfirmSaveErrorMessage('保存に失敗しました。')
    } finally {
      setIsSavingPng(false)
    }
  }

  async function handleExportCardPng() {
    if (!isDesktopPreviewMode || !cardRef.current || isExportingCard) {
      return
    }

    const cardElement = cardRef.current

    setIsExportingCard(true)
    document.body.classList.add('card-png-export')

    try {
      cardElement.scrollIntoView({ block: 'start', inline: 'nearest' })
      void cardElement.offsetHeight
      await exportCardPng(cardElement)
    } catch (error) {
      console.error('Failed to export card PNG', error)
      window.alert('PNGの出力に失敗しました。')
    } finally {
      document.body.classList.remove('card-png-export')
      setIsExportingCard(false)
    }
  }

  const targets = normalizeTargets(character.targets)
  const interests = character.interests ?? []
  const todoList = normalizeContentList(character.todoList ?? [])
  const unfinishedList = normalizeContentList(character.unfinishedList ?? [])
  const effectivePreviewMode = isDesktopPreviewMode || isCapturePreview
  const contentDisplayLimit = effectivePreviewMode ? CARD_CONTENT_DISPLAY_LIMIT : EDIT_CONTENT_DISPLAY_LIMIT
  const imageUrl = character.imageUrl ?? ''
  const imageSettings = character.imageSettings ?? { scale: 1, x: 0, y: 0, rotation: 0 }
  const imageMoveRange = getImageMoveRange(imageSettings.scale)
  const targetFrameTheme = character.targetFrameTheme ?? 'simple'
  const playTime = normalizePlayTime(character.playTime)
  const sectionTitles = character.sectionTitles ?? {
    target: '狙ってるもの',
    ...defaultActivitySectionTitles,
  }

  const topTarget = targets[0]
  const targetFrameUrl = getTargetFrameUrl(topTarget, targetFrameTheme)
  const isDesktopImageAdjustUi = !isMobileViewport && !effectivePreviewMode
  const showImageAdjustPanel = Boolean(imageUrl && !effectivePreviewMode && (isMobileViewport || isImageAdjustOpen))
  const showImageAdjustReopen = isDesktopImageAdjustUi && Boolean(imageUrl && !isImageAdjustOpen)
  const showMobileConfirmButton = isMobileViewport && !effectivePreviewMode

  function renderMobileConfirmButton() {
    if (!showMobileConfirmButton) {
      return null
    }

    return (
      <button
        className="cardConfirmButton"
        type="button"
        onClick={() => void handleMobileConfirm()}
        disabled={confirmModalPhase === 'generating'}
      >
        {confirmModalPhase === 'generating' ? '生成中…' : '確認'}
      </button>
    )
  }

  return (
    <main className={`app ${effectivePreviewMode ? 'previewMode' : 'editMode'} cardColor-${cardColorTheme}`}>
      <div className="modeSwitcher" aria-label="表示モード切替">
        <button
          className={!isDesktopPreviewMode ? 'active' : ''}
          type="button"
          aria-pressed={!isDesktopPreviewMode}
          onClick={() => setIsPreviewMode(false)}
        >
          編集モード
        </button>
        {!isMobileViewport && (
          <button
            className={isDesktopPreviewMode ? 'active' : ''}
            type="button"
            aria-pressed={isDesktopPreviewMode}
            onClick={() => setIsPreviewMode(true)}
          >
            プレビューモード
          </button>
        )}
        {isDesktopPreviewMode && (
          <>
            <button
              className="cardExportButton"
              type="button"
              onClick={() => void handleExportCardPng()}
              disabled={isExportingCard}
            >
              {isExportingCard ? '出力中…' : 'PNG保存'}
            </button>
            <button
              className="cardXPostButton"
              type="button"
              onClick={handlePostOnX}
            >
              Xで投稿
            </button>
          </>
        )}
        {!isDesktopPreviewMode && (
          <>
            {renderMobileConfirmButton()}
            <label className="cardThemePicker">
              カード背景
              <select
                value={cardBaseBackground}
                onChange={(event) => setCardBaseBackground(event.target.value as CardBaseBackground)}
              >
                {cardBaseBackgroundOptions.map((background) => (
                  <option key={background.value} value={background.value}>{background.label}</option>
                ))}
              </select>
            </label>
            <label className="cardThemePicker">
              カードカラー
              <select
                value={cardColorTheme}
                onChange={(event) => setCardColorTheme(event.target.value as CardColorTheme)}
              >
                {cardColorThemeOptions.map((theme) => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </label>
            <label className="cardThemePicker">
              項目背景テーマ
              <select
                value={cardSectionTheme}
                onChange={(event) => setCardSectionTheme(event.target.value as CardSectionTheme)}
              >
                {cardSectionThemeOptions.map((theme) => (
                  <option key={theme.value} value={theme.value}>{theme.label}</option>
                ))}
              </select>
            </label>
            <label className="cardThemePicker">
              項目背景スタイル
              <select
                value={cardSectionStyle}
                onChange={(event) => setCardSectionStyle(event.target.value as CardSectionStyle)}
              >
                {cardSectionStyleOptions.map((style) => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {isDesktopPreviewMode && (
        <p className="cardXPostNotice">
          画像を保存してから「Xで投稿」を押してください。
          <br />
          投稿画面で保存した画像を添付できます。
        </p>
      )}

      {!isDesktopPreviewMode && (
        <section className="draftSavePanel" aria-label="ブラウザ保存">
          <div className="draftSaveToggle">
            <span>入力内容をこのブラウザに保存</span>
            <button
              className={isSaveEnabled ? 'active' : ''}
              type="button"
              role="switch"
              aria-checked={isSaveEnabled}
              onClick={() => handleSaveEnabledChange(!isSaveEnabled)}
            >
              {isSaveEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <button
            className="draftSaveClear"
            type="button"
            onClick={handleClearSavedData}
          >
            保存データを削除
          </button>
        </section>
      )}

      <section
        ref={cardRef}
        className="card"
        style={getCardBaseBackgroundStyle(cardBaseBackground)}
      >
        {!effectivePreviewMode && (
          <header className="cardHeader">
            <div className="cardHeaderTitleRow">
              <h1>いっしょに あ・そ・ぼ！</h1>
              <button
                className="cardHeaderHelpButton"
                type="button"
                onClick={() => setIsHelpModalOpen(true)}
              >
                つかいかた
              </button>
            </div>
            <div className="cardHeaderIntro">
              <p>
                FF14向けのキャラクターカード・プロフィールカードメーカーです。「今やりたいこと」「ほしいもの」「一緒に遊べること」を入力して、フレンド募集などにそのまま使えるカードを作れます。
              </p>
              <ul>
                <li>画像はブラウザ内で処理されます</li>
                <li>アップロード画像はサーバーへ送信されません</li>
                <li>FF14非公式ファンツールです</li>
              </ul>
            </div>
          </header>
        )}

        <CardBody
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
          onProfileImageFileChange={handleProfileImageFileChange}
          openImageAdjustPanel={openImageAdjustPanel}
          updateImageSetting={updateImageSetting}
          resetImageRotation={resetImageRotation}
          setIsImageAdjustOpen={setIsImageAdjustOpen}
          topTarget={topTarget}
          hasTargetFrame={hasTargetFrame}
          targetFrameUrl={targetFrameUrl}
          targetFrameTheme={targetFrameTheme}
          targetSearchQueries={targetSearchQueries}
          onTargetFrameLoad={() => setHasTargetFrame(true)}
          onTargetFrameError={(event) => {
            setHasTargetFrame(false)
            event.currentTarget.style.display = 'none'
          }}
          updateTopTargetComment={updateTopTargetComment}
          updateTargetSearchQuery={updateTargetSearchQuery}
          selectSearchTarget={selectSearchTarget}
          selectUnsupportedTarget={selectUnsupportedTarget}
          updateTargetFrameTheme={updateTargetFrameTheme}
          characterName={character.name}
          characterDc={character.dc}
          characterWorld={character.world}
          characterRoles={character.roles}
          playTime={playTime}
          characterVc={character.vc}
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
          targets={targets}
          getCardSectionBackgroundStyle={getCardSectionBackgroundStyle}
          updateSecondaryTargetComment={updateSecondaryTargetComment}
          interests={interests}
          todoList={todoList}
          unfinishedList={unfinishedList}
          sectionTitles={sectionTitles}
          contentSelections={contentSelections}
          contentDisplayLimit={contentDisplayLimit}
          updateInterestLevel={updateInterestLevel}
          updateActivitySubtitle={updateActivitySubtitle}
          updateContentSelection={updateContentSelection}
          addContentItem={addContentItem}
          removeContentItem={removeContentItem}
          characterMessage={character.message}
          updateCharacterMessage={updateCharacterMessage}
        />
      </section>

      {showMobileConfirmButton && (
        <div className="mobileConfirmBar">
          {renderMobileConfirmButton()}
        </div>
      )}

      {confirmModalPhase !== 'closed' && (
        <CardConfirmModal
          phase={confirmModalPhase}
          previewUrl={confirmPreviewUrl}
          errorMessage={confirmErrorMessage}
          isSaving={isSavingPng}
          saveErrorMessage={confirmSaveErrorMessage}
          onClose={handleCloseConfirmModal}
          onRetry={() => void handleMobileConfirm()}
          onSave={() => void handleConfirmModalSave()}
          onPostX={handlePostOnX}
        />
      )}

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <footer className="appFooter">
        <a href="#/terms">利用規約</a>
        <span className="appFooterSeparator" aria-hidden="true">|</span>
        <a href="#/privacy">プライバシーポリシー</a>
        <span className="appFooterSeparator" aria-hidden="true">|</span>
        <a
          href="https://x.com/Rogan_Stone0412"
          rel="noopener noreferrer"
          target="_blank"
        >
          不具合報告・ご意見
        </a>
      </footer>
    </main>
  )
}

export default App