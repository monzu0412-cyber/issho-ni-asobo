import { useMemo, useState, type CSSProperties } from 'react'
import type { PlayTime, VoiceChat } from '../../types/card'
import {
  previewLodestoneApply,
  type DataCenter,
} from '../../lib/lodestone/applyLodestoneProfileToCharacter'
import type { LodestoneCharacterProfile } from '../../types/lodestone'
import { formatHour, formatTimeRange, handleIconError } from '../../utils/cardDisplayUtils'
import { PlayTimeMeter } from './PlayTimeMeter'

const FIELD_LABELS = {
  name: '名前',
  dc: 'DC',
  world: 'World',
} as const

type CharacterSummaryPanelProps = {
  name: string
  dc: DataCenter
  world: string
  roles: {
    tank: boolean
    healer: boolean
    dps: boolean
  }
  playTime: PlayTime
  vc: VoiceChat
  sectionBackgroundStyle: CSSProperties
  dataCenters: DataCenter[]
  worldsByDc: Record<DataCenter, readonly string[]>
  voiceChatOptions: readonly VoiceChat[]
  timeOptions: number[]
  updateCharacterName: (value: string) => void
  updateDataCenter: (dc: DataCenter) => void
  updateWorld: (world: string) => void
  updateRole: (role: 'tank' | 'healer' | 'dps', active: boolean) => void
  updatePlayTime: (day: 'weekday' | 'holiday', field: 'start' | 'end', value: number) => void
  updateVoiceChat: (vc: VoiceChat) => void
  lodestoneInput: string
  lodestoneFetchError: string | null
  lodestoneApplyMessage: string | null
  lodestoneApplyError: string | null
  isLodestoneFetching: boolean
  lodestoneProfile: LodestoneCharacterProfile | null
  updateLodestoneInput: (value: string) => void
  fetchLodestoneProfile: () => void
  refetchLodestoneProfile: () => void
  savedLodestoneCharacterId: string | null
  applyLodestoneProfileToCard: (overwrite: boolean) => void
}

export function CharacterSummaryPanel({
  name,
  dc,
  world,
  roles,
  playTime,
  vc,
  sectionBackgroundStyle,
  dataCenters,
  worldsByDc,
  voiceChatOptions,
  timeOptions,
  updateCharacterName,
  updateDataCenter,
  updateWorld,
  updateRole,
  updatePlayTime,
  updateVoiceChat,
  lodestoneInput,
  lodestoneFetchError,
  lodestoneApplyMessage,
  lodestoneApplyError,
  isLodestoneFetching,
  lodestoneProfile,
  updateLodestoneInput,
  fetchLodestoneProfile,
  refetchLodestoneProfile,
  savedLodestoneCharacterId,
  applyLodestoneProfileToCard,
}: CharacterSummaryPanelProps) {
  const [applyOverwrite, setApplyOverwrite] = useState(false)

  const applyPreview = useMemo(() => {
    if (!lodestoneProfile) {
      return null
    }

    return previewLodestoneApply(
      { name, dc, world },
      lodestoneProfile,
      worldsByDc,
      dataCenters,
      { overwrite: applyOverwrite },
    )
  }, [applyOverwrite, dataCenters, dc, lodestoneProfile, name, world, worldsByDc])

  const cappedJobCount = lodestoneProfile?.jobs.filter((job) => job.isCapped).length ?? 0

  return (
    <section
      className="infoBox characterSummary"
      style={sectionBackgroundStyle}
    >
      <h2>キャラクター情報</h2>
      <p><span>名前</span> {name}</p>
      <p><span>DC</span> {dc}</p>
      <p><span>World</span> {world}</p>

      <div className="summaryGroup">
        <h3>ロール</h3>
        <div className="roleList">
          <button
            className={`roleIcon tank ${roles.tank ? 'active' : 'inactive'}`}
            type="button"
            aria-pressed={roles.tank}
            onClick={() => updateRole('tank', !roles.tank)}
          >
            <img
              src="/icons/roles/tank.png"
              alt="タンク"
              onError={(event) => handleIconError(event, '/icons/roles/tank.png')}
            />
          </button>

          <button
            className={`roleIcon healer ${roles.healer ? 'active' : 'inactive'}`}
            type="button"
            aria-pressed={roles.healer}
            onClick={() => updateRole('healer', !roles.healer)}
          >
            <img
              src="/icons/roles/healer.png"
              alt="ヒーラー"
              onError={(event) => handleIconError(event, '/icons/roles/healer.png')}
            />
          </button>

          <button
            className={`roleIcon dps ${roles.dps ? 'active' : 'inactive'}`}
            type="button"
            aria-pressed={roles.dps}
            onClick={() => updateRole('dps', !roles.dps)}
          >
            <img
              src="/icons/roles/dps.png"
              alt="DPS"
              onError={(event) => handleIconError(event, '/icons/roles/dps.png')}
            />
          </button>
        </div>
      </div>

      <div className="summaryGroup">
        <h3>活動時間</h3>
        <p className="playTimeText">平日 {formatTimeRange(playTime.weekday)}</p>
        <p className="playTimeText">休日 {formatTimeRange(playTime.holiday)}</p>

        <div className="playTimePreview">
          <PlayTimeMeter label="平日" range={playTime.weekday} />
          <PlayTimeMeter label="休日" range={playTime.holiday} />
        </div>
      </div>

      <div
        className={`summaryGroup vcSummary${vc === '未設定' ? ' vcSummary--unset' : ''}`}
        aria-hidden={vc === '未設定'}
      >
        <h3>VC</h3>
        <div className="vcBadge">{vc}</div>
      </div>

      <div className="editForm">
        <label>
          名前
          <input
            type="text"
            value={name}
            onChange={(event) => updateCharacterName(event.target.value)}
          />
        </label>

        <label>
          DC
          <select
            value={dc}
            onChange={(event) => updateDataCenter(event.target.value as DataCenter)}
          >
            {dataCenters.map((dataCenter) => (
              <option key={dataCenter} value={dataCenter}>{dataCenter}</option>
            ))}
          </select>
        </label>

        <label>
          World
          <select
            value={world}
            onChange={(event) => updateWorld(event.target.value)}
          >
            {worldsByDc[dc].map((worldOption) => (
              <option key={worldOption} value={worldOption}>{worldOption}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="editForm">
        <div className="timeSelectGroup">
          <span>平日</span>
          <label>
            開始
            <select
              value={playTime.weekday.start}
              onChange={(event) => updatePlayTime('weekday', 'start', Number(event.target.value))}
            >
              {timeOptions.map((hour) => (
                <option key={hour} value={hour}>{formatHour(hour)}</option>
              ))}
            </select>
          </label>
          <label>
            終了
            <select
              value={playTime.weekday.end}
              onChange={(event) => updatePlayTime('weekday', 'end', Number(event.target.value))}
            >
              {timeOptions.map((hour) => (
                <option key={hour} value={hour}>{formatHour(hour)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="timeSelectGroup">
          <span>休日</span>
          <label>
            開始
            <select
              value={playTime.holiday.start}
              onChange={(event) => updatePlayTime('holiday', 'start', Number(event.target.value))}
            >
              {timeOptions.map((hour) => (
                <option key={hour} value={hour}>{formatHour(hour)}</option>
              ))}
            </select>
          </label>
          <label>
            終了
            <select
              value={playTime.holiday.end}
              onChange={(event) => updatePlayTime('holiday', 'end', Number(event.target.value))}
            >
              {timeOptions.map((hour) => (
                <option key={hour} value={hour}>{formatHour(hour)}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="editForm">
        <label>
          VC
          <select
            value={vc}
            onChange={(event) => updateVoiceChat(event.target.value as VoiceChat)}
          >
            {voiceChatOptions.map((voiceChatOption) => (
              <option key={voiceChatOption} value={voiceChatOption}>{voiceChatOption}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="editForm lodestoneEditForm">
        <label>
          ロードストーン キャラクターID / URL
          <input
            type="text"
            value={lodestoneInput}
            placeholder="例：12345678 または Lodestone URL"
            onChange={(event) => updateLodestoneInput(event.target.value)}
          />
        </label>
        <button
          className="lodestoneFetchButton"
          type="button"
          onClick={fetchLodestoneProfile}
          disabled={isLodestoneFetching}
        >
          {isLodestoneFetching ? '取得中…' : 'ロードストーン取得'}
        </button>
        {savedLodestoneCharacterId && (
          <div className="lodestoneRefetchRow">
            <p className="lodestoneSavedId">保存済み ID: {savedLodestoneCharacterId}</p>
            <button
              className="lodestoneRefetchButton"
              type="button"
              onClick={refetchLodestoneProfile}
              disabled={isLodestoneFetching}
            >
              {isLodestoneFetching ? '取得中…' : '再取得'}
            </button>
          </div>
        )}
        {lodestoneFetchError && (
          <p className="lodestoneFetchError" role="alert">{lodestoneFetchError}</p>
        )}
        {lodestoneProfile && (
          <div className="lodestoneApplyPanel">
            <p className="lodestoneFetchSuccess">
              取得済み: {lodestoneProfile.name} / {lodestoneProfile.dataCenter ?? '—'} / {lodestoneProfile.world}
              {cappedJobCount > 0 && `（カンスト ${cappedJobCount} ジョブ）`}
            </p>
            {applyPreview && (
              <ul className="lodestoneApplyPreviewList">
                {applyPreview.fields.map((field) => (
                  <li
                    key={field.field}
                    className={`lodestoneApplyPreviewItem lodestoneApplyPreviewItem--${field.mode}`}
                  >
                    <span>{FIELD_LABELS[field.field]}</span>
                    <span>{field.current}</span>
                    <span aria-hidden="true">→</span>
                    <span>{field.next}</span>
                    <span className="lodestoneApplyPreviewStatus">
                      {field.mode === 'apply' && '反映'}
                      {field.mode === 'skip' && '変更なし'}
                      {field.mode === 'conflict' && '上書き要'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <label className="lodestoneApplyOverwrite">
              <input
                type="checkbox"
                checked={applyOverwrite}
                onChange={(event) => setApplyOverwrite(event.target.checked)}
              />
              入力済みの名前・DC・Worldも上書きする
            </label>
            <button
              className="lodestoneApplyButton"
              type="button"
              onClick={() => applyLodestoneProfileToCard(applyOverwrite)}
              disabled={!applyPreview?.canApply}
            >
              カードへ反映
            </button>
            {applyPreview?.hasConflicts && !applyOverwrite && (
              <p className="lodestoneApplyHint">
                入力済みの項目があります。上書きする場合はチェックを入れてください。
              </p>
            )}
          </div>
        )}
        {lodestoneApplyError && (
          <p className="lodestoneFetchError" role="alert">{lodestoneApplyError}</p>
        )}
        {lodestoneApplyMessage && (
          <p className="lodestoneApplySuccess">{lodestoneApplyMessage}</p>
        )}
      </div>
    </section>
  )
}
