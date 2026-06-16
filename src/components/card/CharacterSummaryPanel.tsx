import type { CSSProperties } from 'react'
import type { PlayTime, VoiceChat } from '../../types/card'
import { formatHour, formatTimeRange, handleIconError } from '../../utils/cardDisplayUtils'
import { PlayTimeMeter } from './PlayTimeMeter'

type DataCenter = 'Elemental' | 'Gaia' | 'Mana' | 'Meteor'

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
}: CharacterSummaryPanelProps) {
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
    </section>
  )
}
