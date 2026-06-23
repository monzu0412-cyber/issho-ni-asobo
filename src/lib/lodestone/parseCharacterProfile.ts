import { resolveJobId } from './jobNameMap.js'
import type { LodestoneCharacterJob, LodestoneCharacterProfile } from '../../types/lodestone.js'

const MAX_JOB_LEVEL = 100

const EMPTY_EXP_PATTERNS = new Set(['- / -', '-- / -', '-- / --'])

export function parseProfileWorld(profileHtml: string): { name: string; world: string; dataCenter?: string } {
  const name =
    profileHtml.match(/<p class="frame__chara__name">([^<]+)<\/p>/i)?.[1]?.trim()
    ?? profileHtml.match(/<title>([^|<]+)/i)?.[1]?.trim()
    ?? ''

  const worldBlock =
    profileHtml.match(/<p class="frame__chara__world">([\s\S]*?)<\/p>/i)?.[1]
    ?? ''

  const worldText = worldBlock.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const bracketMatch = worldText.match(/^(.+?)\s*\[([^\]]+)\]\s*$/)
  const parenMatch = worldText.match(/^(.+?)\s*\(([^)]+)\)\s*$/)

  const world = bracketMatch?.[1]?.trim() ?? parenMatch?.[1]?.trim() ?? worldText
  const dataCenter = bracketMatch?.[2]?.trim() ?? parenMatch?.[2]?.trim()

  return { name, world, dataCenter }
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Lodestone may show job level in character__job__exp (e.g. "100 / 450")
 * or in character__job__level when exp is capped / XP-progress form.
 */
export function parseJobLevelFromExp(expText: string): number {
  const exp = stripHtml(expText)

  if (!exp || EMPTY_EXP_PATTERNS.has(exp)) {
    return 0
  }

  const numericMatch = exp.match(/^([\d,]+)\s*\/\s*([\d,]+)$/)

  if (!numericMatch) {
    return 0
  }

  const current = Number(numericMatch[1].replace(/,/g, ''))
  const denominator = Number(numericMatch[2].replace(/,/g, ''))

  if (!Number.isFinite(current) || !Number.isFinite(denominator) || current <= 0) {
    return 0
  }

  if (current > MAX_JOB_LEVEL) {
    return 0
  }

  // "100 / 450" at max level: first token is job level.
  if (current >= 60 && denominator > current && denominator < 1000) {
    return current
  }

  // Mid-level progress often uses large denominators (exp to next level).
  if (denominator > 500) {
    return 0
  }

  if (current <= MAX_JOB_LEVEL) {
    return current
  }

  return 0
}

export function shouldFallbackToLevelField(expText: string): boolean {
  const exp = stripHtml(expText)

  if (!exp || EMPTY_EXP_PATTERNS.has(exp)) {
    return true
  }

  const numericMatch = exp.match(/^([\d,]+)\s*\/\s*([\d,]+)$/)

  if (!numericMatch) {
    return true
  }

  const denominator = Number(numericMatch[2].replace(/,/g, ''))

  if (!Number.isFinite(denominator)) {
    return true
  }

  return denominator > 500
}

export function parseJobLevelFromLevelField(levelText: string): number {
  const level = stripHtml(levelText).replace(/,/g, '')

  if (!level || level === '-') {
    return 0
  }

  const parsed = Number(level)

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_JOB_LEVEL) {
    return 0
  }

  return parsed
}

export function resolveJobLevel(expText: string, levelText: string): number {
  const fromExp = parseJobLevelFromExp(expText)

  if (fromExp > 0) {
    return fromExp
  }

  if (shouldFallbackToLevelField(expText)) {
    return parseJobLevelFromLevelField(levelText)
  }

  return 0
}

export function parseClassJobs(classJobHtml: string): LodestoneCharacterJob[] {
  const jobs: LodestoneCharacterJob[] = []
  const seen = new Set<string>()

  for (const block of classJobHtml.matchAll(/<li>[\s\S]*?<\/li>/gi)) {
    const li = block[0]

    if (!li.includes('character__job__name')) {
      continue
    }

    const rawJobName =
      li.match(/data-tooltip="([^"]+)"/i)?.[1]?.trim()
      ?? li.match(/character__job__name[^>]*>([^<]+)</i)?.[1]?.trim()

    const jobName = rawJobName?.replace(/\s*\[[^\]]+\]\s*$/u, '').trim()

    if (!jobName || seen.has(jobName)) {
      continue
    }

    seen.add(jobName)

    const expText =
      li.match(/character__job__exp[^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?? li.match(/character__job__exp[^>]*>([^<]*)</i)?.[1]
      ?? ''

    const levelText =
      li.match(/character__job__level[^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?? li.match(/character__job__level[^>]*>([^<]*)</i)?.[1]
      ?? ''

    const level = resolveJobLevel(expText, levelText)

    jobs.push({
      jobId: resolveJobId(jobName),
      jobName,
      level,
      isCapped: level >= MAX_JOB_LEVEL,
    })
  }

  return jobs
}

export function parseLodestoneCharacterProfile(input: {
  characterId: string
  profileHtml: string
  classJobHtml: string
}): LodestoneCharacterProfile {
  const { name, world, dataCenter } = parseProfileWorld(input.profileHtml)
  const jobs = parseClassJobs(input.classJobHtml)

  if (!name) {
    throw new Error('parse_failed_name')
  }

  if (!world) {
    throw new Error('parse_failed_world')
  }

  if (jobs.length === 0) {
    throw new Error('parse_failed_jobs')
  }

  return {
    characterId: input.characterId,
    name,
    world,
    dataCenter,
    jobs,
  }
}
