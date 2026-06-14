import { mkdir, readFile, writeFile } from 'node:fs/promises'
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

type Recommendation =
  | 'auto-template'
  | 'manual-dictionary'
  | 'english-fallback'
  | 'defer'

type Classification = {
  category: 'vendor-composite' | 'edition-promo' | 'proper-content' | 'currency-token' | 'other'
  subcategory: string
  recommendation: Recommendation
  risk: 'low' | 'medium' | 'high'
  projectedJa: string | null
  note?: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const OUTPUT_DIR = resolve(ROOT, '.tmp-audit-phase7d')

const EDITION_PROMO_PATTERNS: Array<[RegExp, string]> = [
  [/Item code included with /i, 'item-code-bundle'],
  [/Original Soundtrack$/i, 'soundtrack'],
  [/Collector'?s Edition$/i, 'collectors-edition'],
  [/Pre-order$/i, 'pre-order'],
  [/Artbook$/i, 'artbook'],
  [/Encyclopaedia Eorzea/i, 'encyclopaedia'],
  [/Fan Festival/i, 'fan-festival'],
  [/Collaboration$/i, 'collaboration-product'],
  [/Twitch Campaign/i, 'twitch-campaign'],
  [/Available for purchase on the online store/i, 'online-store-promo'],
  [/promotional bonuses/i, 'promo-bonus'],
]

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function isScoped(entry: SourceDictionaryEntry) {
  return entry.category1 === '譜面'
    || entry.subCategory === '譜面'
    || entry.category1 === 'マウント'
    || entry.category1 === 'ミニオン'
}

function isVendorComposite(name: string) {
  return /Quartermaster|Junkmonger|Maisenta|Roarich|Bango Zango|Smithy|Scrip Exchange|Rowena's Representative|Trisassant|Vendor|Purchase from|Gemstone Trader/i.test(name)
    && name.includes(' - ')
}

function isCurrencyToken(name: string) {
  return /^\d[\d,]*\s/.test(name)
    || /^(?:\d+\s)?(?:Chunks? of|Phials? of|Vegetal Vouchers|Fête Tokens|Allagan Silver Pieces|Enlightenment (?:Gold|Silver) Pieces)/i.test(name)
    || /\b(?:MGP|MGF|Gil|Seals|Marks|Crystals|Clusters|Scrips|Cowries|Gemstones|Cosmocredits|Faux Leaves|Vouchers|Tokens|Leaves)\b/i.test(name)
}

function classifyCurrencyToken(name: string): Classification | null {
  const patterns: Array<[RegExp, string, Recommendation, string | null, 'low' | 'medium' | 'high']> = [
    [/^\d[\d,]* MGP(?:\s*\(.+\))?$/i, 'mgp', 'auto-template', '{amount} MGP', 'low'],
    [/^\d[\d,]* MGF(?:\s*\(.+\))?$/i, 'mgf', 'auto-template', '{amount} MGF', 'low'],
    [/^\d[\d,]* (?:Flame|Serpent|Storm) Seals$/i, 'gc-seals', 'auto-template', '{amount} {gc}シール', 'low'],
    [/^\d[\d,]* Allied Seals$/i, 'allied-seals', 'auto-template', '{amount} アライドシール', 'low'],
    [/^\d[\d,]* Centurio Seals$/i, 'centurio-seals', 'auto-template', '{amount} センチュリオンシール', 'low'],
    [/^\d[\d,]* Wolf Marks$/i, 'wolf-marks', 'auto-template', '{amount} ウルフマーク', 'low'],
    [/^\d[\d,]* Trophy Crystals$/i, 'trophy-crystals', 'auto-template', '{amount} トロフィークリスタル', 'low'],
    [/^\d[\d,]* Cosmocredits$/i, 'cosmocredits', 'auto-template', '{amount} コスモクレジット', 'medium'],
    [/^\d[\d,]* Faux Leaves$/i, 'faux-leaves', 'auto-template', '{amount} フォー・リーフ', 'low'],
    [/^\d[\d,]* Bicolor Gemstones(?:\s*\(.+\))?$/i, 'bicolor-gemstones', 'auto-template', '{amount} 双極化晶薬', 'low'],
    [/^\d[\d,]* Bozjan Clusters$/i, 'bozjan-clusters', 'auto-template', '{amount} ボズヤ・クラスター', 'low'],
    [/^\d[\d,]* (?:Sacks of Nuts|Skybuilders' Scrips|Seafarer's Cowries)(?:\s*\(.+\))?$/i, 'scrips-cowries', 'auto-template', null, 'medium'],
    [/^\d[\d,]* Khloe's (?:Bronze|Silver|Gold) Certificate of Commendation$/i, 'khloe-cert', 'auto-template', null, 'medium'],
    [/^\d[\d,]* Enlightenment (?:Gold|Silver) Pieces$/i, 'enlightenment-pieces', 'manual-dictionary', null, 'medium'],
    [/^\d[\d,]* Gil$/i, 'gil', 'auto-template', '{amount} ギル', 'low'],
    [/^\d[\d,]* Fête Tokens$/i, 'fete-tokens', 'manual-dictionary', '{amount} フェテ・トークン', 'medium'],
    [/^\d[\d,]* Vegetal Vouchers$/i, 'vegetal-vouchers', 'manual-dictionary', '{amount} ベジタブル・バウチャー', 'medium'],
    [/^\d+ Chunks? of Sanguinite$/i, 'sanguinite', 'manual-dictionary', null, 'high'],
    [/^\d+ Phials? of Luminous Oil$/i, 'luminous-oil', 'manual-dictionary', null, 'high'],
    [/^\d+ Allagan Silver Pieces$/i, 'allagan-silver', 'manual-dictionary', null, 'medium'],
  ]

  for (const [pattern, subcategory, recommendation, projectedJa, risk] of patterns) {
    if (pattern.test(name)) {
      return {
        category: 'currency-token',
        subcategory,
        recommendation,
        risk,
        projectedJa,
      }
    }
  }

  if (isCurrencyToken(name)) {
    return {
      category: 'currency-token',
      subcategory: 'unclassified-currency',
      recommendation: 'manual-dictionary',
      risk: 'medium',
      projectedJa: null,
    }
  }

  return null
}

function classifyEditionPromo(name: string): Classification | null {
  for (const [pattern, subcategory] of EDITION_PROMO_PATTERNS) {
    if (pattern.test(name)) {
      return {
        category: 'edition-promo',
        subcategory,
        recommendation: 'english-fallback',
        risk: subcategory === 'collaboration-product' ? 'medium' : 'low',
        projectedJa: null,
        note: '商品名・サントラ・CE・予約特典は英語維持方針',
      }
    }
  }

  if (/^Online Store - /i.test(name)) {
    return {
      category: 'edition-promo',
      subcategory: 'online-store-set',
      recommendation: 'manual-dictionary',
      risk: 'medium',
      projectedJa: null,
      note: 'セット名部分は英語維持の可能性',
    }
  }

  if (/^Cosmic Fortune - /i.test(name)) {
    return {
      category: 'edition-promo',
      subcategory: 'cosmic-fortune',
      recommendation: 'manual-dictionary',
      risk: 'medium',
      projectedJa: 'コズミック・フォーチュン - {itemEn}',
    }
  }

  return null
}

function classifyVendorComposite(name: string): Classification | null {
  if (!isVendorComposite(name)) {
    return null
  }

  const parts = name.split(' - ')
  if (parts.length < 3) {
    return {
      category: 'vendor-composite',
      subcategory: 'vendor-short',
      recommendation: 'manual-dictionary',
      risk: 'medium',
      projectedJa: null,
    }
  }

  const cost = parts.at(-1)?.trim() ?? ''
  const location = parts.at(-2)?.trim() ?? ''
  const npc = parts.slice(0, -2).join(' - ').trim()

  if (/Rank \d+/i.test(cost) && /\(\d[\d,]* Gil\)/i.test(location)) {
    return {
      category: 'vendor-composite',
      subcategory: 'vendor-rank-gil',
      recommendation: 'auto-template',
      risk: 'low',
      projectedJa: `${npc} - {locationJa} - {costJa}`,
      note: '既存 tier3 vendor テンプレ拡張候補',
    }
  }

  if (/\d[\d,]* Gil/i.test(cost) || /Seals|Marks|Scrips|Certificates|MGP|Gemstones/i.test(cost)) {
    return {
      category: 'vendor-composite',
      subcategory: 'vendor-currency',
      recommendation: 'auto-template',
      risk: 'low',
      projectedJa: `${npc} - {locationJa} - {costJa}`,
      note: '既存 tier3 vendor テンプレ未一致',
    }
  }

  return {
    category: 'vendor-composite',
    subcategory: 'vendor-other',
    recommendation: 'manual-dictionary',
    risk: 'medium',
    projectedJa: null,
  }
}

function classifyProperContent(name: string): Classification | null {
  const patterns: Array<[RegExp, string, Recommendation, 'low' | 'medium' | 'high', string | null]> = [
    [/^Exploratory Voyages:/i, 'exploratory-voyages', 'english-fallback', 'low', null],
    [/^Crafted by .+ - (?:Exploratory|Subaquatic) Voyages:/i, 'crafted-voyage', 'english-fallback', 'low', null],
    [/^Subaquatic Voyages(?:$| - |:)/i, 'subaquatic-voyages', 'english-fallback', 'medium', null],
    [/^Timeworn .+ Map$/i, 'timeworn-map', 'auto-template', 'low', 'タイムワーン{map}の地図'],
    [/^Final Fantasy .* Collaboration$/i, 'ff-collab', 'manual-dictionary', 'low', null],
    [/^Deep Dungeon /i, 'deep-dungeon', 'manual-dictionary', 'medium', null],
    [/^The Masked Carnival$/i, 'masked-carnival', 'manual-dictionary', 'low', 'マスクド・カーニバル'],
    [/^Gold Saucer$/i, 'gold-saucer', 'manual-dictionary', 'low', 'ゴールドソーサー'],
    [/^Frontline$/i, 'frontline', 'manual-dictionary', 'low', 'フロントライン'],
    [/^Rival Wings$/i, 'rival-wings', 'manual-dictionary', 'low', 'ライバルウィングズ'],
    [/^Ocean Fishing$/i, 'ocean-fishing', 'manual-dictionary', 'low', 'オーシャン・フィッシング'],
    [/^Eureka /i, 'eureka', 'manual-dictionary', 'medium', null],
    [/^Bozja /i, 'bozja', 'manual-dictionary', 'medium', null],
    [/^Crystalline Conflict$/i, 'crystalline-conflict', 'manual-dictionary', 'low', 'クリスタライン・コンフリクト'],
    [/^Materia Melding/i, 'materia-melding', 'english-fallback', 'medium', null],
    [/^Desynthesis$/i, 'desynthesis', 'manual-dictionary', 'low', '分解'],
    [/^Retainer Venture$/i, 'retainer-venture', 'manual-dictionary', 'low', 'リテイナーベンチャー'],
    [/^Company Workshop$/i, 'company-workshop', 'manual-dictionary', 'medium', 'カンパニーワークショップ'],
    [/^Airship|^Exploratory/i, 'airship', 'english-fallback', 'medium', null],
  ]

  for (const [pattern, subcategory, recommendation, risk, projectedJa] of patterns) {
    if (pattern.test(name)) {
      return {
        category: 'proper-content',
        subcategory,
        recommendation,
        risk,
        projectedJa,
      }
    }
  }

  if (/^[A-Z][a-z].*(?:\(Extreme\)|\(Hard\)|\(Savage\)|Turn \d+|Trials?|Dungeon|Raid|Alliance)/i.test(name)) {
    return {
      category: 'proper-content',
      subcategory: 'instance-title',
      recommendation: 'auto-template',
      risk: 'medium',
      projectedJa: null,
      note: 'Teamcraft 正規化で解決可能な可能性',
    }
  }

  if (/^[A-Z][A-Za-z0-9' -]+$/.test(name) && name.length > 3 && !name.includes(' - ')) {
    return {
      category: 'proper-content',
      subcategory: 'standalone-proper-noun',
      recommendation: 'manual-dictionary',
      risk: 'high',
      projectedJa: null,
      note: '固有名詞。Teamcraft 未一致',
    }
  }

  return null
}

function classifyFallback(name: string): Classification {
  const currency = classifyCurrencyToken(name)
  if (currency) return currency

  const edition = classifyEditionPromo(name)
  if (edition) return edition

  const vendor = classifyVendorComposite(name)
  if (vendor) return vendor

  const proper = classifyProperContent(name)
  if (proper) return proper

  if (/^Purchase from /i.test(name)) {
    return {
      category: 'other',
      subcategory: 'purchase-from',
      recommendation: 'manual-dictionary',
      risk: 'medium',
      projectedJa: null,
    }
  }

  if (/ - .+ - /.test(name)) {
    return {
      category: 'other',
      subcategory: 'composite-other',
      recommendation: 'manual-dictionary',
      risk: 'medium',
      projectedJa: null,
    }
  }

  return {
    category: 'other',
    subcategory: 'misc',
    recommendation: 'defer',
    risk: 'high',
    projectedJa: null,
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const sourceDictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as SourceDictionaryEntry[]
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string }>
  const dictMap = new Set(dictionary.filter((entry) => entry.en && entry.ja).map((entry) => entry.en!.trim()))

  const englishValues = new Set<string>()
  for (const entry of sourceDictionary.filter(isScoped)) {
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
  const classified = fallback.map((name) => ({ name, ...classifyFallback(name) }))

  const byCategory = {
    'vendor-composite': classified.filter((entry) => entry.category === 'vendor-composite'),
    'edition-promo': classified.filter((entry) => entry.category === 'edition-promo'),
    'proper-content': classified.filter((entry) => entry.category === 'proper-content'),
    'currency-token': classified.filter((entry) => entry.category === 'currency-token'),
    other: classified.filter((entry) => entry.category === 'other'),
  }

  const byRecommendation = {
    autoTemplate: classified.filter((entry) => entry.recommendation === 'auto-template'),
    manualDictionary: classified.filter((entry) => entry.recommendation === 'manual-dictionary'),
    englishFallback: classified.filter((entry) => entry.recommendation === 'english-fallback'),
    defer: classified.filter((entry) => entry.recommendation === 'defer'),
  }

  const byRisk = {
    high: classified.filter((entry) => entry.risk === 'high'),
    medium: classified.filter((entry) => entry.risk === 'medium'),
    low: classified.filter((entry) => entry.risk === 'low'),
  }

  const subcategoryCounts = Object.entries(
    classified.reduce<Record<string, number>>((acc, entry) => {
      const key = `${entry.category}/${entry.subcategory}`
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const costEffective = classified.filter((entry) =>
    entry.recommendation === 'auto-template'
    || (entry.recommendation === 'manual-dictionary' && entry.risk === 'low'))

  const projectedResolvable = classified.filter((entry) => entry.recommendation !== 'english-fallback' && entry.recommendation !== 'defer')
  const projectedEnglishKeep = classified.filter((entry) => entry.recommendation === 'english-fallback')

  const result = {
    currentFallbackTotal: fallback.length,
    scopedUniqueEnglish: englishValues.size,
    currentCoveragePct: (((englishValues.size - fallback.length) / englishValues.size) * 100).toFixed(1),
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([key, items]) => [key, items.length])),
    byRecommendation: Object.fromEntries(Object.entries(byRecommendation).map(([key, items]) => [key, items.length])),
    byRisk: Object.fromEntries(Object.entries(byRisk).map(([key, items]) => [key, items.length])),
    subcategoryCounts,
    costEffectiveCount: costEffective.length,
    projectedIfImplemented: {
      resolvableEntries: projectedResolvable.length,
      englishKeepRecommended: projectedEnglishKeep.length,
      fallbackAfter: fallback.length - projectedResolvable.length,
      coveragePct: (((englishValues.size - (fallback.length - projectedResolvable.length)) / englishValues.size) * 100).toFixed(1),
    },
    top20ByCategory: Object.fromEntries(
      Object.entries(byCategory).map(([key, items]) => [
        key,
        items.slice(0, 20).map((entry) => ({
          name: entry.name,
          subcategory: entry.subcategory,
          recommendation: entry.recommendation,
          risk: entry.risk,
          projectedJa: entry.projectedJa,
          note: entry.note,
        })),
      ]),
    ),
    allFallback: classified,
  }

  await writeFile(resolve(OUTPUT_DIR, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    currentFallbackTotal: result.currentFallbackTotal,
    byCategory: result.byCategory,
    byRecommendation: result.byRecommendation,
    byRisk: result.byRisk,
    subcategoryTop15: subcategoryCounts.slice(0, 15),
    costEffectiveCount: result.costEffectiveCount,
    projectedIfImplemented: result.projectedIfImplemented,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
