import type { SyntheticEvent } from 'react'
import type {
  ActivityCategory,
  InterestItem,
  PlayTime,
  TargetFrameCategory,
  TargetFrameTheme,
  TargetItem,
  TimeRange,
  TodoItem,
} from '../types/card'
import { sourceItemById } from '../components/target/targetSearchHelpers'

export const interestIconUrls: Record<ActivityCategory, string> = {
  戦闘: '/icons/interests/combat.png',
  収集: '/icons/interests/collection.png',
  釣り: '/icons/interests/fishing.png',
  地図: '/icons/interests/treasure.png',
  クラフター: '/icons/interests/crafter.png',
  ギャザラー: '/icons/interests/gatherer.png',
  SS: '/icons/interests/screenshot.png',
  ハウジング: '/icons/interests/housing.png',
  ミラプリ: '/icons/interests/glamour.png',
  演奏: '/icons/interests/performance.png',
  PvP: '/icons/interests/pvp.png',
  交流: '/icons/interests/social.png',
  RP: '/icons/interests/rp.png',
  金策: '/icons/interests/gil.png',
  モブハント: '/icons/interests/other.png',
  その他: '/icons/interests/other.png',
}

export const IMAGE_SCALE_MIN = 1
export const IMAGE_SCALE_MAX = 4.5
export const IMAGE_ROTATION_MIN = 0
export const IMAGE_ROTATION_MAX = 270
export const CARD_CONTENT_DISPLAY_LIMIT = 5
export const EDIT_CONTENT_DISPLAY_LIMIT = 5

export function normalizePlayTime(playTime: PlayTime | string[]): PlayTime {
  if (Array.isArray(playTime)) {
    return {
      weekday: { start: 21, end: 24 },
      holiday: { start: 12, end: 3 },
    }
  }

  return playTime
}

export function formatHour(hour: number) {
  return `${hour}時`
}

export function formatTimeRange(range: TimeRange) {
  return `${formatHour(range.start)}〜${formatHour(range.end)}`
}

export function getInterestIconUrl(interest: InterestItem) {
  return interest.iconUrl ?? interestIconUrls[interest.name]
}

export function getImageCrossOrigin(src: string | undefined | null) {
  if (!src) {
    return undefined
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    return 'anonymous' as const
  }

  return undefined
}

export function getTodoItemKey(item: TodoItem) {
  return `${item.middle ?? ''}|${item.title}`
}

export function renderTodoItemLines(item: TodoItem) {
  if (item.middle) {
    return (
      <>
        <strong>{item.middle}</strong>
        <span>{item.title}</span>
      </>
    )
  }

  return (
    <>
      <strong>{item.title}</strong>
      {item.category && <span>{item.category}</span>}
    </>
  )
}

function getTargetFrameCategory(target: TargetItem): TargetFrameCategory | null {
  const sourceItem = target.sourceDictionaryId ? sourceItemById.get(target.sourceDictionaryId) : undefined
  const category1 = sourceItem?.category1 ?? ''
  const classification = `${category1} ${target.subcategory} ${target.category} ${target.title}`

  if (category1 === '魚' || classification.includes('魚') || classification.includes('釣り') || classification.includes('ヌシ')) {
    return 'fish'
  }

  if (category1 === 'マウント' || classification.includes('マウント')) {
    return 'mount'
  }

  if (category1 === 'ミニオン' || classification.includes('ミニオン')) {
    return 'minion'
  }

  if (
    category1 === '装備'
    || category1 === '髪型'
    || classification.includes('装備')
    || classification.includes('髪型')
    || classification.includes('ヘアカタログ')
  ) {
    return 'gear'
  }

  if (category1 === '譜面' || classification.includes('譜面') || classification.includes('オーケストリオン') || classification.includes('楽譜')) {
    return 'music'
  }

  if (
    category1 === 'エモート'
    || classification.includes('エモート')
    || classification.includes('家具')
    || classification.includes('ハウジング')
  ) {
    return 'housing'
  }

  return null
}

export function getTargetFrameUrl(target: TargetItem, theme: TargetFrameTheme) {
  const frameCategory = getTargetFrameCategory(target)

  if (!frameCategory) {
    return ''
  }

  return `/icons/target_frames/${frameCategory}/${frameCategory}_${theme}.png`
}

export function handleIconError(event: SyntheticEvent<HTMLImageElement>, src: string) {
  const image = event.currentTarget

  if (image.dataset.fallbackApplied === 'true') {
    return
  }

  image.dataset.fallbackApplied = 'true'
  image.src = `/public${src}`
}

export function getWantTitleSizeClass(title: string) {
  const length = title.length

  if (length >= 17) {
    return 'titleVeryLong'
  }

  if (length >= 13) {
    return 'titleLong'
  }

  if (length >= 10) {
    return 'titleMedium'
  }

  return ''
}

export function getTodoTitleSizeClass(item: TodoItem) {
  const primaryText = item.middle?.trim() || item.title.trim()
  return getWantTitleSizeClass(primaryText)
}
