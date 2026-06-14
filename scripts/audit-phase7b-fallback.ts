import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type SourceDictionaryEntry = {
  category1?: string
  subCategory?: string
  contentName?: string | null
  acquisitionRoutes?: Array<{
    contentName?: string
    detail?: string
  }>
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')

const EVENT_BASE_LABELS: Record<string, { ja: string; confidence: 'high' | 'medium' | 'low' }> = {
  'All Saints\' Wake': { ja: 'オールセインツデー', confidence: 'high' },
  'Digital Fan Festival': { ja: 'デジタルファンフェスティバル', confidence: 'high' },
  'Heavensturn': { ja: 'ヘヴンターン', confidence: 'high' },
  'Hatching-tide': { ja: 'ハッチング・タイド', confidence: 'high' },
  'Little Ladies\' Day & Hatching-tide': { ja: 'リトルレディズデー＆ハッチング・タイド', confidence: 'medium' },
  'Moonfire Faire': { ja: 'ムーンファイア・フェア', confidence: 'high' },
  'The Make It Rain Campaign': { ja: 'メイク・イット・レイン・キャンペーン', confidence: 'high' },
  'The Rising': { ja: 'ライジング', confidence: 'high' },
  'The Starlight Celebration': { ja: 'スターライト・セレブレーション', confidence: 'high' },
  'Twitch Campaign': { ja: 'Twitch Campaign', confidence: 'low' },
  'Valentione\'s Day': { ja: 'ヴァレンティオンデー', confidence: 'high' },
}

const ITEM_CODE_PRODUCT_LABELS: Record<string, { ja: string; confidence: 'high' | 'medium' | 'low' }> = {
  'A Realm Reborn Original Soundtrack': { ja: 'A Realm Reborn Original Soundtrack', confidence: 'low' },
  'Before Meteor Original Soundtrack': { ja: 'Before Meteor Original Soundtrack', confidence: 'low' },
  'Before the Fall Original Soundtrack': { ja: 'Before the Fall Original Soundtrack', confidence: 'low' },
  'Dawntrail Collector\'s Edition': { ja: 'Dawntrail Collector\'s Edition', confidence: 'low' },
  'Dawntrail Original Soundtrack': { ja: 'Dawntrail Original Soundtrack', confidence: 'low' },
  'Dawntrail Pre-order': { ja: 'Dawntrail Pre-order', confidence: 'low' },
  'Encyclopaedia Eorzea III': { ja: 'Encyclopaedia Eorzea III', confidence: 'low' },
  'Endwalker Collector\'s Edition': { ja: 'Endwalker Collector\'s Edition', confidence: 'low' },
  'Endwalker Original Soundtrack': { ja: 'Endwalker Original Soundtrack', confidence: 'low' },
  'Endwalker Pre-order': { ja: 'Endwalker Pre-order', confidence: 'low' },
  'Growing Light Original Soundtrack': { ja: 'Growing Light Original Soundtrack', confidence: 'low' },
  'Heavensward Collector\'s Edition': { ja: 'Heavensward Collector\'s Edition', confidence: 'low' },
  'Heavensward Original Soundtrack': { ja: 'Heavensward Original Soundtrack', confidence: 'low' },
  'Heavensward Pre-order': { ja: 'Heavensward Pre-order', confidence: 'low' },
  'Shadowbringers Collector\'s Edition': { ja: 'Shadowbringers Collector\'s Edition', confidence: 'low' },
  'Shadowbringers Original Soundtrack': { ja: 'Shadowbringers Original Soundtrack', confidence: 'low' },
  'Shadowbringers Pre-order': { ja: 'Shadowbringers Pre-order', confidence: 'low' },
  'Stormblood Collector\'s Edition': { ja: 'Stormblood Collector\'s Edition', confidence: 'low' },
  'Stormblood Original Soundtrack': { ja: 'Stormblood Original Soundtrack', confidence: 'low' },
  'Stormblood Pre-order': { ja: 'Stormblood Pre-order', confidence: 'low' },
  'The Art of Resurrection -Among The Stars- Artbook': { ja: 'The Art of Resurrection -Among The Stars- Artbook', confidence: 'low' },
  'The Art of Resurrection -Beyond the Veil- Artbook': { ja: 'The Art of Resurrection -Beyond the Veil- Artbook', confidence: 'low' },
  'The Art of Succession -Relics of Heritage- Artbook': { ja: 'The Art of Succession -Relics of Heritage- Artbook', confidence: 'low' },
}

const SUBAQUATIC_SITE_LABELS: Record<string, { ja: string; confidence: 'high' | 'medium' | 'low' }> = {
  'Bellflower Flood': { ja: 'Bellflower Flood', confidence: 'low' },
  'Deep-sea Site 5': { ja: 'Deep-sea Site 5', confidence: 'low' },
  'Flickering Dip': { ja: 'Flickering Dip', confidence: 'low' },
  'Sirensong Sea 5': { ja: 'Sirensong Sea 5', confidence: 'low' },
  'South Indigo Deep': { ja: 'South Indigo Deep', confidence: 'low' },
  'The Lilac Sea': { ja: 'The Lilac Sea', confidence: 'low' },
  'The Mystic Basin': { ja: 'The Mystic Basin', confidence: 'low' },
  'The Rimilala Shelf': { ja: 'The Rimilala Shelf', confidence: 'low' },
}

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function isScoped(entry: SourceDictionaryEntry) {
  return entry.category1 === '譜面'
    || entry.subCategory === '譜面'
    || entry.category1 === 'マウント'
    || entry.category1 === 'ミニオン'
}

function classifyEventWithYear(name: string) {
  const match = name.match(/^(.+?) \((20\d{2})\)$/)
  if (!match) {
    return null
  }

  const [, base, year] = match
  const event = EVENT_BASE_LABELS[base]
  if (!event) {
    return {
      category: 'event-with-year' as const,
      base,
      year,
      confidence: 'low' as const,
      recommendation: 'english-fallback' as const,
      jaHint: null,
    }
  }

  const recommendation = event.confidence === 'high'
    ? 'auto-template' as const
    : event.confidence === 'medium'
      ? 'manual-dictionary' as const
      : 'english-fallback' as const

  return {
    category: 'event-with-year' as const,
    base,
    year,
    confidence: event.confidence,
    recommendation,
    jaHint: `${event.ja} (${year})`,
  }
}

function classifyItemCodeBundle(name: string) {
  const match = name.match(/^Item code included with (.+)$/)
  if (!match) {
    return null
  }

  const product = match[1].trim()
  const known = ITEM_CODE_PRODUCT_LABELS[product]

  if (!known) {
    return {
      category: 'item-code-bundle' as const,
      product,
      confidence: 'low' as const,
      recommendation: 'english-fallback' as const,
      jaHint: null,
    }
  }

  return {
    category: 'item-code-bundle' as const,
    product,
    confidence: known.confidence,
    recommendation: 'english-fallback' as const,
    jaHint: `同梱アイテムコード: ${known.ja}`,
  }
}

function classifySubaquaticVoyage(name: string) {
  const standalone = name.match(/^Subaquatic Voyages - (.+)$/)
  if (standalone) {
    return classifySubaquaticRoute(standalone[1], name)
  }

  const crafted = name.match(/^Crafted by .+ - Subaquatic Voyages: (.+)$/)
  if (crafted) {
    return classifySubaquaticRoute(crafted[1], name, 'crafted-prefix')
  }

  if (name === 'Subaquatic Voyages') {
    return {
      category: 'subaquatic-voyages' as const,
      pattern: 'label-only',
      route: name,
      confidence: 'high' as const,
      recommendation: 'manual-dictionary' as const,
      jaHint: '潜水艦探索',
    }
  }

  return null
}

function classifySubaquaticRoute(route: string, fullName: string, pattern: 'standalone' | 'crafted-prefix' = 'standalone') {
  const sites = route.split(/\s*,\s*/).map((part) => part.trim())
  const parsedSites = sites.map((site) => {
    const match = site.match(/^(.+?) \(([A-Z/]+)\)$/)
    if (!match) {
      return { site, codes: null as string | null, confidence: 'low' as const }
    }

    const [, place, codes] = match
    const known = SUBAQUATIC_SITE_LABELS[place]
    return {
      site: place,
      codes,
      confidence: known?.confidence ?? 'low' as const,
    }
  })

  const hasUnknownSite = parsedSites.some((site) => site.confidence === 'low')
  const recommendation = hasUnknownSite ? 'english-fallback' as const : 'manual-dictionary' as const

  return {
    category: 'subaquatic-voyages' as const,
    pattern,
    route,
    fullName,
    parsedSites,
    confidence: hasUnknownSite ? 'low' as const : 'medium' as const,
    recommendation,
    jaHint: pattern === 'standalone'
      ? `潜水艦探索 - ${route}`
      : `Subaquatic Voyages: ${route}`,
  }
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as SourceDictionaryEntry[]
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string }>
  const dictMap = new Map(dictionary.filter((entry) => entry.en && entry.ja).map((entry) => [entry.en!.trim(), entry.ja!]))

  const scopedEntries = sourceDictionary.filter(isScoped)
  const englishValues = new Set<string>()

  for (const entry of scopedEntries) {
    for (const value of [
      entry.contentName,
      ...(entry.acquisitionRoutes ?? []).flatMap((route) => [route.contentName, route.detail]),
    ]) {
      const text = value?.trim()
      if (text && !isJapanese(text)) {
        englishValues.add(text)
      }
    }
  }

  const fallback = [...englishValues].filter((value) => !dictMap.has(value)).sort((a, b) => a.localeCompare(b))

  const buckets = {
    eventWithYear: [] as ReturnType<typeof classifyEventWithYear>[],
    itemCodeBundle: [] as ReturnType<typeof classifyItemCodeBundle>[],
    subaquaticVoyages: [] as ReturnType<typeof classifySubaquaticVoyage>[],
  }

  for (const name of fallback) {
    const event = classifyEventWithYear(name)
    if (event) {
      buckets.eventWithYear.push(event)
      continue
    }

    const itemCode = classifyItemCodeBundle(name)
    if (itemCode) {
      buckets.itemCodeBundle.push(itemCode)
      continue
    }

    const subaquatic = classifySubaquaticVoyage(name)
    if (subaquatic) {
      buckets.subaquaticVoyages.push(subaquatic)
    }
  }

  const summarize = <T extends { recommendation: string }>(items: T[]) => ({
    total: items.length,
    autoTemplate: items.filter((item) => item.recommendation === 'auto-template').length,
    manualDictionary: items.filter((item) => item.recommendation === 'manual-dictionary').length,
    englishFallback: items.filter((item) => item.recommendation === 'english-fallback').length,
  })

  const uniqueEvents = [...new Map(buckets.eventWithYear.map((item) => [item!.base, item!])).values()]
  const uniqueItemCodes = [...new Map(buckets.itemCodeBundle.map((item) => [item!.product, item!])).values()]
  const uniqueSubaquatic = [...new Map(buckets.subaquaticVoyages.map((item) => [item!.fullName ?? item!.route ?? JSON.stringify(item), item!])).values()]

  console.log(JSON.stringify({
    currentFallbackTotal: fallback.length,
    phase7bTargets: {
      eventWithYear: {
        ...summarize(buckets.eventWithYear.filter(Boolean) as Array<{ recommendation: string }>),
        uniqueBaseEvents: uniqueEvents.length,
        values: buckets.eventWithYear.map((item) => item?.base && item.year ? `${item.base} (${item.year})` : null).filter(Boolean),
        byBase: uniqueEvents.map((item) => ({
          base: item!.base,
          confidence: item!.confidence,
          recommendation: item!.recommendation,
          years: buckets.eventWithYear.filter((entry) => entry?.base === item!.base).map((entry) => entry!.year),
          jaHint: item!.jaHint,
        })),
        highRisk: buckets.eventWithYear.filter((item) => item?.confidence === 'low').map((item) => `${item!.base} (${item!.year})`),
        keepEnglish: buckets.eventWithYear.filter((item) => item?.recommendation === 'english-fallback').map((item) => `${item!.base} (${item!.year})`),
      },
      itemCodeBundle: {
        ...summarize(buckets.itemCodeBundle.filter(Boolean) as Array<{ recommendation: string }>),
        uniqueProducts: uniqueItemCodes.length,
        values: buckets.itemCodeBundle.map((item) => `Item code included with ${item!.product}`),
        byProduct: uniqueItemCodes.map((item) => ({
          product: item!.product,
          confidence: item!.confidence,
          recommendation: item!.recommendation,
          jaHint: item!.jaHint,
        })),
        highRisk: buckets.itemCodeBundle.filter((item) => item?.confidence === 'low').map((item) => item!.product),
        keepEnglish: buckets.itemCodeBundle.map((item) => `Item code included with ${item!.product}`),
      },
      subaquaticVoyages: {
        ...summarize(buckets.subaquaticVoyages.filter(Boolean) as Array<{ recommendation: string }>),
        uniqueRoutes: uniqueSubaquatic.length,
        values: buckets.subaquaticVoyages.map((item) => item!.fullName ?? item!.route ?? 'Subaquatic Voyages'),
        routes: uniqueSubaquatic.map((item) => ({
          name: item!.fullName ?? item!.route,
          pattern: item!.pattern,
          confidence: item!.confidence,
          recommendation: item!.recommendation,
          parsedSites: 'parsedSites' in item! ? item!.parsedSites : undefined,
          jaHint: item!.jaHint,
        })),
        highRisk: buckets.subaquaticVoyages.filter((item) => item?.confidence === 'low').map((item) => item!.fullName ?? item!.route),
        keepEnglish: buckets.subaquaticVoyages.filter((item) => item?.recommendation === 'english-fallback').map((item) => item!.fullName ?? item!.route),
      },
    },
    combinedTargetTotal:
      buckets.eventWithYear.length + buckets.itemCodeBundle.length + buckets.subaquaticVoyages.length,
    templateProposals: {
      eventWithYear: '{eventJa} ({year}) — eventJa from fixed seasonal-event map only',
      itemCodeBundle: 'keep English product title; optional prefix only: 同梱アイテムコード: {productEn}',
      subaquaticVoyages: 'keep route/site names English unless official JP confirmed; optional prefix: 潜水艦探索 - {routeEn}',
    },
    representativeExamples: {
      eventAuto: buckets.eventWithYear.find((item) => item?.recommendation === 'auto-template'),
      eventFallback: buckets.eventWithYear.find((item) => item?.recommendation === 'english-fallback'),
      itemCodeFallback: buckets.itemCodeBundle[0],
      subaquaticFallback: buckets.subaquaticVoyages.find((item) => item?.recommendation === 'english-fallback'),
      subaquaticPrefixOnly: buckets.subaquaticVoyages.find((item) => item?.pattern === 'label-only'),
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
