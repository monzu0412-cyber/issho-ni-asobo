import { screenshotEditingMiddleId } from './inviteContentDictionary'
import type { InviteDictionaryItem, InviteMajorId } from './inviteDictionaryTypes'

const extremePurposeLabels = [
  '攻略',
  '初見攻略',
  '練習',
  'クリア目的',
  '周回',
  '収集',
  'マウント周回',
  'トーテム集め',
  '下限シンク',
  '制限解除',
  '少人数攻略',
  'お手伝い',
  '初心者歓迎',
  '復帰者歓迎',
] as const

const idPurposeLabels = [
  '攻略',
  '初見',
  '練習',
  '周回',
  'ルーレット',
  'お手伝い',
] as const

const socialPurposeLabels = [
  '一緒に',
  '募集',
  'お手伝い',
  '初心者歓迎',
  '復帰者歓迎',
] as const

const screenshotShootingPurposeLabels = [
  '個人',
  'ペア',
  '複数人',
  'お手伝い',
] as const

const screenshotEditingPurposeLabels = [
  '見学',
  '一緒に',
  '相談',
  'お手伝い',
] as const

export const purposesByMajor: Record<InviteMajorId, readonly string[]> = {
  savage: [
    '攻略',
    '初見攻略',
    '練習',
    'クリア目的',
    '消化',
    '周回',
    '収集',
    '下限シンク',
    '制限解除',
    '少人数攻略',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  ultimate: [
    '攻略',
    '初見攻略',
    '練習',
    'クリア目的',
    'お手伝い',
    '復帰者歓迎',
  ],
  'extreme-arr': extremePurposeLabels,
  'extreme-heavensward': extremePurposeLabels,
  'extreme-stormblood': extremePurposeLabels,
  'extreme-shadowbringers': extremePurposeLabels,
  'extreme-endwalker': extremePurposeLabels,
  'extreme-dawntrail': extremePurposeLabels,
  'dungeon-arr': idPurposeLabels,
  'dungeon-heavensward': idPurposeLabels,
  'dungeon-stormblood': idPurposeLabels,
  'dungeon-shadowbringers': idPurposeLabels,
  'dungeon-endwalker': idPurposeLabels,
  'dungeon-dawntrail': idPurposeLabels,
  unreal: [
    '攻略',
    '初見攻略',
    '練習',
    'クリア目的',
    '周回',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  mettle: [
    '攻略',
    '初見攻略',
    '練習',
    'クリア目的',
    '周回',
    'お手伝い',
  ],
  alliance: [
    '攻略',
    '初見攻略',
    '周回',
    '収集',
    '制限解除',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  'normal-raid': [
    '攻略',
    '初見攻略',
    '周回',
    '収集',
    '制限解除',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  vd: [
    '攻略',
    '初見攻略',
    '練習',
    'クリア目的',
    '周回',
    '収集',
    '少人数攻略',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  'deep-dungeon': [
    '攻略',
    '初見攻略',
    '練習',
    '踏破',
    '高層攻略',
    '称号狙い',
    '周回',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  eureka: [
    '攻略',
    '初見攻略',
    '周回',
    '収集',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  bozja: [
    '攻略',
    '初見攻略',
    '周回',
    '収集',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  'treasure-map': [
    '周回',
    'フルパ',
    '少人数',
    'お宝狙い',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  fate: [
    '周回',
    '達成度埋め',
    'バイカラージェム集め',
    'アチーブメント狙い',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  'blue-mage': [
    'ラーニング',
    '青魔ログ',
    'モルボルチャレンジ',
    '攻略',
    '練習',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  fishing: [
    '条件合わせ',
    '釣果狙い',
    '手帳埋め',
    '称号狙い',
    '周回',
    'お手伝い',
    '初心者歓迎',
    '復帰者歓迎',
  ],
  social: socialPurposeLabels,
  screenshot: screenshotShootingPurposeLabels,
}

function createPurposeItems(prefix: string, labels: readonly string[]): InviteDictionaryItem[] {
  return labels.map((label, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    label,
  }))
}

const purposeItemsByMajor = new Map<InviteMajorId, InviteDictionaryItem[]>(
  (Object.entries(purposesByMajor) as [InviteMajorId, readonly string[]][]).map(([majorId, labels]) => [
    majorId,
    createPurposeItems(`${majorId}-purpose`, labels),
  ]),
)

const screenshotShootingPurposeItems = createPurposeItems('screenshot-shooting-purpose', screenshotShootingPurposeLabels)
const screenshotEditingPurposeItems = createPurposeItems('screenshot-editing-purpose', screenshotEditingPurposeLabels)

function getScreenshotPurposeItems(middleId?: string): InviteDictionaryItem[] {
  if (middleId === screenshotEditingMiddleId) {
    return screenshotEditingPurposeItems
  }

  return screenshotShootingPurposeItems
}

export function getActivityPurposeItems(majorId: InviteMajorId, middleId?: string): InviteDictionaryItem[] {
  if (majorId === 'screenshot') {
    return getScreenshotPurposeItems(middleId)
  }

  return purposeItemsByMajor.get(majorId) ?? purposeItemsByMajor.get('savage')!
}

export function getActivityPurposeItem(
  majorId: InviteMajorId,
  purposeId: string,
  middleId?: string,
): InviteDictionaryItem {
  const options = getActivityPurposeItems(majorId, middleId)

  return options.find((item) => item.id === purposeId) ?? options[0]
}
