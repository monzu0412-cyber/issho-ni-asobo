import { useEffect, useMemo, useState } from 'react'
import { DISPLAY_JOB_CATALOG } from '../../data/jobDisplayCatalog'
import { buildJobGridRows, buildJobRoleGroups } from '../../lib/buildJobGridRows'
import { fetchLodestoneCharacterProfile } from '../../lib/lodestone/fetchLodestoneCharacter'
import type { JobUserSelection, LodestoneCharacterProfile } from '../../types/lodestone'
import { JobIconGrid } from './JobIconGrid'
import { InterestPanelMock } from './InterestPanelMock'
import './JobDisplayLab.css'
import '../../App.css'

export const JOB_DISPLAY_LAB_PAGE_HASH = '#/job-display-lab'

const MASTER_CHARACTER_ID = '60814884'

type PanelMode = 'interests' | 'jobs'
type ViewportMode = 'pc' | 'mobile'

export function JobDisplayLab() {
  const [panelMode, setPanelMode] = useState<PanelMode>('jobs')
  const [viewportMode, setViewportMode] = useState<ViewportMode>('pc')
  const [lodestoneLinked, setLodestoneLinked] = useState(true)
  const [profile, setProfile] = useState<LodestoneCharacterProfile | null>(null)
  const [selections, setSelections] = useState<Record<string, JobUserSelection>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const jobRows = useMemo(
    () => buildJobGridRows(lodestoneLinked ? profile : null, selections),
    [lodestoneLinked, profile, selections],
  )
  const jobRoleGroups = useMemo(
    () => buildJobRoleGroups(lodestoneLinked ? profile : null, selections),
    [lodestoneLinked, profile, selections],
  )

  const cappedCount = jobRows.filter((job) => job.lodestone?.isCapped).length
  const leveledCount = jobRows.filter((job) => (job.lodestone?.level ?? 0) > 0).length
  const mainCount = jobRows.filter((job) => job.selection === 'main').length
  const playableCount = jobRows.filter((job) => job.selection === 'playable').length

  useEffect(() => {
    void loadLodestoneProfile()
  }, [])

  async function loadLodestoneProfile() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const result = await fetchLodestoneCharacterProfile(MASTER_CHARACTER_ID)

      if (!result.ok) {
        setErrorMessage(result.error.message)
        return
      }

      setProfile(result.data.profile)
      setLodestoneLinked(true)
    } catch {
      setErrorMessage('ロードストーンAPIへの接続に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSelectionChange(jobId: string, selection: JobUserSelection) {
    setSelections((current) => ({
      ...current,
      [jobId]: selection,
    }))
  }

  return (
    <main className={`jobDisplayLab editMode jobDisplayLab--viewport-${viewportMode}`}>
      <header className="jobDisplayLabHeader">
        <h1>Job Display Lab (Phase 2 UI)</h1>
        <p>
          興味あること枠とジョブ表示の切替試作です。カード本体・保存・PNGとは未接続です。
        </p>
        <a className="jobDisplayLabBackLink" href="#">
          カード編集に戻る
        </a>
      </header>

      <section className="jobDisplayLabControls">
        <fieldset>
          <legend>左カラム表示</legend>
          <label>
            <input
              type="radio"
              name="panelMode"
              checked={panelMode === 'interests'}
              onChange={() => setPanelMode('interests')}
            />
            興味あること
          </label>
          <label>
            <input
              type="radio"
              name="panelMode"
              checked={panelMode === 'jobs'}
              onChange={() => setPanelMode('jobs')}
            />
            ジョブ表示
          </label>
        </fieldset>

        <fieldset>
          <legend>ビューポート</legend>
          <label>
            <input
              type="radio"
              name="viewportMode"
              checked={viewportMode === 'pc'}
              onChange={() => setViewportMode('pc')}
            />
            PC（プレビュー幅）
          </label>
          <label>
            <input
              type="radio"
              name="viewportMode"
              checked={viewportMode === 'mobile'}
              onChange={() => setViewportMode('mobile')}
            />
            スマホ（375px）
          </label>
        </fieldset>

        <fieldset>
          <legend>ロードストーン</legend>
          <label>
            <input
              type="checkbox"
              checked={lodestoneLinked}
              onChange={(event) => setLodestoneLinked(event.target.checked)}
            />
            連携データを反映
          </label>
          <button type="button" onClick={() => void loadLodestoneProfile()} disabled={isLoading}>
            {isLoading ? '取得中…' : `再取得 (${MASTER_CHARACTER_ID})`}
          </button>
        </fieldset>

        <button
          type="button"
          className="jobDisplayLabResetButton"
          onClick={() => setSelections({})}
        >
          ジョブ選択をリセット
        </button>
      </section>

      {errorMessage && (
        <p className="jobDisplayLabError" role="alert">
          {errorMessage}
        </p>
      )}

      <section className="jobDisplayLabStats" aria-live="polite">
        <p>
          ジョブ数: {DISPLAY_JOB_CATALOG.length} / ロードストーン Lv&gt;0: {leveledCount} / カンスト:{' '}
          {cappedCount} / 出せる: {playableCount} / メイン: {mainCount}
        </p>
        {profile && (
          <p>
            {profile.name} — {profile.world} [{profile.dataCenter}]
          </p>
        )}
      </section>

      <section className="jobDisplayLabLegend">
        <span className="jobDisplayLabLegendItem">
          <span className="jobDisplayLabSwatch jobDisplayLabSwatch--gray" /> グレー（未カンスト）
        </span>
        <span className="jobDisplayLabLegendItem">
          <span className="jobDisplayLabSwatch jobDisplayLabSwatch--faded" /> 薄色（LSカンスト）
        </span>
        <span className="jobDisplayLabLegendItem">
          <span className="jobDisplayLabSwatch jobDisplayLabSwatch--normal" /> 通常色（出せる）
        </span>
        <span className="jobDisplayLabLegendItem">
          <span className="jobDisplayLabSwatch jobDisplayLabSwatch--gold" /> 金枠（メイン）
        </span>
      </section>

      <div className="jobDisplayLabCardFrame">
        <section className="activityBox jobDisplayLabActivityBox">
          <div className={`activityColumn ${panelMode === 'interests' ? 'interestBox' : 'jobBox'}`}>
            {panelMode === 'interests' ? (
              <InterestPanelMock />
            ) : (
              <>
                <div className="jobBoxTitle">ジョブ</div>
                <JobIconGrid
                  roleGroups={jobRoleGroups}
                  lodestoneLinked={lodestoneLinked && profile != null}
                  interactive
                  showLabels
                  onSelectionChange={handleSelectionChange}
                />
              </>
            )}
          </div>

          <div className="activityColumn jobDisplayLabPlaceholderColumn" aria-hidden="true">
            <div className="sectionTitle">やりたいこと！</div>
            <p className="jobDisplayLabPlaceholderText">（試作では右2列はプレースホルダ）</p>
          </div>

          <div className="activityColumn jobDisplayLabPlaceholderColumn" aria-hidden="true">
            <div className="sectionTitle">手伝ってほしいこと！</div>
            <p className="jobDisplayLabPlaceholderText">（試作では右2列はプレースホルダ）</p>
          </div>
        </section>
      </div>
    </main>
  )
}
