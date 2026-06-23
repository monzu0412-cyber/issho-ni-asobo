import { useState } from 'react'
import { fetchLodestoneCharacterProfile, normalizeLodestoneInput } from '../../lib/lodestone/fetchLodestoneCharacter'
import type { LodestoneCharacterProfile } from '../../types/lodestone'
import './LodestoneLab.css'

export const LODESTONE_LAB_PAGE_HASH = '#/lodestone-lab'

export function LodestoneLab() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [profile, setProfile] = useState<LodestoneCharacterProfile | null>(null)
  const [cached, setCached] = useState(false)

  async function handleFetch() {
    const characterId = normalizeLodestoneInput(input)

    setErrorMessage(null)
    setErrorStatus(null)
    setProfile(null)
    setCached(false)

    if (!characterId) {
      setErrorStatus(400)
      setErrorMessage('キャラクターIDまたはロードストーンURLを入力してください。')
      return
    }

    setIsLoading(true)

    try {
      const result = await fetchLodestoneCharacterProfile(characterId)

      if (!result.ok) {
        setErrorStatus(result.status)
        setErrorMessage(result.error.message)
        return
      }

      setProfile(result.data.profile)
      setCached(result.data.cached)
    } catch {
      setErrorStatus(503)
      setErrorMessage('ロードストーンAPIへの接続に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const cappedJobs = profile?.jobs.filter((job) => job.isCapped) ?? []
  const leveledJobs = profile?.jobs.filter((job) => job.level > 0) ?? []

  return (
    <main className="lodestoneLab">
      <header className="lodestoneLabHeader">
        <h1>Lodestone Lab (Phase 1b)</h1>
        <p>ロードストーン取得の技術検証用画面です。カード本体とは未接続です。</p>
        <a className="lodestoneLabBackLink" href="#">カード編集に戻る</a>
      </header>

      <section className="lodestoneLabPanel">
        <label className="lodestoneLabField">
          キャラクターID / URL
          <input
            type="text"
            value={input}
            placeholder="12345678 または https://jp.finalfantasyxiv.com/lodestone/character/12345678/"
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <button
          className="lodestoneLabFetchButton"
          type="button"
          onClick={() => void handleFetch()}
          disabled={isLoading}
        >
          {isLoading ? '取得中…' : '取得'}
        </button>
      </section>

      {errorMessage && (
        <section className="lodestoneLabResult lodestoneLabResult--error" role="alert">
          <h2>取得失敗</h2>
          {errorStatus != null && <p>HTTP {errorStatus}</p>}
          <p>{errorMessage}</p>
        </section>
      )}

      {profile && (
        <section className="lodestoneLabResult lodestoneLabResult--success">
          <h2>取得成功{cached ? '（キャッシュ）' : ''}</h2>
          <dl className="lodestoneLabSummary">
            <div>
              <dt>キャラクターID</dt>
              <dd>{profile.characterId}</dd>
            </div>
            <div>
              <dt>キャラクター名</dt>
              <dd>{profile.name}</dd>
            </div>
            <div>
              <dt>World</dt>
              <dd>{profile.world}</dd>
            </div>
            <div>
              <dt>DC</dt>
              <dd>{profile.dataCenter ?? '—'}</dd>
            </div>
          </dl>

          <h3>カンストジョブ一覧 ({cappedJobs.length})</h3>
          {cappedJobs.length > 0 ? (
            <ul className="lodestoneLabJobList">
              {cappedJobs.map((job) => (
                <li key={`${job.jobId}-${job.jobName}`}>
                  {job.jobName} ({job.jobId}) — Lv{job.level}
                </li>
              ))}
            </ul>
          ) : (
            <p className="lodestoneLabEmpty">カンストジョブはありません。</p>
          )}

          <h3>ジョブ一覧（Lv &gt; 0: {leveledJobs.length} / 全 {profile.jobs.length}）</h3>
          <ul className="lodestoneLabJobList lodestoneLabJobList--compact">
            {profile.jobs.map((job) => (
              <li key={`${job.jobId}-${job.jobName}`}>
                {job.jobName} ({job.jobId}) — Lv{job.level || '—'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
