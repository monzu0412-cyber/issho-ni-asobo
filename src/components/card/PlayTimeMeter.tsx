import type { TimeRange } from '../../types/card'
import { formatTimeRange } from '../../utils/cardDisplayUtils'

function isActiveHour(hour: number, range: TimeRange) {
  const endHour = range.end === 24 ? 24 : range.end

  if (range.start === endHour) {
    return false
  }

  if (range.start < endHour) {
    return hour >= range.start && hour < endHour
  }

  return hour >= range.start || hour < endHour
}

export function PlayTimeMeter({ label, range }: { label: string; range: TimeRange }) {
  return (
    <div className="playTimeMeter">
      <span>{label}</span>
      <div className="playTimeTrack">
        <div className="timeScale" aria-hidden="true">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
        <div className="timeBlocks" aria-label={`${label} ${formatTimeRange(range)}`}>
          {Array.from({ length: 24 }, (_, hour) => (
            <i
              className={isActiveHour(hour, range) ? 'active' : ''}
              key={hour}
              title={`${hour}時`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
