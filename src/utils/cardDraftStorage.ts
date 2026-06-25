import {
  defaultActivitySectionTitles,
  normalizeHelpSectionTitle,
  normalizeWantSectionTitle,
  type HelpSectionSubtitle,
  type WantSectionSubtitle,
} from '../data/activityColumnTitles'
import { inviteMajorIds, migrateLegacyInviteContentSelection } from '../data/invite/inviteContentDictionary'
import type { InviteContentSelection, InviteMajorId } from '../data/invite/inviteDictionaryTypes'
import type { LayoutMode, TargetItem } from '../types/card'
import {
  createDefaultLodestoneCardState,
  type JobUserSelection,
  type LeftColumnDisplayMode,
  type LodestoneCardState,
  type LodestoneCharacterJob,
  type LodestoneCharacterProfile,
} from '../types/lodestone'
import { IMAGE_ROTATION_MAX, IMAGE_ROTATION_MIN } from './cardDisplayUtils'

export const CARD_DRAFT_STORAGE_KEY = 'issho-asobo-card-draft'
export const CARD_SAVE_ENABLED_KEY = 'issho-asobo-card-save-enabled'
export const CARD_DRAFT_VERSION = 1

const IMAGE_SCALE_MIN = 1
const IMAGE_SCALE_MAX = 4.5

const dataCenters = ['Elemental', 'Gaia', 'Mana', 'Meteor'] as const
type DataCenter = typeof dataCenters[number]

const worldsByDc: Record<DataCenter, readonly string[]> = {
  Elemental: ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'],
  Gaia: ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
  Mana: ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan'],
  Meteor: ['Belias', 'Mandragora', 'Ramuh', 'Shinryu', 'Unicorn', 'Valefor', 'Yojimbo', 'Zeromus'],
}

const voiceChatOptions = ['未設定', 'VC OK', '聞き専', 'VCなし'] as const
const cardColorThemeOptions = ['white', 'blue', 'lightblue', 'red', 'pink', 'green', 'lime', 'yellow', 'beige'] as const
const cardBaseBackgroundOptions = ['01', '02', '03', '04', '05'] as const
const cardSectionThemeOptions = ['fish', 'mount', 'minion', 'music', 'housing', 'adventure'] as const
const cardSectionStyleOptions = ['simple', 'cute', 'stylish'] as const
const layoutModeOptions = ['want', 'character', 'asobo'] as const
const imageFrameThemes = ['simple', 'cute', 'stylish', 'cool', 'mechanical'] as const
const targetFrameThemes = ['simple', 'cute', 'stylish'] as const
const sectionTitleOptions = {
  target: ['狙ってるもの', 'ほしいもの', 'ほしい！', 'ターゲット'],
} as const

const activityCategories = [
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
  'その他',
] as const

type ActivityCategory = typeof activityCategories[number]

type ImageSettings = {
  scale: number
  x: number
  y: number
  rotation: number
}

type TimeRange = {
  start: number
  end: number
}

type PlayTime = {
  weekday: TimeRange
  holiday: TimeRange
}

type TodoItem = {
  title: string
  category?: string
  major?: string
  middle?: string
  comment?: string
}

type TargetItemDraft = {
  title: string
  category: ActivityCategory
  subcategory: string
  icon: string
  comment?: string
  iconUrl?: string | null
  sourceDictionaryId?: string
  contentName?: string | null
  acquisitionRoutes?: Array<Record<string, unknown>>
}

export type CharacterDraft = {
  name: string
  dc: DataCenter
  world: string
  imageSettings: ImageSettings
  imageFrameTheme: typeof imageFrameThemes[number]
  targetFrameTheme: typeof targetFrameThemes[number]
  roles: {
    tank: boolean
    healer: boolean
    dps: boolean
  }
  playTime: PlayTime
  vc: typeof voiceChatOptions[number]
  interests: Array<{ name: ActivityCategory; level: number }>
  targets: TargetItemDraft[]
  todoList: TodoItem[]
  unfinishedList: TodoItem[]
  sectionTitles: {
    target: typeof sectionTitleOptions.target[number]
    want: WantSectionSubtitle
    help: HelpSectionSubtitle
  }
  tags: string[]
  message: string
  lodestone?: LodestoneCardDraft
}

type LodestoneCardDraft = {
  characterId?: string
  input?: string
  leftColumnDisplayMode?: LeftColumnDisplayMode
  profile?: LodestoneCharacterProfile | null
  jobSelections?: Record<string, JobUserSelection>
}

export type CardDraft = {
  version: typeof CARD_DRAFT_VERSION
  layoutMode: LayoutMode
  character: CharacterDraft
  cardColorTheme: typeof cardColorThemeOptions[number]
  cardBaseBackground: typeof cardBaseBackgroundOptions[number]
  cardSectionTheme: typeof cardSectionThemeOptions[number]
  cardSectionStyle: typeof cardSectionStyleOptions[number]
  targetSearchQueries: [string, string, string]
  contentSelections: {
    todoList: InviteContentSelection
    unfinishedList: InviteContentSelection
  }
}

export function isUnsafeImageReference(value: unknown): boolean {
  if (typeof value !== 'string') {
    return true
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return true
  }

  return trimmed.startsWith('blob:') || trimmed.startsWith('data:')
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export const SECONDARY_TARGET_COMMENT_MAX_LENGTH = 30

export function normalizeSecondaryTargetComment(comment: string): string {
  return readString(comment).replace(/\r?\n/g, ' ').trim().slice(0, SECONDARY_TARGET_COMMENT_MAX_LENGTH)
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readEnumValue<T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback: T[number],
): T[number] {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? value as T[number]
    : fallback
}

function sanitizeTimeRange(value: unknown, fallback: TimeRange): TimeRange {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    start: clampNumber(Math.round(readNumber(value.start, fallback.start)), 0, 24),
    end: clampNumber(Math.round(readNumber(value.end, fallback.end)), 0, 24),
  }
}

function sanitizePlayTime(value: unknown, fallback: PlayTime): PlayTime {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    weekday: sanitizeTimeRange(value.weekday, fallback.weekday),
    holiday: sanitizeTimeRange(value.holiday, fallback.holiday),
  }
}

function sanitizeImageSettings(value: unknown, fallback: ImageSettings): ImageSettings {
  if (!isRecord(value)) {
    return fallback
  }

  const scale = clampNumber(readNumber(value.scale, fallback.scale), IMAGE_SCALE_MIN, IMAGE_SCALE_MAX)
  const moveRange = Math.round((scale - 1) * 90)

  const rawRotation = readNumber(value.rotation, fallback.rotation)

  return {
    scale,
    x: clampNumber(readNumber(value.x, fallback.x), -moveRange, moveRange),
    y: clampNumber(readNumber(value.y, fallback.y), -moveRange, moveRange),
    rotation: clampNumber(
      rawRotation < 0 ? 0 : rawRotation,
      IMAGE_ROTATION_MIN,
      IMAGE_ROTATION_MAX,
    ),
  }
}

function sanitizeInterestItem(value: unknown): { name: ActivityCategory; level: number } | null {
  if (!isRecord(value)) {
    return null
  }

  const name = readEnumValue(value.name, activityCategories, 'その他')
  const level = clampNumber(Math.round(readNumber(value.level, 1)), 1, 5)

  return { name, level }
}

function sanitizeTodoItem(value: unknown): TodoItem | null {
  if (!isRecord(value)) {
    return null
  }

  const title = readString(value.title).trim()

  if (!title) {
    return null
  }

  const item: TodoItem = { title }

  const category = readString(value.category).trim()
  const major = readString(value.major).trim()
  const middle = readString(value.middle).trim()
  const comment = readString(value.comment).trim()

  if (category) {
    item.category = category
  }

  if (major) {
    item.major = major
  }

  if (middle) {
    item.middle = middle
  }

  if (comment) {
    item.comment = comment
  }

  return item
}

function sanitizeTargetItem(value: unknown): TargetItemDraft | null {
  if (!isRecord(value)) {
    return null
  }

  const title = readString(value.title).trim()

  if (!title) {
    return null
  }

  const iconUrl = isUnsafeImageReference(value.iconUrl) ? null : readString(value.iconUrl)
  const sourceDictionaryId = readString(value.sourceDictionaryId).trim()
  const contentName = readString(value.contentName).trim()
  const comment = readString(value.comment).trim()
  const acquisitionRoutes = Array.isArray(value.acquisitionRoutes)
    ? value.acquisitionRoutes.filter(isRecord)
    : undefined

  const item: TargetItemDraft = {
    title,
    category: readEnumValue(value.category, activityCategories, 'その他'),
    subcategory: readString(value.subcategory),
    icon: readString(value.icon, '🎯'),
    iconUrl: iconUrl || null,
  }

  if (comment) {
    item.comment = comment
  }

  if (sourceDictionaryId) {
    item.sourceDictionaryId = sourceDictionaryId
  }

  if (contentName) {
    item.contentName = contentName
  }

  if (acquisitionRoutes && acquisitionRoutes.length > 0) {
    item.acquisitionRoutes = acquisitionRoutes
  }

  return item
}

function sanitizeContentSelection(value: unknown, fallback: InviteContentSelection): InviteContentSelection {
  if (!isRecord(value)) {
    return fallback
  }

  const migratedSelection = migrateLegacyInviteContentSelection({
    majorId: readString(value.majorId, fallback.majorId),
    middleId: readString(value.middleId, fallback.middleId),
    purposeId: readString(value.purposeId, fallback.purposeId),
  })

  const majorId = readEnumValue(migratedSelection.majorId, inviteMajorIds, fallback.majorId) as InviteMajorId
  const middleId = readString(migratedSelection.middleId, fallback.middleId)
  const purposeId = readString(migratedSelection.purposeId, fallback.purposeId)

  return {
    majorId,
    middleId: middleId || fallback.middleId,
    purposeId: purposeId || fallback.purposeId,
  }
}

function sanitizeSectionTitles(value: unknown, fallback: CharacterDraft['sectionTitles']): CharacterDraft['sectionTitles'] {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    target: readEnumValue(value.target, sectionTitleOptions.target, fallback.target),
    want: normalizeWantSectionTitle(value.want, fallback.want),
    help: normalizeHelpSectionTitle(value.help, fallback.help),
  }
}

function sanitizeJobUserSelection(value: unknown): JobUserSelection | null {
  return value === 'baseline' || value === 'playable' || value === 'main' ? value : null
}

function sanitizeJobSelections(value: unknown): Record<string, JobUserSelection> {
  if (!isRecord(value)) {
    return {}
  }

  const selections: Record<string, JobUserSelection> = {}

  for (const [jobId, selection] of Object.entries(value)) {
    const sanitized = sanitizeJobUserSelection(selection)

    if (jobId.trim() && sanitized) {
      selections[jobId] = sanitized
    }
  }

  return selections
}

function sanitizeLodestoneJob(value: unknown): LodestoneCharacterJob | null {
  if (!isRecord(value)) {
    return null
  }

  const jobId = readString(value.jobId).trim()
  const jobName = readString(value.jobName).trim()
  const level = clampNumber(Math.round(readNumber(value.level, 0)), 0, 100)

  if (!jobId || !jobName) {
    return null
  }

  return {
    jobId,
    jobName,
    level,
    isCapped: readBoolean(value.isCapped, level >= 100),
  }
}

function sanitizeLodestoneProfile(value: unknown): LodestoneCharacterProfile | null {
  if (!isRecord(value)) {
    return null
  }

  const characterId = readString(value.characterId).trim()
  const name = readString(value.name).trim()
  const world = readString(value.world).trim()

  if (!characterId || !name || !world) {
    return null
  }

  const jobs = Array.isArray(value.jobs)
    ? value.jobs
      .map(sanitizeLodestoneJob)
      .filter((job): job is LodestoneCharacterJob => job !== null)
    : []

  if (jobs.length === 0) {
    return null
  }

  const dataCenter = readString(value.dataCenter).trim()

  return {
    characterId,
    name,
    world,
    dataCenter: dataCenter || undefined,
    jobs,
  }
}

export function sanitizeLodestoneCardState(value: unknown, fallback: LodestoneCardState): LodestoneCardState {
  if (!isRecord(value)) {
    return fallback
  }

  const characterId = readString(value.characterId, fallback.characterId).trim()
  const input = readString(value.input, characterId || fallback.input).trim()
  const leftColumnDisplayMode = value.leftColumnDisplayMode === 'jobs' ? 'jobs' : 'interests'
  const profile = sanitizeLodestoneProfile(value.profile) ?? (value.profile === null ? null : fallback.profile)
  const jobSelections = isRecord(value.jobSelections)
    ? sanitizeJobSelections(value.jobSelections)
    : fallback.jobSelections

  return {
    characterId,
    input,
    profile,
    jobSelections,
    leftColumnDisplayMode,
  }
}

function sanitizeLodestoneCardDraft(value: unknown, fallback: LodestoneCardState): LodestoneCardDraft {
  const sanitized = sanitizeLodestoneCardState(value, fallback)

  return {
    characterId: sanitized.characterId || undefined,
    input: sanitized.input || undefined,
    leftColumnDisplayMode: sanitized.leftColumnDisplayMode,
    profile: sanitized.profile,
    jobSelections: sanitized.jobSelections,
  }
}

function sanitizeCharacterDraft(value: unknown, fallback: CharacterDraft): CharacterDraft | null {
  if (!isRecord(value)) {
    return null
  }

  const dc = readEnumValue(value.dc, dataCenters, fallback.dc)
  const worlds = worldsByDc[dc]
  const requestedWorld = readString(value.world, fallback.world)
  const world = worlds.includes(requestedWorld) ? requestedWorld : worlds[0]

  const interests = Array.isArray(value.interests)
    ? value.interests
      .map(sanitizeInterestItem)
      .filter((item): item is { name: ActivityCategory; level: number } => item !== null)
    : fallback.interests

  const targets = Array.isArray(value.targets)
    ? value.targets
      .map(sanitizeTargetItem)
      .filter((item): item is TargetItemDraft => item !== null)
      .slice(0, 3)
      .map((target, targetIndex) => {
        if (targetIndex === 0 || !target.comment) {
          return target
        }

        const comment = normalizeSecondaryTargetComment(target.comment)

        if (!comment) {
          const nextTarget = { ...target }
          delete nextTarget.comment
          return nextTarget
        }

        return { ...target, comment }
      })
    : fallback.targets

  const todoList = Array.isArray(value.todoList)
    ? value.todoList
      .map(sanitizeTodoItem)
      .filter((item): item is TodoItem => item !== null)
    : fallback.todoList

  const unfinishedList = Array.isArray(value.unfinishedList)
    ? value.unfinishedList
      .map(sanitizeTodoItem)
      .filter((item): item is TodoItem => item !== null)
    : fallback.unfinishedList

  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : fallback.tags

  const rolesValue = isRecord(value.roles) ? value.roles : null

  return {
    name: readString(value.name, fallback.name),
    dc,
    world,
    imageSettings: sanitizeImageSettings(value.imageSettings, fallback.imageSettings),
    imageFrameTheme: readEnumValue(value.imageFrameTheme, imageFrameThemes, fallback.imageFrameTheme),
    targetFrameTheme: readEnumValue(value.targetFrameTheme, targetFrameThemes, fallback.targetFrameTheme),
    roles: {
      tank: readBoolean(rolesValue?.tank, fallback.roles.tank),
      healer: readBoolean(rolesValue?.healer, fallback.roles.healer),
      dps: readBoolean(rolesValue?.dps, fallback.roles.dps),
    },
    playTime: sanitizePlayTime(value.playTime, fallback.playTime),
    vc: readEnumValue(value.vc, voiceChatOptions, fallback.vc),
    interests: interests.length > 0 ? interests : fallback.interests,
    targets,
    todoList,
    unfinishedList,
    sectionTitles: sanitizeSectionTitles(value.sectionTitles, fallback.sectionTitles),
    tags,
    message: readString(value.message, fallback.message),
    lodestone: sanitizeLodestoneCardDraft(value.lodestone, createDefaultLodestoneCardState()),
  }
}

export function parseCardDraft(raw: string, fallback: CardDraft): CardDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw)

    if (!isRecord(parsed)) {
      return null
    }

    const character = sanitizeCharacterDraft(parsed.character, fallback.character)

    if (!character) {
      return null
    }

    const contentSelectionsValue = isRecord(parsed.contentSelections) ? parsed.contentSelections : null
    const targetSearchQueries = Array.isArray(parsed.targetSearchQueries)
      ? parsed.targetSearchQueries.map((query) => readString(query))
      : [...fallback.targetSearchQueries]

    return {
      version: CARD_DRAFT_VERSION,
      layoutMode: readEnumValue(parsed.layoutMode, layoutModeOptions, fallback.layoutMode),
      character,
      cardColorTheme: readEnumValue(parsed.cardColorTheme, cardColorThemeOptions, fallback.cardColorTheme),
      cardBaseBackground: readEnumValue(parsed.cardBaseBackground, cardBaseBackgroundOptions, fallback.cardBaseBackground),
      cardSectionTheme: readEnumValue(parsed.cardSectionTheme, cardSectionThemeOptions, fallback.cardSectionTheme),
      cardSectionStyle: readEnumValue(parsed.cardSectionStyle, cardSectionStyleOptions, fallback.cardSectionStyle),
      targetSearchQueries: [
        targetSearchQueries[0] ?? '',
        targetSearchQueries[1] ?? '',
        targetSearchQueries[2] ?? '',
      ],
      contentSelections: {
        todoList: sanitizeContentSelection(contentSelectionsValue?.todoList, fallback.contentSelections.todoList),
        unfinishedList: sanitizeContentSelection(
          contentSelectionsValue?.unfinishedList,
          fallback.contentSelections.unfinishedList,
        ),
      },
    }
  } catch {
    return null
  }
}

export function readSaveEnabled(): boolean {
  try {
    return localStorage.getItem(CARD_SAVE_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeSaveEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CARD_SAVE_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {
    // Ignore storage failures in private browsing or quota errors.
  }
}

export function readCardDraft(fallback: CardDraft): CardDraft | null {
  try {
    const raw = localStorage.getItem(CARD_DRAFT_STORAGE_KEY)

    if (!raw) {
      return null
    }

    return parseCardDraft(raw, fallback)
  } catch {
    return null
  }
}

export function writeCardDraft(draft: CardDraft): void {
  try {
    localStorage.setItem(CARD_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Ignore storage failures in private browsing or quota errors.
  }
}

export function patchMainWantInCardDraft(target: TargetItem): void {
  if (!readSaveEnabled()) {
    return
  }

  try {
    const raw = localStorage.getItem(CARD_DRAFT_STORAGE_KEY)

    if (!raw) {
      return
    }

    const parsed = JSON.parse(raw) as {
      character?: { targets?: TargetItemDraft[] }
      targetSearchQueries?: string[]
    }
    const targets = Array.isArray(parsed.character?.targets) ? [...parsed.character.targets] : []

    while (targets.length < 3) {
      targets.push({ title: '', category: 'その他', subcategory: '', icon: '🎯' })
    }

    const previousComment = targets[0]?.comment
    targets[0] = {
      title: target.title,
      category: target.category,
      subcategory: target.subcategory,
      icon: target.icon,
      comment: previousComment,
      iconUrl: target.iconUrl ?? null,
      sourceDictionaryId: target.sourceDictionaryId,
      contentName: target.contentName ?? null,
      acquisitionRoutes: target.acquisitionRoutes ?? [],
    }

    parsed.character = {
      ...(parsed.character ?? {}),
      targets,
    }
    parsed.targetSearchQueries = [
      target.title,
      parsed.targetSearchQueries?.[1] ?? '',
      parsed.targetSearchQueries?.[2] ?? '',
    ]

    localStorage.setItem(CARD_DRAFT_STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore malformed drafts or storage failures.
  }
}

export function clearCardDraft(): void {
  try {
    localStorage.removeItem(CARD_DRAFT_STORAGE_KEY)
  } catch {
    // Ignore storage failures in private browsing or quota errors.
  }
}

export function buildCharacterDraft(
  character: CharacterDraft & { imageUrl?: string },
): CharacterDraft {
  return {
    name: character.name,
    dc: character.dc,
    world: character.world,
    imageSettings: sanitizeImageSettings(character.imageSettings, { scale: 1, x: 0, y: 0, rotation: 0 }),
    imageFrameTheme: character.imageFrameTheme,
    targetFrameTheme: character.targetFrameTheme,
    roles: { ...character.roles },
    playTime: sanitizePlayTime(character.playTime, {
      weekday: { start: 21, end: 24 },
      holiday: { start: 12, end: 3 },
    }),
    vc: character.vc,
    interests: character.interests.map(({ name, level }) => ({ name, level })),
    targets: (character.targets ?? []).slice(0, 3).map((target, targetIndex) => {
      const iconUrl = isUnsafeImageReference(target.iconUrl) ? null : target.iconUrl ?? null
      const comment = targetIndex === 0
        ? target.comment
        : (target.comment ? normalizeSecondaryTargetComment(target.comment) : undefined)

      return {
        title: target.title,
        category: target.category,
        subcategory: target.subcategory,
        icon: target.icon,
        comment,
        iconUrl,
        sourceDictionaryId: target.sourceDictionaryId,
        contentName: target.contentName,
        acquisitionRoutes: target.acquisitionRoutes,
      }
    }),
    todoList: character.todoList ?? [],
    unfinishedList: character.unfinishedList ?? [],
    sectionTitles: sanitizeSectionTitles(character.sectionTitles, {
      target: '狙ってるもの',
      ...defaultActivitySectionTitles,
    }),
    tags: [...(character.tags ?? [])],
    message: character.message,
    lodestone: sanitizeLodestoneCardState(character.lodestone, createDefaultLodestoneCardState()),
  }
}
