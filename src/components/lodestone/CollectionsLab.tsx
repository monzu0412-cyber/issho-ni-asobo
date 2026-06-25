import { useMemo, useState } from 'react'
import { fetchLodestoneCollections } from '../../lib/lodestone/fetchLodestoneCollections'
import { normalizeLodestoneInput } from '../../lib/lodestone/fetchLodestoneCharacter'
import {
  addWantedCandidate,
  buildWantedCandidateFromMissing,
  COLLECTION_CATEGORY_TO_WANTED,
  getWantedCandidateKey,
  isWantedCandidateSelected,
  removeWantedCandidate,
} from '../../lib/lodestone/wantedCandidateFromCollection'
import { applyWantedCandidateToMainWant } from '../../lib/wanted/applyWantedCandidateToMainWant'
import { buildCollectionOwnershipIndex } from '../../lib/lodestone/collectionOwnershipIndex'
import type { LodestoneCollectionCategoryKey, LodestoneCollectionCategoryStatus, LodestoneCollectionsResult } from '../../types/lodestoneCollections'
import type { LodestoneCollectionMissingEntry, LodestoneCollectionOwnershipResult } from '../../types/lodestoneCollection'
import type { TargetItem } from '../../types/card'
import type { WantedCandidateFromCollection } from '../../types/wantedCandidateFromCollection'
import { WANTED_COLLECTION_CATEGORY_LABELS } from '../../types/wantedCandidateFromCollection'
import { AppliedWantPreview } from './AppliedWantPreview'
import { CollectionsLabForwardSearchPanel } from './CollectionsLabForwardSearchPanel'
import { CollectionItemIcon } from './CollectionItemIcon'
import './CollectionsLab.css'
import '../../App.css'

export const COLLECTIONS_LAB_PAGE_HASH = '#/collections-lab'

const CATEGORY_TABS: Array<{ key: LodestoneCollectionCategoryKey; label: string }> = [
  { key: 'minions', label: 'ミニオン' },
  { key: 'mounts', label: 'マウント' },
  { key: 'emotes', label: 'エモート' },
  { key: 'faceAccessories', label: 'フェイスアクセサリー' },
]

const STATUS_LABELS: Record<LodestoneCollectionCategoryStatus, string> = {
  ok: 'ok',
  partial: 'partial',
  failed: 'failed',
  not_found: 'not_found',
}

function formatStatusLabel(status: LodestoneCollectionCategoryStatus) {
  return STATUS_LABELS[status]
}

function getOwnership(
  collections: LodestoneCollectionsResult['collections'],
  key: LodestoneCollectionCategoryKey,
): LodestoneCollectionOwnershipResult | null {
  return collections[key] ?? null
}

export function CollectionsLab() {
  const [input, setInput] = useState('60814884')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [collectionsResult, setCollectionsResult] = useState<LodestoneCollectionsResult | null>(null)
  const [cached, setCached] = useState(false)
  const [activeTab, setActiveTab] = useState<LodestoneCollectionCategoryKey>('minions')
  const [wantedCandidates, setWantedCandidates] = useState<WantedCandidateFromCollection[]>([])
  const [appliedTarget, setAppliedTarget] = useState<TargetItem | null>(null)
  const [appliedResolutionLabel, setAppliedResolutionLabel] = useState<string | null>(null)
  const [appliedNote, setAppliedNote] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const ownershipIndex = useMemo(
    () => (collectionsResult ? buildCollectionOwnershipIndex(collectionsResult) : null),
    [collectionsResult],
  )

  const activeCategoryOwnership = useMemo(
    () => ownershipIndex?.categories[activeTab] ?? null,
    [ownershipIndex, activeTab],
  )

  const activeCategorySummary = useMemo(
    () => collectionsResult?.summary.categories.find((category) => category.key === activeTab) ?? null,
    [collectionsResult, activeTab],
  )

  const activeOwnership = useMemo(
    () => (collectionsResult ? getOwnership(collectionsResult.collections, activeTab) : null),
    [collectionsResult, activeTab],
  )

  async function handleFetch() {
    const characterId = normalizeLodestoneInput(input)

    setErrorMessage(null)
    setErrorStatus(null)
    setCollectionsResult(null)
    setCached(false)
    setWantedCandidates([])
    setAppliedTarget(null)
    setAppliedResolutionLabel(null)
    setAppliedNote(null)
    setApplyError(null)

    if (!characterId) {
      setErrorStatus(400)
      setErrorMessage('キャラクターIDまたはロードストーンURLを入力してください。')
      return
    }

    setIsLoading(true)

    try {
      const result = await fetchLodestoneCollections(characterId)

      if (!result.ok) {
        setErrorStatus(result.status)
        setErrorMessage(result.error.message)
        return
      }

      setCollectionsResult(result.data.result)
      setCached(result.data.cached)
    } catch {
      setErrorStatus(503)
      setErrorMessage('コレクションAPIへの接続に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddCandidate(entry: LodestoneCollectionMissingEntry) {
    const candidate = buildWantedCandidateFromMissing(COLLECTION_CATEGORY_TO_WANTED[activeTab], entry)
    setWantedCandidates((current) => addWantedCandidate(current, candidate))
  }

  function handleRemoveCandidate(candidate: WantedCandidateFromCollection) {
    setWantedCandidates((current) => removeWantedCandidate(current, candidate))
  }

  function handleApplyCandidate(candidate: WantedCandidateFromCollection) {
    const result = applyWantedCandidateToMainWant(candidate)

    if (!result.ok) {
      setApplyError(result.reason)
      return
    }

    setApplyError(null)
    setAppliedTarget(result.target)
    setAppliedResolutionLabel(
      result.resolution === 'search_dictionary'
        ? 'カードのほしいもの１位に反映しました（search_dictionary 経由）。'
        : 'カードのほしいもの１位に反映しました（フォールバック表示）。',
    )
    setAppliedNote(result.note ?? null)
  }

  return (
    <main className="collectionsLab">
      <header className="collectionsLabHeader">
        <h1>Collections Lab (Phase 7)</h1>
        <p>ロードストーン未所持一覧からほしいもの候補を追加し、順引き検索に未所持フィルターをかけて検証できます。</p>
        <p className="collectionsLabGuide">
          手順: <strong>コレクション取得</strong> → カテゴリタブ選択 → <strong>順引き検索 + 未所持フィルター検証</strong>
        </p>
        <a className="collectionsLabBackLink" href="#">
          カード編集で確認
        </a>
      </header>

      <section className="collectionsLabPanel">
        <label className="collectionsLabField">
          キャラクターID / URL
          <input
            type="text"
            value={input}
            placeholder="60814884 または https://jp.finalfantasyxiv.com/lodestone/character/60814884/"
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <button
          className="collectionsLabFetchButton"
          type="button"
          onClick={() => void handleFetch()}
          disabled={isLoading}
        >
          {isLoading ? '取得中…' : 'コレクション取得'}
        </button>
      </section>

      {!collectionsResult && !isLoading && !errorMessage && (
        <section className="collectionsLabGuidePanel" aria-live="polite">
          <h2>Phase 7 検証パネルの見方</h2>
          <ol>
            <li>上の「コレクション取得」を押す（初回は十数秒）</li>
            <li>取得成功後、ミニオン / マウント等のタブを選ぶ</li>
            <li>「順引き検索 + 未所持フィルター検証」で <strong>未所持のみ表示</strong> を ON/OFF</li>
          </ol>
        </section>
      )}

      {isLoading && (
        <section className="collectionsLabLoading" aria-live="polite">
          <p>取得中… 初回は十数秒かかる場合があります。</p>
        </section>
      )}

      {errorMessage && !isLoading && (
        <section className="collectionsLabResult collectionsLabResult--error" role="alert">
          <h2>取得失敗</h2>
          {errorStatus != null && <p>HTTP {errorStatus}</p>}
          <p>{errorMessage}</p>
        </section>
      )}

      {collectionsResult && !isLoading && (
        <section className="collectionsLabResult collectionsLabResult--success">
          <h2>
            取得成功
            {cached ? '（キャッシュ）' : ''}
          </h2>
          <p className="collectionsLabMeta">
            キャラクターID: {collectionsResult.characterId} / 取得時刻: {collectionsResult.generatedAt}
          </p>

          <h3>サマリー</h3>
          <ul className="collectionsLabSummaryList">
            {collectionsResult.summary.categories.map((category) => (
              <li key={category.key} className={`collectionsLabSummaryItem collectionsLabSummaryItem--${category.status}`}>
                <span className="collectionsLabSummaryLabel">{category.label}</span>
                <span className="collectionsLabSummaryCounts">
                  所持{category.owned} / 未所持{category.missing} / 未照合{category.unmatched}
                </span>
                <span className={`collectionsLabStatus collectionsLabStatus--${category.status}`}>
                  {formatStatusLabel(category.status)}
                </span>
                {category.error && (
                  <span className="collectionsLabSummaryError">{category.error}</span>
                )}
              </li>
            ))}
          </ul>

          <dl className="collectionsLabTotals">
            <div>
              <dt>合計 所持</dt>
              <dd>{collectionsResult.summary.totalOwned}</dd>
            </div>
            <div>
              <dt>合計 未所持</dt>
              <dd>{collectionsResult.summary.totalMissing}</dd>
            </div>
            <div>
              <dt>合計 未照合</dt>
              <dd>{collectionsResult.summary.totalUnmatched}</dd>
            </div>
          </dl>

          <div className="collectionsLabTabs" role="tablist" aria-label="コレクションカテゴリ">
            {CATEGORY_TABS.map((tab) => {
              const summary = collectionsResult.summary.categories.find((category) => category.key === tab.key)
              const isActive = activeTab === tab.key

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`collectionsLabTab${isActive ? ' collectionsLabTab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {summary && (
                    <span className={`collectionsLabTabStatus collectionsLabStatus--${summary.status}`}>
                      {formatStatusLabel(summary.status)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <section className="collectionsLabCategoryPanel" role="tabpanel" id="collections-lab-forward-search">
            {activeCategorySummary && (
              <div className="collectionsLabCategoryHeader">
                <h3>{activeCategorySummary.label}</h3>
                <p>
                  所持 {activeCategorySummary.owned} / 未所持 {activeCategorySummary.missing} / 未照合{' '}
                  {activeCategorySummary.unmatched}
                  {activeCategorySummary.totalOnLodestone != null && (
                    <> / Lodestone TOTAL {activeCategorySummary.totalOnLodestone}</>
                  )}
                </p>
                <p>
                  status:{' '}
                  <span className={`collectionsLabStatus collectionsLabStatus--${activeCategorySummary.status}`}>
                    {formatStatusLabel(activeCategorySummary.status)}
                  </span>
                </p>
              </div>
            )}

            {activeCategorySummary?.status === 'failed' && (
              <p className="collectionsLabCategoryMessage collectionsLabCategoryMessage--error" role="alert">
                このカテゴリは取得に失敗しました。
                {activeCategorySummary.error ? ` ${activeCategorySummary.error}` : ''}
              </p>
            )}

            {activeCategorySummary?.status === 'not_found' && (
              <p className="collectionsLabCategoryMessage collectionsLabCategoryMessage--warning" role="alert">
                このカテゴリのページが見つかりませんでした（非公開または未開放の可能性があります）。
                {activeCategorySummary.error ? ` ${activeCategorySummary.error}` : ''}
              </p>
            )}

            {activeCategorySummary?.status === 'partial' && activeTab === 'emotes' && (
              <p className="collectionsLabCategoryMessage collectionsLabCategoryMessage--info">
                未照合には初期/標準エモート等の可能性があります。
              </p>
            )}

            {activeOwnership && ownershipIndex ? (
              <>
                <CollectionsLabForwardSearchPanel
                  categoryKey={activeTab}
                  ownershipIndex={ownershipIndex}
                  categoryOwnership={activeCategoryOwnership}
                />

                <h4>未所持一覧 ({activeOwnership.missing.length})</h4>
                {activeOwnership.missing.length > 0 ? (
                  <ul className="collectionsLabItemList">
                    {activeOwnership.missing.map((entry) => {
                      const candidate = buildWantedCandidateFromMissing(
                        COLLECTION_CATEGORY_TO_WANTED[activeTab],
                        entry,
                      )
                      const isSelected = isWantedCandidateSelected(wantedCandidates, candidate)

                      return (
                        <li key={`${entry.sourceDictionaryId ?? 'missing'}-${entry.name}`}>
                          <div className="collectionsLabItemRow">
                            <CollectionItemIcon
                              itemId={entry.itemId}
                              sourceDictionaryId={entry.sourceDictionaryId}
                            />
                            <div className="collectionsLabItemContent">
                              <span className="collectionsLabItemName">{entry.name}</span>
                              <span className="collectionsLabItemMeta">
                                itemId: {entry.itemId ?? '—'} / sourceDictionaryId: {entry.sourceDictionaryId ?? '—'}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="collectionsLabCandidateAddButton"
                              disabled={isSelected}
                              onClick={() => handleAddCandidate(entry)}
                            >
                              {isSelected ? '候補済み' : '候補追加'}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="collectionsLabEmpty">未所持はありません。</p>
                )}

                <h4>未照合一覧 ({activeOwnership.unmatchedOwned.length})</h4>
                {activeOwnership.unmatchedOwned.length > 0 ? (
                  <>
                    {activeTab === 'emotes' && (
                      <p className="collectionsLabCategoryMessage collectionsLabCategoryMessage--info">
                        未照合 = 初期/標準エモート等の可能性があります。
                      </p>
                    )}
                    <ul className="collectionsLabItemList">
                      {activeOwnership.unmatchedOwned.map((entry) => (
                        <li key={`${entry.lodestoneName}-${entry.reason}-${entry.tooltipHref ?? ''}`}>
                          <span className="collectionsLabItemName">{entry.lodestoneName || '（名前未取得）'}</span>
                          <span className="collectionsLabItemMeta">
                            reason: {entry.reason}
                            {entry.tooltipHref ? ` / tooltip: ${entry.tooltipHref}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="collectionsLabEmpty">未照合はありません。</p>
                )}
              </>
            ) : (
              activeCategorySummary
              && (activeCategorySummary.status === 'failed' || activeCategorySummary.status === 'not_found') && (
                <p className="collectionsLabEmpty">このカテゴリの詳細データは取得できませんでした。</p>
              )
            )}
          </section>

          <section className="collectionsLabCandidates">
            <h3>ほしいもの候補 ({wantedCandidates.length})</h3>
            {applyError && (
              <p className="collectionsLabCategoryMessage collectionsLabCategoryMessage--error" role="alert">
                {applyError}
              </p>
            )}
            {wantedCandidates.length > 0 ? (
              <ul className="collectionsLabCandidateList">
                {wantedCandidates.map((candidate) => (
                  <li key={getWantedCandidateKey(candidate)}>
                    <div className="collectionsLabCandidateMain">
                      <CollectionItemIcon
                        itemId={candidate.itemId}
                        sourceDictionaryId={candidate.sourceDictionaryId}
                      />
                      <span className="collectionsLabCandidateCategory">
                        {WANTED_COLLECTION_CATEGORY_LABELS[candidate.collectionCategory]}
                      </span>
                      <span className="collectionsLabCandidateName">{candidate.displayName}</span>
                      <span className="collectionsLabCandidateMeta">
                        itemId: {candidate.itemId ?? '—'} / sourceDictionaryId: {candidate.sourceDictionaryId ?? '—'}
                      </span>
                    </div>
                    <div className="collectionsLabCandidateActions">
                      <button
                        type="button"
                        className="collectionsLabCandidateApplyButton"
                        onClick={() => handleApplyCandidate(candidate)}
                      >
                        ほしいものに設定
                      </button>
                      <button
                        type="button"
                        className="collectionsLabCandidateRemoveButton"
                        onClick={() => handleRemoveCandidate(candidate)}
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="collectionsLabEmpty">未所持一覧から「候補追加」するとここに表示されます。</p>
            )}
          </section>

          {appliedTarget && appliedResolutionLabel && (
            <AppliedWantPreview
              target={appliedTarget}
              resolutionLabel={appliedResolutionLabel}
              note={appliedNote ?? undefined}
            />
          )}
        </section>
      )}
    </main>
  )
}
