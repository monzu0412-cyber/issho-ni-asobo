import type { SyntheticEvent } from 'react'
import type { SearchDictionaryItem, TargetFrameTheme, TargetItem } from '../../types/card'
import { targetFrameThemeOptions } from '../../types/card'
import { getImageCrossOrigin, getWantTitleSizeClass } from '../../utils/cardDisplayUtils'
import { TargetDetails } from '../target/TargetDetails'
import { TargetSearch } from '../target/TargetSearch'

type MainWantPanelProps = {
  topTarget: TargetItem
  hasTargetFrame: boolean
  targetFrameUrl: string
  targetFrameTheme: TargetFrameTheme
  effectivePreviewMode: boolean
  targetSearchQuery: string
  onTargetFrameLoad: () => void
  onTargetFrameError: (event: SyntheticEvent<HTMLImageElement>) => void
  updateTopTargetComment: (comment: string) => void
  updateTargetSearchQuery: (query: string) => void
  selectSearchTarget: (item: SearchDictionaryItem) => void
  selectUnsupportedTarget: () => void
  updateTargetFrameTheme: (theme: TargetFrameTheme) => void
}

export function MainWantPanel({
  topTarget,
  hasTargetFrame,
  targetFrameUrl,
  targetFrameTheme,
  effectivePreviewMode,
  targetSearchQuery,
  onTargetFrameLoad,
  onTargetFrameError,
  updateTopTargetComment,
  updateTargetSearchQuery,
  selectSearchTarget,
  selectUnsupportedTarget,
  updateTargetFrameTheme,
}: MainWantPanelProps) {
  return (
    <section
      className={`mainWant ${hasTargetFrame ? 'hasTargetFrame' : ''}`}
    >
      {targetFrameUrl && (
        <img
          key={targetFrameUrl}
          className="targetFrame"
          src={targetFrameUrl}
          alt=""
          aria-hidden="true"
          onLoad={onTargetFrameLoad}
          onError={onTargetFrameError}
        />
      )}
      <div className="mainWantLabel">👑 ほしいもの１位！</div>
      <div className={`mainWantTitle ${getWantTitleSizeClass(topTarget.title)}`}>
        {topTarget.iconUrl ? (
          <img className="mainWantIcon" src={topTarget.iconUrl} alt="" crossOrigin={getImageCrossOrigin(topTarget.iconUrl)} />
        ) : topTarget.icon ? (
          <span className="mainWantIconFallback" aria-hidden="true">{topTarget.icon}</span>
        ) : null}
        {topTarget.title ? <h2>{topTarget.title}</h2> : null}
      </div>
      {effectivePreviewMode && topTarget.comment ? (
        <p>{topTarget.comment}</p>
      ) : null}
      {(topTarget.title || effectivePreviewMode) && (
        <div className="categoryBadge">{topTarget.category} / {topTarget.subcategory}</div>
      )}
      {topTarget.title ? <TargetDetails target={topTarget} isCompact /> : null}

      <div className="mainWantForm">
        <label>
          アピールコメント
          <textarea
            rows={3}
            value={topTarget.comment ?? ''}
            onChange={(event) => updateTopTargetComment(event.target.value)}
          />
        </label>

        <TargetSearch
          query={targetSearchQuery}
          onQueryChange={updateTargetSearchQuery}
          onSelect={selectSearchTarget}
          onSelectUnsupported={selectUnsupportedTarget}
        />

        <label>
          フレーム
          <select
            value={targetFrameTheme}
            onChange={(event) => updateTargetFrameTheme(event.target.value as TargetFrameTheme)}
          >
            {targetFrameThemeOptions.map((theme) => (
              <option key={theme.value} value={theme.value}>{theme.label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
