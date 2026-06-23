import equipmentMetadataJson from '../data/reverse-search/generated/equipment_metadata_by_item_id.generated.json'
import sourceDictionary from '../data/reverse-search/manual/source_dictionary.json'
import type {
  EquipmentMetadataEntry,
  EquipmentMetadataRoleSource,
  EquipmentMetadataSlotSource,
} from '../types/card'

type EquipmentMetadataFile = {
  items?: Record<string, EquipmentMetadataEntry>
}

const metadataFile = equipmentMetadataJson as EquipmentMetadataFile
const metadataByItemId = new Map<number, EquipmentMetadataEntry>(
  Object.values(metadataFile.items ?? {}).map((entry) => [entry.itemId, entry]),
)

const sourceItemIdByDictionaryId = new Map<string, number>()

for (const entry of sourceDictionary as Array<{ type?: string; id?: string; itemId?: number | null }>) {
  if (entry.type === 'metadata' || !entry.id || entry.itemId == null) {
    continue
  }

  sourceItemIdByDictionaryId.set(entry.id, entry.itemId)
}

const JOB_ABBREV_TO_JA: Record<string, string> = {
  PLD: 'ナイト',
  WAR: '戦士',
  DRK: '暗黒騎士',
  GNB: 'ガンブレイカー',
  WHM: '白魔道士',
  SCH: '学者',
  AST: '占星術師',
  SGE: '賢者',
  DRG: '竜騎士',
  RPR: 'リーパー',
  MNK: 'モンク',
  SAM: '侍',
  VPR: 'ヴァイパー',
  BRD: '吟遊詩人',
  MCH: '機工士',
  DNC: '踊り子',
  NIN: '忍者',
  BLM: '黒魔道士',
  SMN: '召喚士',
  RDM: '赤魔道士',
  BLU: '青魔道士',
  PCT: 'ピクトマンサー',
}

const DISPLAY_JOB_ORDER = [
  'PLD', 'WAR', 'DRK', 'GNB',
  'WHM', 'SCH', 'AST', 'SGE',
  'MNK', 'SAM', 'DRG', 'RPR', 'NIN', 'VPR',
  'BRD', 'MCH', 'DNC',
  'BLM', 'SMN', 'RDM', 'BLU', 'PCT',
] as const

const BASE_CLASS_JA_NAMES = new Set([
  '剣術士',
  '斧術士',
  '幻術士',
  '巴術士',
  '槍術士',
  '弓術士',
  '呪術士',
])

export type { EquipmentMetadataEntry, EquipmentMetadataRoleSource, EquipmentMetadataSlotSource }

export function getEquipmentMetadataByItemId(itemId: number | null | undefined): EquipmentMetadataEntry | null {
  if (itemId == null) {
    return null
  }

  return metadataByItemId.get(itemId) ?? null
}

export function getEquipmentMetadataForSourceId(sourceDictionaryId: string | null | undefined): EquipmentMetadataEntry | null {
  if (!sourceDictionaryId) {
    return null
  }

  const itemId = sourceItemIdByDictionaryId.get(sourceDictionaryId)

  if (itemId == null) {
    return null
  }

  return getEquipmentMetadataByItemId(itemId)
}

export function formatEquipJobsForDisplay(equipJobs: readonly string[]): string {
  return DISPLAY_JOB_ORDER
    .filter((abbrev) => equipJobs.includes(abbrev))
    .map((abbrev) => JOB_ABBREV_TO_JA[abbrev])
    .filter(Boolean)
    .join(' / ')
}

export function formatEquipmentMetadataCandidateLine(metadata: EquipmentMetadataEntry): string {
  return formatEquipmentMetadataSummary(metadata)
}

export function formatEquipmentMetadataSummary(input: {
  equipLevel: number
  itemLevel: number
  equipRole: EquipmentMetadataEntry['equipRole']
  equipSlot: EquipmentMetadataEntry['equipSlot']
}): string {
  const parts = [
    `Lv${input.equipLevel}`,
    `IL${input.itemLevel}`,
    input.equipRole,
  ]

  if (input.equipSlot) {
    parts.push(input.equipSlot)
  }

  return parts.join(' / ')
}

export function buildEquipmentMetadataSearchNames(metadata: EquipmentMetadataEntry): string[] {
  const terms = new Set<string>()

  if (metadata.equipLevel > 0) {
    const level = metadata.equipLevel
    terms.add(`Lv${level}`)
    terms.add(`lv${level}`)
    terms.add(`レベル${level}`)
    terms.add(`装備Lv${level}`)
    terms.add(`装備レベル${level}`)
    terms.add(`${level}装備`)
  }

  if (metadata.itemLevel > 0) {
    const itemLevel = metadata.itemLevel
    terms.add(`IL${itemLevel}`)
    terms.add(`il${itemLevel}`)
    terms.add(`アイテムレベル${itemLevel}`)
    terms.add(`アイテムLv${itemLevel}`)
    terms.add(`ItemLevel${itemLevel}`)
  }

  if (metadata.equipRole && metadata.equipRole !== '共通') {
    terms.add(metadata.equipRole)
  }

  if (metadata.equipSlot) {
    terms.add(metadata.equipSlot)
  }

  if (metadata.itemUiCategory) {
    terms.add(metadata.itemUiCategory)
  }

  for (const abbrev of DISPLAY_JOB_ORDER) {
    if (!metadata.equipJobs.includes(abbrev)) {
      continue
    }

    const jobName = JOB_ABBREV_TO_JA[abbrev]

    if (jobName) {
      terms.add(jobName)
    }
  }

  return [...terms]
}

const globalEquipmentMetadataSearchTerms = new Set<string>()

for (const metadata of metadataByItemId.values()) {
  for (const term of buildEquipmentMetadataSearchNames(metadata)) {
    globalEquipmentMetadataSearchTerms.add(term.toLowerCase())
  }
}

export function isEquipmentMetadataSearchToken(token: string): boolean {
  return globalEquipmentMetadataSearchTerms.has(token.toLowerCase())
}

export function isBaseClassJobSearchName(name: string): boolean {
  return BASE_CLASS_JA_NAMES.has(name)
}

export function getEquipmentMetadataSearchNamesForItem(input: {
  id?: number | null
  sourceDictionaryId?: string | null
}): string[] {
  const metadata = input.id != null
    ? getEquipmentMetadataByItemId(input.id)
    : getEquipmentMetadataForSourceId(input.sourceDictionaryId)

  if (!metadata) {
    return []
  }

  return buildEquipmentMetadataSearchNames(metadata)
}
