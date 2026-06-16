import { isUnsupportedTargetItem } from '../../data/unsupportedTargetItem'
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
  getRouteDisplayText,
  getSplitRouteDisplay,
  getStepLabel,
  isContentTranslationTarget,
  isFishTarget,
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

export function TargetDetails({ target, isCompact = false }: { target: TargetItem; isCompact?: boolean }) {
  if (isUnsupportedTargetItem(target)) {
    return null
  }

  const routes = deduplicateAcquisitionRoutes(target.acquisitionRoutes ?? [])
  const priorityConditionKeys = ['area', 'location', 'weather', 'time']
  const isFish = isFishTarget(target)
  const translateContent = isContentTranslationTarget(target)
  const hasSplitRoute = routes.some((route) => usesSplitRouteDisplay(route))

  return (
    <div className={`targetDetails ${isCompact ? 'compact' : ''}`}>
      {!isFish && target.contentName && !hasSplitRoute && (
        <div className="targetContentName">入手経路: {translateContentName(target.contentName, translateContent)}</div>
      )}

      {routes.length > 0 && (
        <div className="routeList">
          {routes.map((route, routeIndex) => {
            const splitDisplay = isFish ? null : getSplitRouteDisplay(route, translateContent)

            return (
            <div className="routeItem" key={route.routeId ?? `${route.type}-${routeIndex}`}>
              {isFish ? (
                <FishRouteDetails route={route} />
              ) : splitDisplay ? (
                <>
                  <strong>{route.type}</strong>
                  <div className="routeContentLine">
                    入手経路: {splitDisplay.contentName}
                  </div>
                  <div className="routeDetailLine">
                    詳細: {splitDisplay.detail}
                  </div>
                </>
              ) : (
                <>
                  <strong>{route.type}</strong>
                  <span>{getRouteDisplayText(route, { translateContent })}</span>
                </>
              )}

              {!isFish && route.specialConditions && Object.keys(route.specialConditions).length > 0 && (
                <dl className="specialConditions">
                  {Object.entries(route.specialConditions)
                    .filter(([key]) => priorityConditionKeys.includes(key))
                    .map(([key, value]) => {
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

              {!isFish && (
                (route.specialConditions && Object.keys(route.specialConditions).some((key) => !priorityConditionKeys.includes(key))) ||
                (route.conditionSteps && route.conditionSteps.length > 0)
              ) && (
                <details className="extraConditions">
                  <summary>特殊条件あり</summary>

                  {route.specialConditions && (
                    <dl className="specialConditions">
                      {Object.entries(route.specialConditions)
                        .filter(([key]) => !priorityConditionKeys.includes(key))
                        .map(([key, value]) => {
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

                  {route.conditionSteps && route.conditionSteps.length > 0 && (
                    <ol className="conditionSteps">
                      {route.conditionSteps.map((step: ConditionStep, stepIndex: number) => (
                        <li key={`${step.type}-${step.target}-${stepIndex}`}>
                          {getStepLabel(step.type)}
                          {step.target ? `: ${step.target}` : ''}
                          {step.count ? ` x${step.count}` : ''}
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
