import {
  activityColumnMainTitles,
  activityColumnSubtitleOptions,
  type ActivityColumnKey,
  type HelpSectionSubtitle,
  type WantSectionSubtitle,
} from '../../data/activityColumnTitles'

export function ActivityColumnHeader({
  columnKey,
  subtitle,
  isPreviewMode,
  onSubtitleChange,
}: {
  columnKey: ActivityColumnKey
  subtitle: WantSectionSubtitle | HelpSectionSubtitle
  isPreviewMode: boolean
  onSubtitleChange: (value: WantSectionSubtitle | HelpSectionSubtitle) => void
}) {
  const mainTitle = activityColumnMainTitles[columnKey]
  const subtitleOptions = activityColumnSubtitleOptions[columnKey]

  return (
    <div className="sectionHeader activityColumnHeader">
      <div className="activityColumnTitle">
        <div className="activityColumnTitleMain">{mainTitle}</div>
        {isPreviewMode ? (
          <p className="activityColumnSubtitleDisplay">{subtitle}</p>
        ) : (
          <select
            className="activityColumnSubtitleSelect"
            value={subtitle}
            onChange={(event) => {
              onSubtitleChange(event.target.value as WantSectionSubtitle | HelpSectionSubtitle)
            }}
          >
            {subtitleOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
