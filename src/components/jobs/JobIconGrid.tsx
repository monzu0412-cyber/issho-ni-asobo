import type { JobRoleGroup } from '../../lib/buildJobGridRows'
import {
  cycleJobSelection,
  getJobVisualState,
  getJobVisualStateLabel,
} from '../../lib/jobSelectionState'
import type { JobUserSelection } from '../../types/lodestone'

type JobIconGridProps = {
  roleGroups: JobRoleGroup[]
  lodestoneLinked: boolean
  interactive: boolean
  showLabels?: boolean
  onSelectionChange: (jobId: string, selection: JobUserSelection) => void
}

function JobIconContent({
  job,
  visualState,
  showLabels,
}: {
  job: JobRoleGroup['rows'][number][number]
  visualState: ReturnType<typeof getJobVisualState>
  showLabels: boolean
}) {
  return (
    <>
      <span className={`jobIconFrame jobIconFrame--${visualState}`}>
        <img className="jobIconImage" src={job.iconUrl} alt="" decoding="async" draggable={false} />
      </span>
      {showLabels && <span className="jobIconLabel">{job.label}</span>}
    </>
  )
}

export function JobIconGrid({
  roleGroups,
  lodestoneLinked,
  interactive,
  showLabels = false,
  onSelectionChange,
}: JobIconGridProps) {
  return (
    <div className="jobRoleGrid" role="list" aria-label="ジョブ一覧">
      {roleGroups.map((group) => (
        <div className={`jobRoleSection jobRoleSection--${group.roleId}`} key={group.roleId} role="presentation">
          {group.rows.map((row, rowIndex) => (
            <div
              className={`jobRoleRow jobRoleRow--${group.roleId}`}
              key={`${group.roleId}-${rowIndex}`}
              role="presentation"
            >
              {row.map((job) => {
                const lodestoneCapped = Boolean(job.lodestone?.isCapped)
                const visualState = getJobVisualState({
                  selection: job.selection,
                  lodestoneLinked,
                  lodestoneCapped,
                })
                const stateLabel = getJobVisualStateLabel(visualState)

                if (!interactive) {
                  return (
                    <div
                      key={job.jobId}
                      className="jobIconCell"
                      role="listitem"
                      aria-label={`${job.label}（${stateLabel}）`}
                      title={`${job.label} — ${stateLabel}`}
                    >
                      <JobIconContent job={job} visualState={visualState} showLabels={showLabels} />
                    </div>
                  )
                }

                return (
                  <button
                    key={job.jobId}
                    type="button"
                    className="jobIconCell jobIconButton"
                    role="listitem"
                    aria-label={`${job.label}（${stateLabel}）`}
                    title={`${job.label} — ${stateLabel}`}
                    onClick={() => {
                      onSelectionChange(
                        job.jobId,
                        cycleJobSelection({
                          current: job.selection,
                          lodestoneLinked,
                          lodestoneCapped,
                        }),
                      )
                    }}
                  >
                    <JobIconContent job={job} visualState={visualState} showLabels={showLabels} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
