import { isUnsupportedTargetItem } from '../../data/unsupportedTargetItem'
import {
  formatEquipJobsForDisplay,
  getEquipmentMetadataForSourceId,
} from '../../lib/equipment-metadata'
import type { AcquisitionRoute, ConditionStep, TargetItem } from '../../types/card'
import {
  deduplicateAcquisitionRoutes,
  formatConditionValue,
  formatFishingWeather,
  formatFolklore,
  formatIntuitionFish,
  getConditionLabel,
  getConditionStepText,
  getFishPlaceDisplay,
  getRouteCollapsibleConditionSteps,
  getRouteCollapsibleSpecialConditions,
  getRouteCurrencyEarnSteps,
  getRouteDisplayText,
  getRoutePrimaryContentLabel,
  getRouteRequiredCurrency,
  getSplitRouteDisplay,
  getStepLabel,
  hasRouteRequiredCurrency,
  isContentTranslationTarget,
  isFishTarget,
  ROUTE_PRIORITY_SPECIAL_CONDITION_KEYS,
  shouldShowRouteExtraConditions,
  translateContentName,
  translateFishTerm,
  usesSplitRouteDisplay,
} from './targetSearchHelpers'

function FishRouteDetails({ route }: { route: AcquisitionRoute }) {
  const conditions = route.specialConditions ?? {}
  const place = getFishPlaceDisplay(route)
  const time = formatConditionValue(conditions.time)
  const weather = formatFishingWeather(conditions.weather)
  const bait = translateFishTerm(conditions.bait)
  const mooch = translateFishTerm(conditions.mooch)
  const snagging = conditions.snagging === true
  const folklore = formatFolklore(conditions.folklore)
  const intuitionText = formatIntuitionFish(conditions.intuition)
  const stepText = getConditionStepText(route.conditionSteps)
  const conditionText = [
    mooch ? `泳がせ: ${mooch}` : '',
    snagging ? 'ひっかけ釣り' : '',
    folklore ? `伝承録: ${folklore}` : '',
    intuitionText ? `直感: ${intuitionText}` : '',
  ].filter(Boolean).join(' / ')

  return (
    <dl className="fishConditions">
      {place && (
        <div>
          <dt>場所</dt>
          <dd>{place}</dd>
        </div>
      )}
      {(time || weather) && (
        <div>
          <dt>条件</dt>
          <dd>{[time, weather].filter(Boolean).join(': ')}</dd>
        </div>
      )}
      {bait && (
        <div>
          <dt>餌</dt>
          <dd>{bait}</dd>
        </div>
      )}
      {conditionText && (
        <div>
          <dt>条件</dt>
          <dd>{conditionText}</dd>
        </div>
      )}
      {stepText && (
        <div>
          <dt>手順</dt>
          <dd>{stepText}</dd>
        </div>
      )}
    </dl>
  )
}

function RoutePriorityConditions({ route }: { route: AcquisitionRoute }) {
  const conditions = route.specialConditions ?? {}
  const entries = Object.entries(conditions)
    .filter(([key]) => (ROUTE_PRIORITY_SPECIAL_CONDITION_KEYS as readonly string[]).includes(key))
    .map(([key, value]) => {
      const formattedValue = formatConditionValue(value)

      return formattedValue ? (
        <div key={key}>
          <dt>{getConditionLabel(key)}</dt>
          <dd>{formattedValue}</dd>
        </div>
      ) : null
    })
    .filter(Boolean)

  if (entries.length === 0) {
    return null
  }

  return (
    <dl className="specialConditions">
      {entries}
    </dl>
  )
}

function RouteExtraConditions({ route }: { route: AcquisitionRoute }) {
  const collapsibleConditions = getRouteCollapsibleSpecialConditions(route)
  const collapsibleSteps = getRouteCollapsibleConditionSteps(route)

  if (!shouldShowRouteExtraConditions(route)) {
    return null
  }

  return (
    <details className="extraConditions">
      <summary>特殊条件あり</summary>

      {collapsibleConditions.length > 0 && (
        <dl className="specialConditions">
          {collapsibleConditions.map(([key, value]) => {
            const formattedValue = formatConditionValue(value)

            return formattedValue ? (
              <div key={key}>
                <dt>{getConditionLabel(key)}</dt>
                <dd>{formattedValue}</dd>
              </div>
            ) : null
          })}
        </dl>
      )}

      {collapsibleSteps.length > 0 && (
        <ol className="conditionSteps">
          {collapsibleSteps.map((step: ConditionStep, stepIndex: number) => (
            <li key={`${step.type}-${step.target}-${stepIndex}`}>
              {getStepLabel(step.type)}
              {step.target ? `: ${formatConditionValue(step.target)}` : ''}
              {step.count ? ` x${step.count}` : ''}
            </li>
          ))}
        </ol>
      )}
    </details>
  )
}

function AcquisitionRouteDetails({
  route,
  translateContent,
  showCurrencyEarn,
}: {
  route: AcquisitionRoute
  translateContent: boolean
  showCurrencyEarn: boolean
}) {
  const requiredCurrency = getRouteRequiredCurrency(route)
  const currencyEarnSteps = getRouteCurrencyEarnSteps(route)
  const splitDisplay = getSplitRouteDisplay(route, translateContent)

  if (requiredCurrency) {
    return (
      <>
        <div className="routeContentLine">{getRoutePrimaryContentLabel(route, translateContent)}</div>
        <div className={`routeRequiredCurrency${showCurrencyEarn ? '' : ' routeRequiredCurrency--preview'}`}>
          {showCurrencyEarn ? (
            <>
              <span className="routeRequiredCurrencyLabel">必要通貨:</span>
              <span className="routeRequiredCurrencyValue">{requiredCurrency}</span>
            </>
          ) : (
            <span className="routeRequiredCurrencyValue">{requiredCurrency}</span>
          )}
        </div>
        {showCurrencyEarn && currencyEarnSteps.length > 0 && (
          <dl className="routeCurrencyEarn">
            {currencyEarnSteps.map((step, stepIndex) => {
              const formattedTarget = step.target ? formatConditionValue(step.target) : ''

              return formattedTarget ? (
                <div key={`${step.type}-${step.target}-${stepIndex}`}>
                  <dt>{getStepLabel(step.type)}</dt>
                  <dd>{formattedTarget}</dd>
                </div>
              ) : null
            })}
          </dl>
        )}
        <RoutePriorityConditions route={route} />
        <RouteExtraConditions route={route} />
      </>
    )
  }

  if (splitDisplay) {
    return (
      <>
        <strong>{route.type}</strong>
        <div className="routeContentLine">
          入手経路: {splitDisplay.contentName}
        </div>
        <div className="routeDetailLine">
          詳細: {splitDisplay.detail}
        </div>
        <RoutePriorityConditions route={route} />
        <RouteExtraConditions route={route} />
      </>
    )
  }

  return (
    <>
      <strong>{route.type}</strong>
      <span>{getRouteDisplayText(route, { translateContent })}</span>
      <RoutePriorityConditions route={route} />
      <RouteExtraConditions route={route} />
    </>
  )
}

export function TargetDetails({
  target,
  isCompact = false,
  showEquipmentMetadata = false,
  showCurrencyEarn = false,
}: {
  target: TargetItem
  isCompact?: boolean
  showEquipmentMetadata?: boolean
  showCurrencyEarn?: boolean
}) {
  if (isUnsupportedTargetItem(target)) {
    return null
  }

  const routes = deduplicateAcquisitionRoutes(target.acquisitionRoutes ?? [])
  const isFish = isFishTarget(target)
  const translateContent = isContentTranslationTarget(target)
  const hasSplitRoute = routes.some((route) => usesSplitRouteDisplay(route))
  const equipmentMetadata = showEquipmentMetadata
    ? getEquipmentMetadataForSourceId(target.sourceDictionaryId)
    : null
  const equipJobsDisplay = equipmentMetadata ? formatEquipJobsForDisplay(equipmentMetadata.equipJobs) : ''

  return (
    <div className={`targetDetails ${isCompact ? 'compact' : ''}`}>
      {showEquipmentMetadata && equipmentMetadata && (
        <dl className="equipmentMetadata">
          <div>
            <dt>装備可能Lv</dt>
            <dd>{equipmentMetadata.equipLevel}</dd>
          </div>
          <div>
            <dt>IL</dt>
            <dd>{equipmentMetadata.itemLevel}</dd>
          </div>
          <div>
            <dt>装備ロール</dt>
            <dd>{equipmentMetadata.equipRole}</dd>
          </div>
          {equipmentMetadata.equipSlot && (
            <div>
              <dt>部位</dt>
              <dd>{equipmentMetadata.equipSlot}</dd>
            </div>
          )}
          {equipJobsDisplay && (
            <div>
              <dt>装備可能ジョブ</dt>
              <dd>{equipJobsDisplay}</dd>
            </div>
          )}
        </dl>
      )}

      {!isFish && target.contentName && !hasSplitRoute && !routes.some((route) => hasRouteRequiredCurrency(route)) && (
        <div className="targetContentName">入手経路: {translateContentName(target.contentName, translateContent)}</div>
      )}

      {routes.length > 0 && (
        <div className="routeList">
          {routes.map((route, routeIndex) => (
            <div className="routeItem" key={route.routeId ?? `${route.type}-${routeIndex}`}>
              {isFish ? (
                <FishRouteDetails route={route} />
              ) : (
                <AcquisitionRouteDetails
                  route={route}
                  translateContent={translateContent}
                  showCurrencyEarn={showCurrencyEarn}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
