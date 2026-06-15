import { contentCategories } from '../contentCategories'
import type { InviteDictionaryItem, InviteMajorCategory, InviteMajorId } from './inviteDictionaryTypes'

function createMiddleItems(prefix: string, labels: readonly string[]): InviteDictionaryItem[] {
  return labels.map((label, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    label,
  }))
}

function extractMiddleLabelsFromSubCategoryIds(subCategoryIds: readonly string[]): readonly string[] {
  const labels: string[] = []

  for (const subCategoryId of subCategoryIds) {
    for (const category of contentCategories) {
      const subCategory = category.children.find((child) => child.id === subCategoryId)

      if (subCategory) {
        for (const item of subCategory.children) {
          labels.push(item.label)
        }
      }
    }
  }

  return labels
}

const savageMiddleItems = createMiddleItems('savage', [
  '機工城アレキサンダー零式：起動編',
  '機工城アレキサンダー零式：律動編',
  '機工城アレキサンダー零式：天動編',
  '次元の狭間オメガ零式：デルタ編',
  '次元の狭間オメガ零式：シグマ編',
  '次元の狭間オメガ零式：アルファ編',
  '希望の園エデン零式：覚醒編',
  '希望の園エデン零式：共鳴編',
  '希望の園エデン零式：再生編',
  '万魔殿パンデモニウム零式：辺獄編',
  '万魔殿パンデモニウム零式：煉獄編',
  '万魔殿パンデモニウム零式：天獄編',
  '至天の座アルカディア零式：ライトヘビー級',
  '至天の座アルカディア零式：クルーザー級',
  '至天の座アルカディア零式：ヘビー級',
])

const ultimateMiddleItems = createMiddleItems(
  'ultimate',
  extractMiddleLabelsFromSubCategoryIds(['ultimate']),
)

const extremeExpansionDefinitions = [
  { id: 'extreme-arr', label: '極（新生）', subCategoryId: 'extreme-arr' },
  { id: 'extreme-heavensward', label: '極（蒼天）', subCategoryId: 'extreme-heavensward' },
  { id: 'extreme-stormblood', label: '極（紅蓮）', subCategoryId: 'extreme-stormblood' },
  { id: 'extreme-shadowbringers', label: '極（漆黒）', subCategoryId: 'extreme-shadowbringers' },
  { id: 'extreme-endwalker', label: '極（暁月）', subCategoryId: 'extreme-endwalker' },
  { id: 'extreme-dawntrail', label: '極（黄金）', subCategoryId: 'extreme-dawntrail' },
] as const

const extremeExpansionCategories: InviteMajorCategory[] = extremeExpansionDefinitions.map((definition) => ({
  id: definition.id,
  label: definition.label,
  middleItems: createMiddleItems(
    definition.id,
    extractMiddleLabelsFromSubCategoryIds([definition.subCategoryId]),
  ),
}))

const dungeonExpansionDefinitions = [
  {
    id: 'dungeon-arr',
    label: 'ID（新生）',
    subCategoryIds: ['dungeon-arr-main', 'dungeon-arr-extra'],
  },
  {
    id: 'dungeon-heavensward',
    label: 'ID（蒼天）',
    subCategoryIds: ['dungeon-heavensward-main', 'dungeon-heavensward-extra'],
  },
  {
    id: 'dungeon-stormblood',
    label: 'ID（紅蓮）',
    subCategoryIds: ['dungeon-stormblood-main', 'dungeon-stormblood-extra'],
  },
  {
    id: 'dungeon-shadowbringers',
    label: 'ID（漆黒）',
    subCategoryIds: ['dungeon-shadowbringers-main', 'dungeon-shadowbringers-extra'],
  },
  {
    id: 'dungeon-endwalker',
    label: 'ID（暁月）',
    subCategoryIds: ['dungeon-endwalker-main', 'dungeon-endwalker-extra'],
  },
  {
    id: 'dungeon-dawntrail',
    label: 'ID（黄金）',
    subCategoryIds: ['dungeon-dawntrail-main', 'dungeon-dawntrail-extra'],
  },
] as const

const dungeonExpansionCategories: InviteMajorCategory[] = dungeonExpansionDefinitions.map((definition) => ({
  id: definition.id,
  label: definition.label,
  middleItems: createMiddleItems(
    definition.id,
    extractMiddleLabelsFromSubCategoryIds(definition.subCategoryIds),
  ),
}))

const legacyExtremeMiddleItems = createMiddleItems('extreme', [
  '極ガルーダ討滅戦',
  '極タイタン討滅戦',
  '極イフリート討滅戦',
  '極モグル・モグXII世討滅戦',
  '極リヴァイアサン討滅戦',
  '極ラムウ討滅戦',
  '極シヴァ討滅戦',
  '極アルテマウェポン破壊作戦',
  '極ラーヴァナ討滅戦',
  '極ビスマルク討滅戦',
  '極ナイツ・オブ・ラウンド討滅戦',
  '極魔神セフィロト討滅戦',
  '極ニーズヘッグ征竜戦',
  '極女神ソフィア討滅戦',
  '極鬼神ズルワーン討滅戦',
  '極スサノオ討滅戦',
  '極ラクシュミ討滅戦',
  '極神龍討滅戦',
  '極白虎征魂戦',
  '極ツクヨミ討滅戦',
  '極朱雀征魂戦',
  '極青龍征魂戦',
  '極リオレウス狩猟戦',
  '極ティターニア討滅戦',
  '極イノセンス討滅戦',
  '極ハーデス討滅戦',
  '極ルビーウェポン破壊作戦',
  '極ウォーリア・オブ・ライト討滅戦',
  '極エメラルドウェポン破壊作戦',
  '極シタデル・ボズヤ追憶戦',
  '極ダイヤウェポン捕獲作戦',
  '極ゾディアーク討滅戦',
  '極ハイデリン討滅戦',
  '極終焉の戦い',
  '極バルバリシア討滅戦',
  '極ルビカンテ討滅戦',
  '極ゴルベーザ討滅戦',
  '極ゼロムス討滅戦',
  '極ヴァリガルマンダ討滅戦',
  '極ゾラージャ討滅戦',
  '極エターナルクイーン討滅戦',
  '極ゼレニア討滅戦',
  '極永遠の闇討滅戦',
  '極アルシュベルド狩猟戦',
  '極グラシャラボラス討滅戦',
  '極エヌオー討滅戦',
])

const legacyExtremeMiddleIdMigration = new Map<string, { majorId: InviteMajorId; middleId: string }>()

for (const legacyMiddleItem of legacyExtremeMiddleItems) {
  for (const expansionCategory of extremeExpansionCategories) {
    const matchedMiddleItem = expansionCategory.middleItems.find((item) => item.label === legacyMiddleItem.label)

    if (matchedMiddleItem) {
      legacyExtremeMiddleIdMigration.set(legacyMiddleItem.id, {
        majorId: expansionCategory.id,
        middleId: matchedMiddleItem.id,
      })
      break
    }
  }
}

const defaultExtremeExpansionSelection = {
  majorId: extremeExpansionCategories[0].id,
  middleId: extremeExpansionCategories[0].middleItems[0]?.id ?? `${extremeExpansionCategories[0].id}-01`,
} as const

function migrateLegacyExtremePurposeId(purposeId: string, majorId: InviteMajorId): string {
  const purposeSuffixMatch = purposeId.match(/^extreme-purpose-(\d{2})$/)
  if (purposeSuffixMatch) {
    return `${majorId}-purpose-${purposeSuffixMatch[1]}`
  }

  return purposeId
}

export function migrateLegacyInviteContentSelection(selection: {
  majorId: string
  middleId: string
  purposeId: string
}): {
  majorId: string
  middleId: string
  purposeId: string
} {
  if (selection.majorId !== 'extreme') {
    return selection
  }

  const migratedMiddle = legacyExtremeMiddleIdMigration.get(selection.middleId) ?? defaultExtremeExpansionSelection

  return {
    majorId: migratedMiddle.majorId,
    middleId: migratedMiddle.middleId,
    purposeId: migrateLegacyExtremePurposeId(selection.purposeId, migratedMiddle.majorId),
  }
}

const unrealMiddleItems = createMiddleItems(
  'unreal',
  extractMiddleLabelsFromSubCategoryIds(['unreal']),
)

const mettleMiddleItems = createMiddleItems('mettle', [
  '滅暗闇の雲激闘戦',
])

const allianceMiddleItems = createMiddleItems(
  'alliance',
  extractMiddleLabelsFromSubCategoryIds([
    'alliance-crystal-tower',
    'alliance-mhach',
    'alliance-ivalice',
    'alliance-yorha',
    'alliance-myths',
    'alliance-vana-diel',
  ]),
)

const normalRaidMiddleItems = createMiddleItems(
  'normal-raid',
  extractMiddleLabelsFromSubCategoryIds(['normal-raid']),
)

const vdMiddleItems = createMiddleItems('vd', [
  'ヴァリアントシラディハ水道',
  '異聞シラディハ水道',
  '異聞シラディハ水道零式',
  'ヴァリアント六根山',
  '異聞六根山',
  '異聞六根山零式',
  'ヴァリアントアロアロ島',
  '異聞アロアロ島',
  '異聞アロアロ島零式',
  '商客物語',
  '商客物語アドバンスド',
  '異聞ダリヤ',
  '異聞ダリヤ零式',
  '異聞ソドマス',
  '異聞ソドマス零式',
  '異聞ペリ',
  '異聞ペリ零式',
])

const deepDungeonMiddleItems = createMiddleItems(
  'deep-dungeon',
  extractMiddleLabelsFromSubCategoryIds(['deep-dungeon']),
)

const eurekaMiddleItems = createMiddleItems(
  'eureka',
  extractMiddleLabelsFromSubCategoryIds(['eureka']),
)

const bozjaMiddleItems = createMiddleItems(
  'bozja',
  extractMiddleLabelsFromSubCategoryIds(['bozja']),
)

const treasureMapMiddleItems = createMiddleItems('treasure-map', [
  'G18',
  'G17',
  'G16',
  'G15',
  'G14',
  'G12',
  'G10',
  'G8',
])

const fateMiddleItems = createMiddleItems(
  'fate',
  extractMiddleLabelsFromSubCategoryIds([
    'fate-shb-progress',
    'fate-ew-progress',
    'fate-dt-progress',
    'fate-achievement',
    'fate-farm',
  ]),
)

const blueMageMiddleItems = createMiddleItems(
  'blue-mage',
  extractMiddleLabelsFromSubCategoryIds(['blue-mage']),
)

const fishingMiddleItems = createMiddleItems('fishing', [
  'ヌシ釣り',
  'オオヌシ釣り',
  'オーシャンフィッシング',
  '釣り手帳埋め',
])

export const inviteMajorCategories: InviteMajorCategory[] = [
  {
    id: 'savage',
    label: '零式',
    middleItems: savageMiddleItems,
  },
  {
    id: 'ultimate',
    label: '絶',
    middleItems: ultimateMiddleItems,
  },
  ...extremeExpansionCategories,
  ...dungeonExpansionCategories,
  {
    id: 'unreal',
    label: '幻',
    middleItems: unrealMiddleItems,
  },
  {
    id: 'mettle',
    label: '滅',
    middleItems: mettleMiddleItems,
  },
  {
    id: 'alliance',
    label: 'アライアンス',
    middleItems: allianceMiddleItems,
  },
  {
    id: 'normal-raid',
    label: 'ノーマルレイド',
    middleItems: normalRaidMiddleItems,
  },
  {
    id: 'vd',
    label: 'ヴァリアント / 異聞',
    middleItems: vdMiddleItems,
  },
  {
    id: 'deep-dungeon',
    label: 'DD',
    middleItems: deepDungeonMiddleItems,
  },
  {
    id: 'eureka',
    label: 'エウレカ',
    middleItems: eurekaMiddleItems,
  },
  {
    id: 'bozja',
    label: 'ボズヤ',
    middleItems: bozjaMiddleItems,
  },
  {
    id: 'treasure-map',
    label: '地図',
    middleItems: treasureMapMiddleItems,
  },
  {
    id: 'fate',
    label: 'FATE',
    middleItems: fateMiddleItems,
  },
  {
    id: 'blue-mage',
    label: '青魔',
    middleItems: blueMageMiddleItems,
  },
  {
    id: 'fishing',
    label: '釣り',
    middleItems: fishingMiddleItems,
  },
]

export const inviteMajorIds = inviteMajorCategories.map((category) => category.id)

const inviteMajorCategoryById = new Map(inviteMajorCategories.map((category) => [category.id, category]))

export function getInviteMajorCategory(majorId: InviteMajorId): InviteMajorCategory {
  const category = inviteMajorCategoryById.get(majorId)

  if (!category) {
    return inviteMajorCategories[0]
  }

  return category
}

export function getInviteMiddleItems(majorId: InviteMajorId): InviteDictionaryItem[] {
  return getInviteMajorCategory(majorId).middleItems
}

export function getInviteMiddleItem(majorId: InviteMajorId, middleId: string): InviteDictionaryItem {
  const options = getInviteMiddleItems(majorId)

  return options.find((item) => item.id === middleId) ?? options[0]
}
