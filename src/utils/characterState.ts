import { getActivityPurposeItems } from '../data/invite/activityPurposeDictionary'
import { inviteMajorCategories } from '../data/invite/inviteContentDictionary'
import { defaultActivitySectionTitles } from '../data/activityColumnTitles'
import type {
  AcquisitionRoute,
  ActivityCategory,
  ContentSelection,
  ImageFrameTheme,
  ImageSettings,
  InterestItem,
  PlayTime,
  SectionTitles,
  TargetFrameTheme,
  TargetItem,
  TodoItem,
  VoiceChat,
} from '../types/card'
import type { LodestoneCardState } from '../types/lodestone'
import { createDefaultLodestoneCardState } from '../types/lodestone'
import { consumePendingMainWantTarget } from '../lib/wanted/pendingMainWantPatch'
import {
  buildCharacterDraft,
  CARD_DRAFT_VERSION,
  readCardDraft,
  readSaveEnabled,
  sanitizeLodestoneCardState,
  type CardDraft,
  type CharacterDraft,
} from './cardDraftStorage'
import { interestIconUrls } from './cardDisplayUtils'

type DataCenter = 'Elemental' | 'Gaia' | 'Mana' | 'Meteor'

export type CharacterState = {
  name: string
  dc: DataCenter
  world: string
  imageUrl: string
  imageSettings: ImageSettings
  imageFrameTheme: ImageFrameTheme
  targetFrameTheme: TargetFrameTheme
  roles: {
    tank: boolean
    healer: boolean
    dps: boolean
  }
  playTime: PlayTime
  vc: VoiceChat
  interests: InterestItem[]
  targets: TargetItem[]
  todoList: TodoItem[]
  unfinishedList: TodoItem[]
  sectionTitles: SectionTitles
  tags: string[]
  message: string
  lodestone: LodestoneCardState
}

export type RoleKey = keyof CharacterState['roles']

const defaultInterestNames: ActivityCategory[] = [
  '戦闘',
  '収集',
  '釣り',
  '地図',
  'クラフター',
  'ギャザラー',
  'SS',
  'ハウジング',
  'ミラプリ',
  '演奏',
  'PvP',
  '交流',
  'RP',
  '金策',
  'モブハント',
]

function createDefaultInterests(): InterestItem[] {
  return defaultInterestNames.map((name) => ({
    iconUrl: interestIconUrls[name],
    name,
    level: 1,
  }))
}

function createEmptyTarget(): TargetItem {
  return {
    title: '',
    category: 'その他',
    subcategory: '',
    icon: '🎯',
    comment: '',
  }
}

export function normalizeTargets(targets: TargetItem[] | undefined): TargetItem[] {
  const normalized = [...(targets ?? [])]

  while (normalized.length < 3) {
    normalized.push(createEmptyTarget())
  }

  return normalized.slice(0, 3)
}

export function updateTargetAtIndex(
  targets: TargetItem[] | undefined,
  targetIndex: number,
  updater: (target: TargetItem) => TargetItem,
): TargetItem[] {
  const normalized = normalizeTargets(targets)
  normalized[targetIndex] = updater(normalized[targetIndex] ?? createEmptyTarget())
  return normalized
}

export function normalizeContentList(items: Array<TodoItem | string>): TodoItem[] {
  return items.map((item) => (
    typeof item === 'string' ? { title: item } : item
  ))
}

export function getInitialContentSelection(): ContentSelection {
  const firstMajor = inviteMajorCategories[0]
  const firstMiddle = firstMajor.middleItems[0]
  const firstPurpose = getActivityPurposeItems(firstMajor.id, firstMiddle.id)[0]

  return {
    majorId: firstMajor.id,
    middleId: firstMiddle.id,
    purposeId: firstPurpose.id,
  }
}

export function createEmptyCharacter(worldsByDc: Record<DataCenter, readonly string[]>): CharacterState {
  const defaultDc: DataCenter = 'Elemental'

  return {
    name: '',
    dc: defaultDc,
    world: worldsByDc[defaultDc][0],
    imageUrl: '',
    imageSettings: {
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
    },
    imageFrameTheme: 'simple',
    targetFrameTheme: 'simple',
    roles: {
      tank: false,
      healer: false,
      dps: false,
    },
    playTime: {
      weekday: { start: 21, end: 24 },
      holiday: { start: 12, end: 3 },
    },
    vc: '未設定',
    interests: createDefaultInterests(),
    targets: normalizeTargets([]),
    todoList: [],
    unfinishedList: [],
    sectionTitles: {
      target: '狙ってるもの',
      ...defaultActivitySectionTitles,
    },
    tags: [],
    message: '',
    lodestone: createDefaultLodestoneCardState(),
  }
}

function createDefaultCardDraft(worldsByDc: Record<DataCenter, readonly string[]>): CardDraft {
  const initialCharacter = createEmptyCharacter(worldsByDc)

  return {
    version: CARD_DRAFT_VERSION,
    layoutMode: 'want',
    character: buildCharacterDraft(initialCharacter),
    cardColorTheme: 'beige',
    cardBaseBackground: '01',
    cardSectionTheme: 'fish',
    cardSectionStyle: 'simple',
    targetSearchQueries: ['', '', ''],
    contentSelections: {
      todoList: getInitialContentSelection(),
      unfinishedList: getInitialContentSelection(),
    },
  }
}

function restoreCharacterFromDraft(
  characterDraft: CharacterDraft,
  worldsByDc: Record<DataCenter, readonly string[]>,
): CharacterState {
  const emptyCharacter = createEmptyCharacter(worldsByDc)

  return {
    ...emptyCharacter,
    ...characterDraft,
    imageUrl: '',
    interests: (characterDraft.interests.length > 0 ? characterDraft.interests : emptyCharacter.interests).map((interest) => ({
      ...interest,
      iconUrl: interestIconUrls[interest.name],
    })),
    targets: normalizeTargets(characterDraft.targets.map((target) => ({
      ...target,
      acquisitionRoutes: (target.acquisitionRoutes ?? []) as AcquisitionRoute[],
    }))),
    lodestone: sanitizeLodestoneCardState(characterDraft.lodestone, emptyCharacter.lodestone),
  }
}

function loadPersistedAppState(worldsByDc: Record<DataCenter, readonly string[]>) {
  const defaultDraft = createDefaultCardDraft(worldsByDc)
  const isSaveEnabled = readSaveEnabled()

  if (!isSaveEnabled) {
    return {
      isSaveEnabled: false,
      restoredFromDraft: false,
      character: createEmptyCharacter(worldsByDc),
      cardColorTheme: defaultDraft.cardColorTheme,
      cardBaseBackground: defaultDraft.cardBaseBackground,
      cardSectionTheme: defaultDraft.cardSectionTheme,
      cardSectionStyle: defaultDraft.cardSectionStyle,
      layoutMode: defaultDraft.layoutMode,
      targetSearchQueries: [...defaultDraft.targetSearchQueries],
      contentSelections: { ...defaultDraft.contentSelections },
    }
  }

  const draft = readCardDraft(defaultDraft)

  if (!draft) {
    return {
      isSaveEnabled: true,
      restoredFromDraft: false,
      character: createEmptyCharacter(worldsByDc),
      cardColorTheme: defaultDraft.cardColorTheme,
      cardBaseBackground: defaultDraft.cardBaseBackground,
      cardSectionTheme: defaultDraft.cardSectionTheme,
      cardSectionStyle: defaultDraft.cardSectionStyle,
      layoutMode: defaultDraft.layoutMode,
      targetSearchQueries: [...defaultDraft.targetSearchQueries],
      contentSelections: { ...defaultDraft.contentSelections },
    }
  }

  return {
    isSaveEnabled: true,
    restoredFromDraft: true,
    character: restoreCharacterFromDraft(draft.character, worldsByDc),
    cardColorTheme: draft.cardColorTheme,
    cardBaseBackground: draft.cardBaseBackground,
    cardSectionTheme: draft.cardSectionTheme,
    cardSectionStyle: draft.cardSectionStyle,
    layoutMode: draft.layoutMode,
    targetSearchQueries: [...draft.targetSearchQueries],
    contentSelections: { ...draft.contentSelections },
  }
}

let initialAppStateCache: ReturnType<typeof loadPersistedAppState> | null = null

export function getInitialAppState(worldsByDc: Record<DataCenter, readonly string[]>) {
  if (!initialAppStateCache) {
    initialAppStateCache = loadPersistedAppState(worldsByDc)

    const pendingMainWant = consumePendingMainWantTarget()

    if (pendingMainWant) {
      initialAppStateCache = {
        ...initialAppStateCache,
        character: {
          ...initialAppStateCache.character,
          targets: updateTargetAtIndex(initialAppStateCache.character.targets, 0, () => pendingMainWant),
        },
        targetSearchQueries: [
          pendingMainWant.title,
          initialAppStateCache.targetSearchQueries[1] ?? '',
          initialAppStateCache.targetSearchQueries[2] ?? '',
        ],
      }
    }
  }

  return initialAppStateCache
}

export function resetInitialAppStateCache() {
  initialAppStateCache = null
}

export function createDefaultCardDraftForWorlds(worldsByDc: Record<DataCenter, readonly string[]>) {
  return createDefaultCardDraft(worldsByDc)
}
