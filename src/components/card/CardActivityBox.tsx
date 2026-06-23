import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { ActivityCategory, ContentSelection, InterestItem, SectionTitles, TodoItem } from '../../types/card'
import type { HelpSectionSubtitle, WantSectionSubtitle } from '../../data/activityColumnTitles'
import type { LeftColumnDisplayMode, LodestoneCharacterProfile } from '../../types/lodestone'
import type { JobUserSelection } from '../../types/lodestone'
import { buildJobRoleGroups } from '../../lib/buildJobGridRows'
import { JobIconGrid } from '../jobs/JobIconGrid'
import {
  getInterestIconUrl,
  getTodoItemKey,
  getTodoTitleSizeClass,
  renderTodoItemLines,
} from '../../utils/cardDisplayUtils'
import { ActivityColumnHeader } from './ActivityColumnHeader'
import { InviteContentPicker } from './InviteContentPicker'
import { Stars } from './Stars'

type CardActivityBoxProps = {
  interests: InterestItem[]
  todoList: TodoItem[]
  unfinishedList: TodoItem[]
  sectionTitles: SectionTitles
  contentSelections: {
    todoList: ContentSelection
    unfinishedList: ContentSelection
  }
  contentDisplayLimit: number
  effectivePreviewMode: boolean
  interestSectionStyle: CSSProperties
  wantSectionStyle: CSSProperties
  helpSectionStyle: CSSProperties
  leftColumnDisplayMode: LeftColumnDisplayMode
  lodestoneProfile: LodestoneCharacterProfile | null
  jobSelections: Record<string, JobUserSelection>
  updateInterestLevel: (interestName: ActivityCategory, level: number) => void
  updateActivitySubtitle: (column: 'want' | 'help', value: WantSectionSubtitle | HelpSectionSubtitle) => void
  updateContentSelection: (listKey: 'todoList' | 'unfinishedList', field: keyof ContentSelection, value: string) => void
  addContentItem: (listKey: 'todoList' | 'unfinishedList') => void
  removeContentItem: (listKey: 'todoList' | 'unfinishedList', itemKey: string) => void
  onLeftColumnDisplayModeChange: (mode: LeftColumnDisplayMode) => void
  onJobSelectionChange: (jobId: string, selection: JobUserSelection) => void
}

export function CardActivityBox({
  interests,
  todoList,
  unfinishedList,
  sectionTitles,
  contentSelections,
  contentDisplayLimit,
  effectivePreviewMode,
  interestSectionStyle,
  wantSectionStyle,
  helpSectionStyle,
  leftColumnDisplayMode,
  lodestoneProfile,
  jobSelections,
  updateInterestLevel,
  updateActivitySubtitle,
  updateContentSelection,
  addContentItem,
  removeContentItem,
  onLeftColumnDisplayModeChange,
  onJobSelectionChange,
}: CardActivityBoxProps) {
  const showJobs = leftColumnDisplayMode === 'jobs'
  const leftColumnClassName = showJobs ? 'activityColumn jobBox' : 'activityColumn interestBox'
  const leftColumnStyle = interestSectionStyle
  const jobRoleGroups = useMemo(
    () => buildJobRoleGroups(lodestoneProfile, jobSelections),
    [lodestoneProfile, jobSelections],
  )

  return (
    <section className="activityBox">
      <div className={leftColumnClassName} style={leftColumnStyle}>
        {!effectivePreviewMode && (
          <fieldset className="leftColumnDisplayToggle">
            <legend>表示内容</legend>
            <label>
              <input
                type="radio"
                name="leftColumnDisplayMode"
                checked={leftColumnDisplayMode === 'interests'}
                onChange={() => onLeftColumnDisplayModeChange('interests')}
              />
              今の興味
            </label>
            <label>
              <input
                type="radio"
                name="leftColumnDisplayMode"
                checked={leftColumnDisplayMode === 'jobs'}
                onChange={() => onLeftColumnDisplayModeChange('jobs')}
              />
              ジョブ
            </label>
          </fieldset>
        )}

        {showJobs ? (
          <>
            {effectivePreviewMode ? (
              <div className="jobBoxTitle jobBoxTitle--reserve" aria-hidden="true">
                ジョブ
              </div>
            ) : (
              <div className="jobBoxTitle">ジョブ</div>
            )}
            <JobIconGrid
              roleGroups={jobRoleGroups}
              lodestoneLinked={lodestoneProfile != null}
              interactive={!effectivePreviewMode}
              onSelectionChange={onJobSelectionChange}
            />
          </>
        ) : (
          <>
            <div className="sectionTitle">好きなこと！興味あるもの！</div>
            <div className="interestGrid">
              {interests.map((interest) => (
                <div className="interestItem" key={interest.name}>
                  <div className="interestName">
                    <span
                      aria-hidden="true"
                      className="interestIconImage"
                      style={{ backgroundImage: `url("${getInterestIconUrl(interest)}")` }}
                    />
                    <strong>{interest.name}</strong>
                  </div>
                  <Stars
                    level={interest.level}
                    isEditable={!effectivePreviewMode}
                    onChange={(level) => updateInterestLevel(interest.name, level)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="activityColumn" style={wantSectionStyle}>
        <ActivityColumnHeader
          columnKey="want"
          subtitle={sectionTitles.want}
          isPreviewMode={effectivePreviewMode}
          onSubtitleChange={(value) => updateActivitySubtitle('want', value)}
        />

        <InviteContentPicker
          selection={contentSelections.todoList}
          onSelectionChange={(field, value) => updateContentSelection('todoList', field, value)}
          onAdd={() => addContentItem('todoList')}
        />

        <ul className="simpleList">
          {todoList.slice(0, contentDisplayLimit).map((todo) => (
            <li
              className={`todoSummary${effectivePreviewMode ? ` ${getTodoTitleSizeClass(todo)}` : ''}`}
              key={getTodoItemKey(todo)}
            >
              {renderTodoItemLines(todo)}
              <button type="button" onClick={() => removeContentItem('todoList', getTodoItemKey(todo))}>
                削除
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="activityColumn" style={helpSectionStyle}>
        <ActivityColumnHeader
          columnKey="help"
          subtitle={sectionTitles.help}
          isPreviewMode={effectivePreviewMode}
          onSubtitleChange={(value) => updateActivitySubtitle('help', value)}
        />

        <InviteContentPicker
          selection={contentSelections.unfinishedList}
          onSelectionChange={(field, value) => updateContentSelection('unfinishedList', field, value)}
          onAdd={() => addContentItem('unfinishedList')}
        />

        <ul className="simpleList">
          {unfinishedList.slice(0, contentDisplayLimit).map((item) => (
            <li
              className={`todoSummary${effectivePreviewMode ? ` ${getTodoTitleSizeClass(item)}` : ''}`}
              key={getTodoItemKey(item)}
            >
              {renderTodoItemLines(item)}
              <button type="button" onClick={() => removeContentItem('unfinishedList', getTodoItemKey(item))}>
                削除
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
