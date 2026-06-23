import {
  DISPLAY_JOB_CATALOG,
  DPS_JOBS_PER_ROW,
  JOB_ROLE_ORDER,
  JOBS_PER_ROW,
  type DisplayJobDefinition,
  type JobRoleId,
} from '../data/jobDisplayCatalog'
import { computeBalancedRowSizes } from './computeBalancedRowSizes'
import type { JobUserSelection, LodestoneCharacterProfile } from '../types/lodestone'

export type JobGridRow = DisplayJobDefinition & {
  lodestone?: {
    level: number
    isCapped: boolean
  } | null
  selection: JobUserSelection
}

export type JobRoleGroup = {
  roleId: JobRoleId
  rows: JobGridRow[][]
}

function buildJobRow(
  job: DisplayJobDefinition,
  profileById: Map<string, NonNullable<LodestoneCharacterProfile['jobs']>[number]>,
  selections: Record<string, JobUserSelection>,
): JobGridRow {
  const lodestoneJob = profileById.get(job.jobId)

  return {
    ...job,
    lodestone: lodestoneJob
      ? {
          level: lodestoneJob.level,
          isCapped: lodestoneJob.isCapped,
        }
      : null,
    selection: selections[job.jobId] ?? 'baseline',
  }
}

function chunkJobsByRowSizes(jobs: JobGridRow[], rowSizes: number[]): JobGridRow[][] {
  let offset = 0

  return rowSizes
    .map((size) => {
      const row = jobs.slice(offset, offset + size)
      offset += size
      return row
    })
    .filter((row) => row.length > 0)
}

function buildDisplayRows(roleId: JobRoleId, jobs: JobGridRow[]): JobGridRow[][] {
  if (jobs.length === 0) {
    return []
  }

  if (roleId === 'gatherer') {
    return [jobs]
  }

  const maxPerRow = roleId === 'dps' ? DPS_JOBS_PER_ROW : JOBS_PER_ROW
  const rowSizes = computeBalancedRowSizes(jobs.length, maxPerRow)

  return chunkJobsByRowSizes(jobs, rowSizes)
}

export function buildJobRoleGroups(
  profile: LodestoneCharacterProfile | null,
  selections: Record<string, JobUserSelection>,
): JobRoleGroup[] {
  const profileById = new Map(profile?.jobs.map((job) => [job.jobId, job]) ?? [])
  const jobsByRole = new Map<JobRoleId, JobGridRow[]>()

  for (const roleId of JOB_ROLE_ORDER) {
    jobsByRole.set(roleId, [])
  }

  for (const job of DISPLAY_JOB_CATALOG) {
    jobsByRole.get(job.roleId)?.push(buildJobRow(job, profileById, selections))
  }

  return JOB_ROLE_ORDER.map((roleId) => ({
    roleId,
    rows: buildDisplayRows(roleId, jobsByRole.get(roleId) ?? []),
  })).filter((group) => group.rows.length > 0)
}

/** Flat list in role order (lab stats / diagnostics). */
export function buildJobGridRows(
  profile: LodestoneCharacterProfile | null,
  selections: Record<string, JobUserSelection>,
): JobGridRow[] {
  return buildJobRoleGroups(profile, selections).flatMap((group) => group.rows.flat())
}
