import type { LodestoneCharacterProfile } from '../../types/lodestone'

export type DataCenter = 'Elemental' | 'Gaia' | 'Mana' | 'Meteor'

export type LodestoneApplyField = 'name' | 'dc' | 'world'

export type LodestoneApplyFieldPreview = {
  field: LodestoneApplyField
  current: string
  next: string
  mode: 'apply' | 'skip' | 'conflict'
}

export type LodestoneApplyPreview = {
  fields: LodestoneApplyFieldPreview[]
  canApply: boolean
  hasConflicts: boolean
}

export type LodestoneApplyOptions = {
  overwrite: boolean
}

export type LodestoneApplyResult = {
  name: string
  dc: DataCenter
  world: string
  appliedFields: LodestoneApplyField[]
  skippedFields: LodestoneApplyField[]
  warnings: string[]
}

type CharacterLocationFields = {
  name: string
  dc: DataCenter
  world: string
}

const DEFAULT_DATA_CENTER: DataCenter = 'Elemental'

function isEmptyName(name: string): boolean {
  return name.trim() === ''
}

export function isFactoryDefaultLocation(
  dc: DataCenter,
  world: string,
  worldsByDc: Record<DataCenter, readonly string[]>,
): boolean {
  return dc === DEFAULT_DATA_CENTER && world === worldsByDc[DEFAULT_DATA_CENTER][0]
}

export function resolveLodestoneDataCenter(
  profileDc: string | undefined,
  dataCenters: readonly DataCenter[],
): DataCenter | null {
  if (!profileDc?.trim()) {
    return null
  }

  const normalized = profileDc.trim()
  return dataCenters.find((dataCenter) => dataCenter.toLowerCase() === normalized.toLowerCase()) ?? null
}

function resolveLodestoneWorld(
  profileWorld: string | undefined,
  dataCenter: DataCenter,
  worldsByDc: Record<DataCenter, readonly string[]>,
): string | null {
  if (!profileWorld?.trim()) {
    return null
  }

  const normalized = profileWorld.trim()
  const worlds = worldsByDc[dataCenter]
  return worlds.find((world) => world.toLowerCase() === normalized.toLowerCase()) ?? null
}

function shouldApplyName(currentName: string, overwrite: boolean): boolean {
  return overwrite || isEmptyName(currentName)
}

function shouldApplyLocation(current: CharacterLocationFields, overwrite: boolean, worldsByDc: Record<DataCenter, readonly string[]>): boolean {
  return overwrite || isFactoryDefaultLocation(current.dc, current.world, worldsByDc)
}

function buildFieldPreview(
  field: LodestoneApplyField,
  current: string,
  next: string | null,
  willApply: boolean,
): LodestoneApplyFieldPreview {
  if (!next) {
    return {
      field,
      current,
      next: '—',
      mode: 'skip',
    }
  }

  if (current === next) {
    return {
      field,
      current,
      next,
      mode: 'skip',
    }
  }

  return {
    field,
    current,
    next,
    mode: willApply ? 'apply' : 'conflict',
  }
}

export function previewLodestoneApply(
  character: CharacterLocationFields,
  profile: LodestoneCharacterProfile,
  worldsByDc: Record<DataCenter, readonly string[]>,
  dataCenters: readonly DataCenter[],
  options: LodestoneApplyOptions,
): LodestoneApplyPreview {
  const resolvedDc = resolveLodestoneDataCenter(profile.dataCenter, dataCenters)
  const resolvedWorld = resolvedDc
    ? resolveLodestoneWorld(profile.world, resolvedDc, worldsByDc)
    : null

  const applyName = shouldApplyName(character.name, options.overwrite)
  const applyLocation = shouldApplyLocation(character, options.overwrite, worldsByDc)

  const fields: LodestoneApplyFieldPreview[] = [
    buildFieldPreview('name', character.name || '（未入力）', profile.name.trim() || null, applyName),
    buildFieldPreview('dc', character.dc, resolvedDc, applyLocation && Boolean(resolvedDc)),
    buildFieldPreview('world', character.world, resolvedWorld, applyLocation && Boolean(resolvedWorld)),
  ]

  const hasConflicts = fields.some((field) => field.mode === 'conflict')
  const canApply = fields.some((field) => field.mode === 'apply')

  return {
    fields,
    canApply,
    hasConflicts,
  }
}

export function applyLodestoneProfileToCharacter(
  character: CharacterLocationFields,
  profile: LodestoneCharacterProfile,
  worldsByDc: Record<DataCenter, readonly string[]>,
  dataCenters: readonly DataCenter[],
  options: LodestoneApplyOptions,
): LodestoneApplyResult {
  const warnings: string[] = []
  const appliedFields: LodestoneApplyField[] = []
  const skippedFields: LodestoneApplyField[] = []

  let nextName = character.name
  let nextDc = character.dc
  let nextWorld = character.world

  const resolvedDc = resolveLodestoneDataCenter(profile.dataCenter, dataCenters)
  const resolvedWorld = resolvedDc
    ? resolveLodestoneWorld(profile.world, resolvedDc, worldsByDc)
    : null

  const profileName = profile.name.trim()

  if (profileName) {
    if (shouldApplyName(character.name, options.overwrite)) {
      nextName = profileName
      if (nextName !== character.name) {
        appliedFields.push('name')
      }
    } else if (profileName !== character.name) {
      skippedFields.push('name')
    }
  } else {
    warnings.push('ロードストーンからキャラクター名を取得できませんでした。')
  }

  const applyLocation = shouldApplyLocation(character, options.overwrite, worldsByDc)

  if (resolvedDc) {
    if (applyLocation) {
      if (resolvedDc !== character.dc) {
        appliedFields.push('dc')
      }
      nextDc = resolvedDc
    } else if (resolvedDc !== character.dc) {
      skippedFields.push('dc')
    }
  } else if (profile.dataCenter?.trim()) {
    warnings.push(`ロードストーンのDC「${profile.dataCenter}」は未対応です。`)
  }

  if (resolvedWorld) {
    if (applyLocation) {
      if (resolvedWorld !== character.world) {
        appliedFields.push('world')
      }
      nextWorld = resolvedWorld
    } else if (resolvedWorld !== character.world) {
      skippedFields.push('world')
    }
  } else if (profile.world?.trim()) {
    warnings.push(`ロードストーンのWorld「${profile.world}」は現在のDC候補にありません。`)
  }

  if (applyLocation && resolvedDc && !worldsByDc[resolvedDc].includes(nextWorld)) {
    nextWorld = worldsByDc[resolvedDc][0]
    if (!appliedFields.includes('world') && nextWorld !== character.world) {
      appliedFields.push('world')
    }
  }

  return {
    name: nextName,
    dc: nextDc,
    world: nextWorld,
    appliedFields,
    skippedFields,
    warnings,
  }
}
