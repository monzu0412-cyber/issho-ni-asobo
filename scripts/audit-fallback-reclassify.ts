import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type SourceDictionaryEntry = {
  category1?: string
  subCategory?: string
  contentName?: string | null
  acquisitionRoutes?: Array<{ contentName?: string; detail?: string }>
}

type PolicyClass = 'jp-target' | 'english-keep' | 'review' | 'high-risk'

type ClassifiedItem = {
  en: string
  policyClass: PolicyClass
  subCategory: string
  reason: string
  jpHint?: string
  priority?: number
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANUAL_DIR = resolve(__dirname, '..', 'src/data/reverse-search/manual')

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function isScoped(entry: SourceDictionaryEntry) {
  return entry.category1 === '譜面' || entry.subCategory === '譜面' || entry.category1 === 'マウント' || entry.category1 === 'ミニオン'
}

function classifyPolicy(en: string): Omit<ClassifiedItem, 'en'> {
  // --- English keep (JP client uses English officially) ---
  if (/Collector'?s Edition|Pre-order|Pre-order Bonus|Digital Collector|Physical Collector|Starter Edition|Complete Edition|Recruit a Friend|Butterfinger|Promotion|Item code included with/i.test(en)) {
    return { policyClass: 'english-keep', subCategory: 'edition-promo', reason: 'JP公式でも英語商品名・版情報' }
  }
  if (/^Online Store - /i.test(en)) {
    return { policyClass: 'review', subCategory: 'online-store-set', reason: 'Set名はMog Station英語表記の可能性。プレフィックスのみJP化済', jpHint: 'オンラインストア - {Set名}' }
  }
  if (/^Cosmic Fortune - /i.test(en)) {
    return { policyClass: 'english-keep', subCategory: 'cosmic-fortune', reason: 'JPクライアントでも英語イベント名（Cosmic Fortune）' }
  }
  if (/^Soundtrack|^Orchestrion Roll|^Art Book|^Artbook|Orchestral Version$|Arrangement$|FINAL FANTASY/i.test(en)) {
    return { policyClass: 'english-keep', subCategory: 'soundtrack-product', reason: 'サントラ/商品名はJP公式でも英語' }
  }
  if (/^2B$|^Answer$|^Neon$|^N-\d{4}$/i.test(en)) {
    return { policyClass: 'english-keep', subCategory: 'proper-alphanumeric', reason: 'JPクライアントでも英数字/英語固有名' }
  }
  if (/^FATE$|^PvP$|^MGP$|^MGF$/i.test(en)) {
    return { policyClass: 'english-keep', subCategory: 'system-label-en', reason: 'JPクライアントでも英語表記のシステム短ラベル' }
  }
  if (/^Final Fantasy (XI|XV|XVI) Collaboration$/i.test(en)) {
    return { policyClass: 'english-keep', subCategory: 'collaboration', reason: 'FINAL FANTASY ブランド英字はJP正式表記に含まれる' }
  }
  if (/^The Tower at Paradigm's Breach|^The Dancing Plague|^Hope's Edge|^The Abyssal Fracture/i.test(en)) {
    return { policyClass: 'review', subCategory: 'content-en-in-jp', reason: 'JPクライアント表記要個別確認（英語混在の可能性）' }
  }

  // --- High risk (generic NPC, location-dependent, complex composite) ---
  if (/^(Smithy|Junkmonger|Traveling Merchant|Merchant & Melder|Clerk PX-0029|Flame Quartermaster|Serpent Quartermaster|Storm Quartermaster|Hunt Billmaster|Rowena's Representative|Housing Merchant|Merchant & Mender|Magic Pot) - /i.test(en)) {
    return { policyClass: 'high-risk', subCategory: 'vendor-generic-b', reason: 'Phase A-2 B分類。拠点/汎用称号で単一マップ不可' }
  }
  if (/^J'lakshai|^Spoils Collector|^Spoils Salvager/i.test(en)) {
    return { policyClass: 'high-risk', subCategory: 'vendor-special', reason: '特殊vendor行。コスト/location複合で要個別設計' }
  }
  if (/^Exploratory Voyages:|^Subaquatic Voyages:/i.test(en)) {
    return { policyClass: 'high-risk', subCategory: 'voyage-composite', reason: '英語ソース固定。複合テンプレ未実装' }
  }
  if (/Quick Exploration|Happy Bunny|Allagan Tomestone of/i.test(en) && !/^Purchase from/i.test(en)) {
    return { policyClass: 'high-risk', subCategory: 'partial-template', reason: '部分テンプレ/未対応パターン。誤訳リスク' }
  }

  // --- JP target (clear official JP exists or template-ready) ---
  if (/^Crafted by /i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'craft-residual', reason: 'craft source未翻訳。instance/購入パターン拡張で対応可', priority: 2 }
  }
  if (/^Gathered by /i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'gather-line', reason: 'Gathered by テンプレ未適用', priority: 1 }
  }
  if (/^FATE "/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'fate-line', reason: 'FATE行テンプレ対象。FATE名/場所はJP正式表記へ', priority: 1 }
  }
  if (/^Resistance Quartermaster - /i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'vendor-resistance', reason: 'JP: レジスタンスの補給兵（A分類済みパターン）', jpHint: 'レジスタンスの補給兵 - …', priority: 2 }
  }
  if (/Quartermaster|Vendor|Junkmonger|Purchase from|Scrip Exchange|Gemstone Trader/i.test(en) && / - .+ - /.test(en)) {
    return { policyClass: 'review', subCategory: 'vendor-residual', reason: 'vendor行だがB/未対応NPC。個別確認', priority: 3 }
  }
  if (/^\d[\d,]* (?:MGP|MGF|Wolf Marks|Allied Seals|Centurio Seals|Trophy Crystals|Cosmocredits|Faux Leaves|Bicolor Gemstones|Bozjan Clusters|Gil|Allagan Tomestones)/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'standalone-cost', reason: 'standalone cost テンプレ対象', priority: 1 }
  }
  if (/^Timeworn .+ Map$/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'timeworn-map', reason: 'タイムワーン地図テンプレ対象', priority: 2 }
  }
  if (/Voyagers' Record|Ancient Record|Token Booklet|Relics|Vouchers|Chunks of|Sanguinite|Phials of|Vegetal|Enlightenment|Fête Tokens|Cowries|Scrips|Sacks of Nuts/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'currency-material', reason: '通貨/素材名はJP正式表記あり', priority: 2 }
  }
  if (/^Eureka |^The Palace of the Dead - |^Heaven-on-High - |^Eureka Orthos - |^Pilgrim's Traverse - /i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'deep-dungeon-sack', reason: 'DD sack テンプレ拡張対象', priority: 2 }
  }
  if (/^Subaquatic Voyages - /i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'subaquatic-voyage', reason: 'Subaquatic テンプレ対象', priority: 2 }
  }
  if (/\(20\d{2}\)$/.test(en) && /Faire|Day|Wake|Celebration|tide|Heavensturn|Rising|Valention|All Saints|Hatching|Starlight|Make It Rain/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'event-with-year', reason: 'イベント年付きテンプレ対象', priority: 2 }
  }
  if (/^Khloe's |^A Life of Adventure|^Open to Victory|^The Leader of the Band|^Tile and Error|^All That She Carried|^Attend a Ceremony|^Ceremony of Eternal Bonding/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'achievement-quest', reason: '実績/クエスト句。Teamcraft/手動でJP化可', priority: 3 }
  }
  if (/^Desynthesize|^Gardening|^Island Sanctuary|^Gold Saucer|^Bozja$|^Eureka$|^Hunts$|^Treasure Hunt$|^Cosmic Exploration$|^Crystalline Conflict/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'system-short', reason: 'システム短ラベル allowlist/manual 対象', priority: 1 }
  }
  if (/^Southern Front Lockbox|^Anemos Lockbox|^Heat-warped|^Moisture-warped|^Happy Bunny|^AV Chest|^Treasure Trove/i.test(en)) {
    return { policyClass: 'review', subCategory: 'lockbox-special', reason: 'Eureka/特殊lockbox。allowlist要確認', priority: 3 }
  }
  if (/\(Extreme\)|\(Savage\)|\(Unreal\)|\(Hard\)|Coil|Fracture|Amphitheatre|Facility|Turn \d|The /i.test(en) && !/^Crafted by/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'instance-title', reason: 'コンテンツ/instance正式名。Teamcraft lookup可', priority: 2 }
  }
  if (/^Heavensturn|^Moonfire|^Hatching-tide|^Starlight|^Little Ladies|^All Saints|^Valention|^The Rising|^Digital Fan Festival/i.test(en)) {
    return { policyClass: 'jp-target', subCategory: 'event-name', reason: 'イベント名JP正式表記あり', priority: 2 }
  }
  if (/^Record Keeper|^Wandering Minstrel|^Desynth|^South Horn|^Bicolor Gemstone Trader/i.test(en)) {
    return { policyClass: 'review', subCategory: 'npc-misc', reason: 'NPC/システム名。JP要確認', priority: 3 }
  }

  return { policyClass: 'review', subCategory: 'unclassified', reason: '個別JP正式表記要確認', priority: 4 }
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as SourceDictionaryEntry[]
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string; type?: string }>
  const dictMap = new Set(dictionary.filter((e) => e.en && e.ja && e.type !== 'metadata').map((e) => e.en!.trim()))

  const englishValues = new Set<string>()
  for (const entry of sourceDictionary.filter(isScoped)) {
    for (const value of [entry.contentName, ...(entry.acquisitionRoutes ?? []).flatMap((r) => [r.contentName, r.detail])]) {
      const text = value?.trim()
      if (text && !isJapanese(text)) englishValues.add(text)
    }
  }

  const fallback = [...englishValues].filter((v) => !dictMap.has(v)).sort((a, b) => a.localeCompare(b))
  const classified: ClassifiedItem[] = fallback.map((en) => ({ en, ...classifyPolicy(en) }))

  const counts = {
    'jp-target': classified.filter((c) => c.policyClass === 'jp-target').length,
    'english-keep': classified.filter((c) => c.policyClass === 'english-keep').length,
    review: classified.filter((c) => c.policyClass === 'review').length,
    'high-risk': classified.filter((c) => c.policyClass === 'high-risk').length,
  }

  const bySub = new Map<string, ClassifiedItem[]>()
  for (const item of classified) {
    const key = `${item.policyClass}:${item.subCategory}`
    const cur = bySub.get(key) ?? []
    cur.push(item)
    bySub.set(key, cur)
  }

  const subSummary = [...bySub.entries()]
    .map(([key, items]) => ({ key, count: items.length, samples: items.slice(0, 3).map((i) => i.en) }))
    .sort((a, b) => b.count - a.count)

  const jpTargetLowRisk = classified.filter(
    (c) => c.policyClass === 'jp-target' && (c.priority ?? 99) <= 2,
  )

  const output = {
    fallbackTotal: fallback.length,
    scopedEnglishTotal: englishValues.size,
    coveragePct: (((englishValues.size - fallback.length) / englishValues.size) * 100).toFixed(1),
    counts,
    subSummary,
    representatives: {
      'jp-target': classified.filter((c) => c.policyClass === 'jp-target').slice(0, 8).map((c) => ({ en: c.en, reason: c.reason })),
      'english-keep': classified.filter((c) => c.policyClass === 'english-keep').slice(0, 8).map((c) => ({ en: c.en, reason: c.reason })),
      review: classified.filter((c) => c.policyClass === 'review').slice(0, 8).map((c) => ({ en: c.en, reason: c.reason })),
      'high-risk': classified.filter((c) => c.policyClass === 'high-risk').slice(0, 8).map((c) => ({ en: c.en, reason: c.reason })),
    },
    jpTargetLowRiskCount: jpTargetLowRisk.length,
    projectedImprovement: {
      lowRiskJpTarget: jpTargetLowRisk.length,
      coverageAfterLowRisk: (((englishValues.size - fallback.length + jpTargetLowRisk.length) / englishValues.size) * 100).toFixed(1) + '%',
      allJpTarget: counts['jp-target'],
      coverageAfterAllJpTarget: (((englishValues.size - fallback.length + counts['jp-target']) / englishValues.size) * 100).toFixed(1) + '%',
    },
    classified,
  }

  await writeFile('.tmp-audit-policy-phase-a/fallback-reclassify-audit.json', JSON.stringify(output, null, 2))
  console.log(JSON.stringify({ counts, subSummary: subSummary.slice(0, 20), projectedImprovement: output.projectedImprovement }, null, 2))
}

main()
