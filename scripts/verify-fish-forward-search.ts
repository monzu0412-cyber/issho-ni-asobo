import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import searchDictionaryJson from '../src/data/reverse-search/generated/search_dictionary.generated.json' with { type: 'json' }
import sourceDictionaryJson from '../src/data/reverse-search/manual/source_dictionary.json' with { type: 'json' }
import {
  FISH_EXPANSION_AREA_ORDER,
  FISH_FORWARD_STEP2_ORDER,
  getFishZoneExpansionDictionarySize,
  isOceanFishingSource,
  resolveFishForwardStep2Category,
  resolveFishZoneExpansionArea,
  usesFishExpansionAreaNavigation,
} from '../src/lib/fish-forward-navigation.ts'
import { getFishForwardExpansionAreaOptions } from '../src/components/target/targetSearchHelpers.ts'
import { consolidateFishAcquisitionRoutes } from '../src/lib/fish-route-display.ts'
import { getFishItemIconLookupSize, resolveFishItemIconUrl } from '../src/lib/fish-item-icon.ts'
import { isCardUiPublicSearchItem } from '../src/lib/publication-gate.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const REPORT_PATH = resolve(ROOT, 'scripts/output/fish-forward-search-phase-f3-expansion-report.json')

const EXPECTED_FISH_TOTAL = 2399

const EXPECTED_BUCKET_COUNTS: Record<string, number> = {
  釣り: 1493,
  ヌシ: 598,
  オオヌシ: 49,
  オーシャンフィッシング: 259,
}

const sourceById = new Map(
  sourceDictionaryJson
    .filter((item) => item.type !== 'metadata')
    .map((item) => [item.id, item]),
)

type CheckResult = {
  name: string
  pass: boolean
  detail?: string
}

const checks: CheckResult[] = []

function addCheck(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail })
}

const fishSourceItems = sourceDictionaryJson.filter(
  (item) => item.type !== 'metadata' && item.category1 === '魚',
)

addCheck('source_dictionary fish count', fishSourceItems.length === 2399, `actual=${fishSourceItems.length}`)

const sourceBucketCounts: Record<string, number> = {}
for (const item of fishSourceItems) {
  const bucket = resolveFishForwardStep2Category(item)
  sourceBucketCounts[bucket] = (sourceBucketCounts[bucket] ?? 0) + 1
}

for (const [bucket, expected] of Object.entries(EXPECTED_BUCKET_COUNTS)) {
  const actual = sourceBucketCounts[bucket] ?? 0
  addCheck(`source bucket ${bucket}`, actual === expected, `expected=${expected} actual=${actual}`)
}

addCheck(
  'source bucket sum',
  Object.values(sourceBucketCounts).reduce((sum, count) => sum + count, 0) === 2399,
)

const searchBucketCounts: Record<string, number> = {}
let publicFishCount = 0

for (const item of searchDictionaryJson) {
  if (item.type === 'metadata' || !item.sourceDictionaryId) {
    continue
  }

  const sourceItem = sourceById.get(item.sourceDictionaryId)
  if (!sourceItem || sourceItem.category1 !== '魚') {
    continue
  }

  if (!isCardUiPublicSearchItem('魚', sourceItem)) {
    continue
  }

  publicFishCount += 1
  const bucket = resolveFishForwardStep2Category(sourceItem)
  searchBucketCounts[bucket] = (searchBucketCounts[bucket] ?? 0) + 1
}

addCheck('public search fish count', publicFishCount > 0, `actual=${publicFishCount}`)
addCheck(
  'public search bucket keys',
  FISH_FORWARD_STEP2_ORDER.every((bucket) => (searchBucketCounts[bucket] ?? 0) > 0),
  JSON.stringify(searchBucketCounts),
)

const tripodFish = sourceById.get(
  sourceDictionaryJson.find((item) => item.type !== 'metadata' && item.name === 'Tripod Fish')?.id ?? '',
)
if (tripodFish?.acquisitionRoutes?.length) {
  const consolidated = consolidateFishAcquisitionRoutes(tripodFish.acquisitionRoutes)
  const mergedBait = consolidated[0]?.specialConditions?.bait ?? ''
  addCheck(
    'fish bait consolidation sample',
    tripodFish.acquisitionRoutes.length >= 4
      && consolidated.length === 1
      && String(mergedBait).includes(' / '),
    `routes=${tripodFish.acquisitionRoutes.length} consolidated=${consolidated.length} bait=${mergedBait}`,
  )
}

const mahiMahi = sourceById.get(
  sourceDictionaryJson.find((item) => item.type !== 'metadata' && item.itemId === 4915)?.id ?? '',
)
if (mahiMahi?.itemId) {
  addCheck(
    'fish icon lookup sample (numeric garland icon)',
    resolveFishItemIconUrl(mahiMahi.itemId) != null,
    `itemId=${mahiMahi.itemId}`,
  )
}

const goldcheek = sourceById.get(
  sourceDictionaryJson.find((item) => item.type !== 'metadata' && item.itemId === 45830)?.id ?? '',
)
if (goldcheek?.itemId) {
  addCheck(
    'fish icon lookup sample (string garland icon)',
    resolveFishItemIconUrl(goldcheek.itemId) != null,
    `itemId=${goldcheek.itemId}`,
  )
}

const fishIconLookupSize = getFishItemIconLookupSize()
addCheck(
  'fish icon lookup coverage',
  fishIconLookupSize === EXPECTED_FISH_TOTAL,
  `resolved=${fishIconLookupSize} expected=${EXPECTED_FISH_TOTAL}`,
)

const EXPECTED_ZONE_DICTIONARY_SIZE = 66

addCheck(
  'fish zone expansion dictionary size',
  getFishZoneExpansionDictionarySize() === EXPECTED_ZONE_DICTIONARY_SIZE,
  `actual=${getFishZoneExpansionDictionarySize()}`,
)

const unmappedFishZones = new Set<string>()
const expansionAreaCountsByBucket: Record<string, Record<string, number>> = {}

for (const item of fishSourceItems) {
  const bucket = resolveFishForwardStep2Category(item)

  if (!usesFishExpansionAreaNavigation(bucket)) {
    continue
  }

  const zone = item.contentName?.trim()

  if (!zone) {
    continue
  }

  const expansionArea = resolveFishZoneExpansionArea(zone)

  if (!expansionArea) {
    unmappedFishZones.add(zone)
    continue
  }

  if (!expansionAreaCountsByBucket[bucket]) {
    expansionAreaCountsByBucket[bucket] = {}
  }

  expansionAreaCountsByBucket[bucket][expansionArea] = (
    expansionAreaCountsByBucket[bucket][expansionArea] ?? 0
  ) + 1
}

addCheck(
  'fish zone expansion coverage',
  unmappedFishZones.size === 0,
  unmappedFishZones.size > 0 ? `unmapped=${[...unmappedFishZones].join(', ')}` : undefined,
)

for (const bucket of ['釣り', 'ヌシ', 'オオヌシ'] as const) {
  const expansionAreas = getFishForwardExpansionAreaOptions('魚', bucket)
  const expectedMinAreas = bucket === '釣り' ? FISH_EXPANSION_AREA_ORDER.length : 1

  addCheck(
    `fish expansion areas ${bucket}`,
    expansionAreas.length >= expectedMinAreas,
    `count=${expansionAreas.length} areas=${expansionAreas.join(',')}`,
  )
}

addCheck(
  'fish expansion navigation excludes ocean',
  !usesFishExpansionAreaNavigation('オーシャンフィッシング'),
)

const oceanFish = fishSourceItems.filter((item) => resolveFishForwardStep2Category(item) === 'オーシャンフィッシング')
addCheck(
  'ocean fishing bucket preserved',
  oceanFish.length === EXPECTED_BUCKET_COUNTS['オーシャンフィッシング'],
  `actual=${oceanFish.length}`,
)

const arrZones = new Set(
  fishSourceItems
    .filter((item) => resolveFishForwardStep2Category(item) === '釣り' && resolveFishZoneExpansionArea(item.contentName) === '新生エリア')
    .map((item) => item.contentName?.trim())
    .filter((zone): zone is string => Boolean(zone)),
)

addCheck(
  'fish expansion filter sample (釣り 新生エリア zones)',
  arrZones.size > 0 && arrZones.size <= 18,
  `zones=${arrZones.size}`,
)

const failedChecks = checks.filter((check) => !check.pass)
const report = {
  phase: 'F3-expansion',
  generatedAt: new Date().toISOString(),
  sourceBucketCounts,
  searchBucketCounts,
  publicFishCount,
  fishIconLookupSize,
  expansionAreaCountsByBucket,
  unmappedFishZones: [...unmappedFishZones],
  checks,
  pass: failedChecks.length === 0,
}

writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

if (failedChecks.length > 0) {
  console.error('verify-fish-forward-search FAILED')
  for (const check of failedChecks) {
    console.error(`- ${check.name}${check.detail ? `: ${check.detail}` : ''}`)
  }
  process.exit(1)
}

console.log('verify-fish-forward-search PASS')
console.log(`report: ${REPORT_PATH}`)
