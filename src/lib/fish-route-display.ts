import type { AcquisitionRoute } from '../types/card'

function getRouteCardKey(route: AcquisitionRoute) {
  const specialConditionsKey = route.specialConditions
    ? JSON.stringify(route.specialConditions, Object.keys(route.specialConditions).sort())
    : ''
  const conditionStepsKey = route.conditionSteps ? JSON.stringify(route.conditionSteps) : ''

  return [
    route.type,
    route.contentName?.trim() ?? '',
    route.detail?.trim() ?? '',
    specialConditionsKey,
    conditionStepsKey,
  ].join('|')
}

function deduplicateAcquisitionRoutes(routes: AcquisitionRoute[]) {
  const seen = new Set<string>()
  const deduped: AcquisitionRoute[] = []

  for (const route of routes) {
    const key = getRouteCardKey(route)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(route)
  }

  return deduped
}

function getFishRouteGroupingKey(route: AcquisitionRoute) {
  const specialConditions = { ...(route.specialConditions ?? {}) }
  delete specialConditions.bait
  delete specialConditions.mooch

  const conditionSteps = (route.conditionSteps ?? []).filter(
    (step) => step.type !== 'bait' && step.type !== 'mooch',
  )

  return [
    route.type,
    route.contentName?.trim() ?? '',
    route.detail?.trim() ?? '',
    JSON.stringify(specialConditions, Object.keys(specialConditions).sort()),
    JSON.stringify(conditionSteps),
  ].join('|')
}

function collectRouteBaits(route: AcquisitionRoute) {
  const baits: string[] = []

  const bait = route.specialConditions?.bait
  if (typeof bait === 'string' && bait.trim()) {
    baits.push(bait.trim())
  }

  for (const step of route.conditionSteps ?? []) {
    if ((step.type === 'bait' || step.type === 'mooch') && step.target?.trim()) {
      baits.push(step.target.trim())
    }
  }

  return baits
}

export function consolidateFishAcquisitionRoutes(routes: AcquisitionRoute[]) {
  const deduped = deduplicateAcquisitionRoutes(routes)
  const groups = new Map<string, { route: AcquisitionRoute; baits: string[] }>()

  for (const route of deduped) {
    const key = getFishRouteGroupingKey(route)

    if (!groups.has(key)) {
      groups.set(key, { route, baits: [] })
    }

    const group = groups.get(key)!
    for (const bait of collectRouteBaits(route)) {
      if (!group.baits.includes(bait)) {
        group.baits.push(bait)
      }
    }
  }

  return [...groups.values()].map(({ route, baits }) => {
    if (baits.length <= 1) {
      return route
    }

    const mergedSpecialConditions = { ...(route.specialConditions ?? {}) }
    mergedSpecialConditions.bait = baits.join(' / ')
    delete mergedSpecialConditions.mooch

    return {
      ...route,
      specialConditions: mergedSpecialConditions,
      conditionSteps: (route.conditionSteps ?? []).filter(
        (step) => step.type !== 'bait' && step.type !== 'mooch',
      ),
    }
  })
}
