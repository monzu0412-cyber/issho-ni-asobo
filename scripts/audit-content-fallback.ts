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

const GENERIC_EXACT: Record<string, string> = {
  Quest: 'クエスト',
  Achievement: 'アチーブメント',
  Event: 'イベント',
  Premium: 'プレミアム',
  FATE: 'FATE',
  Hunts: 'モブハント',
  PvP: 'PvP',
  Crafting: 'クラフト',
  Gathering: 'ギャザリング',
  Purchase: '購入',
  'Treasure Hunt': 'トレジャーハント',
  'Island Sanctuary': '無人島',
  'Online Store': 'オンラインストア',
  'Cosmic Exploration': '宇宙探索',
  'Southern Front Lockbox': '南側戦線のロックボックス',
  'Anemos Lockbox': 'アネモスのロックボックス',
  "Gold Voyagers' Record": 'ゴールド・ボイジャー・レコード',
  'Available for purchase on the online store or via promotional bonuses.': 'オンラインストアまたはプロモーション特典で入手可能',
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

type Classification = {
  type: 'manual-exact' | 'template'
  group: string
  jaHint?: string
}

function classifyGeneric(name: string): Classification | null {
  if (GENERIC_EXACT[name]) {
    return { type: 'manual-exact', group: name, jaHint: GENERIC_EXACT[name] }
  }

  if (/^\d[\d,]* MGP(?:\s*\(.+\))?$/.test(name)) {
    return { type: 'template', group: 'MGP', jaHint: '{amount} MGP' }
  }

  if (/^\d[\d,]* MGF(?:\s*\(.+\))?$/.test(name)) {
    return { type: 'template', group: 'MGF', jaHint: '{amount} MGF' }
  }

  if (/^\d[\d,]* Wolf Marks$/.test(name)) {
    return { type: 'template', group: 'Wolf Marks', jaHint: '{amount} ウルフマーク' }
  }

  if (/^\d[\d,]* (?:Flame|Serpent|Storm) Seals$/.test(name)) {
    return { type: 'template', group: 'GC Seals', jaHint: '{amount} {gc}シール' }
  }

  if (/^\d[\d,]* Allied Seals$/.test(name)) {
    return { type: 'template', group: 'Allied Seals', jaHint: '{amount} アライドシール' }
  }

  if (/^\d[\d,]* Centurio Seals$/.test(name)) {
    return { type: 'template', group: 'Centurio Seals', jaHint: '{amount} センチュリオンシール' }
  }

  if (/^\d[\d,]* Trophy Crystals$/.test(name)) {
    return { type: 'template', group: 'Trophy Crystals', jaHint: '{amount} トロフィークリスタル' }
  }

  if (/^\d[\d,]* Cosmocredits$/.test(name)) {
    return { type: 'template', group: 'Cosmocredits', jaHint: '{amount} コスモクレジット' }
  }

  if (/^\d[\d,]* Faux Leaves$/.test(name)) {
    return { type: 'template', group: 'Faux Leaves', jaHint: '{amount} フォー・リーフ' }
  }

  if (/^\d[\d,]* Bicolor Gemstones(?:\s*\(.+\))?$/.test(name)) {
    return { type: 'template', group: 'Bicolor Gemstones', jaHint: '{amount} 双極化晶薬' }
  }

  if (/^\d[\d,]* Bozjan Clusters$/.test(name)) {
    return { type: 'template', group: 'Bozjan Clusters', jaHint: '{amount} ボズヤ・クラスター' }
  }

  if (/^\d[\d,]* (?:Sacks of Nuts|Skybuilders' Scrips|Seafarer's Cowries)(?:\s*\(.+\))?$/.test(name)) {
    return { type: 'template', group: 'Scrips/Cowries/Sacks' }
  }

  if (/^\d[\d,]* Khloe's (?:Bronze|Silver|Gold) Certificate of Commendation$/.test(name)) {
    return { type: 'template', group: 'Khloe Certificate', jaHint: '{amount} クロエの{rank}推薦状' }
  }

  if (/^Timeworn .+ Map$/.test(name) || /^Timeworn .+\/.+ Map$/.test(name)) {
    return { type: 'template', group: 'Timeworn Map', jaHint: 'タイムワーン{map}の地図' }
  }

  if (/^Online Store - /i.test(name)) {
    return { type: 'template', group: 'Online Store - Set' }
  }

  if (/^Cosmic Fortune - /i.test(name)) {
    return { type: 'template', group: 'Cosmic Fortune' }
  }

  if (/^Subaquatic Voyages - /i.test(name)) {
    return { type: 'template', group: 'Subaquatic Voyages' }
  }

  if (/^Exploratory Voyages: /i.test(name)) {
    return { type: 'template', group: 'Exploratory Voyages' }
  }

  if (/^Pilgrim's Traverse - /i.test(name)) {
    return { type: 'template', group: "Pilgrim's Traverse Sack" }
  }

  if (/^Eureka .+ - /i.test(name) || /^Eureka Orthos - /i.test(name)) {
    return { type: 'template', group: 'Eureka Sack' }
  }

  if (/^The Palace of the Dead - /i.test(name)) {
    return { type: 'template', group: 'PotD Sack' }
  }

  if (/^Heaven-on-High - /i.test(name)) {
    return { type: 'template', group: 'HoH Sack' }
  }

  if (/^Final Fantasy .* Collaboration$/i.test(name)) {
    return { type: 'manual-exact', group: 'Collaboration' }
  }

  if (/^Item code included with /i.test(name)) {
    return { type: 'template', group: 'Item code bundle' }
  }

  if (/^Khloe's /i.test(name)) {
    return { type: 'template', group: 'Khloe Certificate' }
  }

  if (/^A Life of Adventure /i.test(name)) {
    return { type: 'template', group: 'Adventure achievement' }
  }

  if (/^Open to Victory /i.test(name)) {
    return { type: 'template', group: 'Open to Victory' }
  }

  if (/^The Leader of the Band /i.test(name)) {
    return { type: 'template', group: 'Leader of the Band' }
  }

  if (/^Tile and Error /i.test(name)) {
    return { type: 'template', group: 'Tile and Error' }
  }

  if (/^\d[\d,]* Enlightenment /i.test(name)) {
    return { type: 'template', group: 'Enlightenment tokens' }
  }

  if (/^Resistance Quartermaster - /i.test(name)) {
    return { type: 'template', group: 'Bozja Quartermaster' }
  }

  if (/^\*The Merchant's Tale\*$/i.test(name)) {
    return { type: 'manual-exact', group: "The Merchant's Tale", jaHint: 'ザ・マーチャンツ・テイル' }
  }

  if (/^FATE "/i.test(name)) {
    return { type: 'template', group: 'FATE named' }
  }

  if (/\(20\d{2}\)$/.test(name) && /Faire|Day|Wake|Celebration|tide|Heavensturn|The Rising/i.test(name)) {
    return { type: 'template', group: 'Event with year' }
  }

  return null
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as SourceDictionaryEntry[]
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string }>
  const dictMap = new Map(dictionary.filter((entry) => entry.en && entry.ja).map((entry) => [entry.en!.trim(), entry.ja!]))

  const scopedEntries = sourceDictionary.filter(isScoped)
  const englishValues = new Set<string>()
  const byCategory = {
    譜面: new Set<string>(),
    マウント: new Set<string>(),
    ミニオン: new Set<string>(),
  }

  for (const entry of scopedEntries) {
    const category = entry.category1 === '譜面' || entry.subCategory === '譜面'
      ? '譜面'
      : entry.category1 === 'マウント'
        ? 'マウント'
        : 'ミニオン'

    for (const value of [
      entry.contentName,
      ...(entry.acquisitionRoutes ?? []).flatMap((route) => [route.contentName, route.detail]),
    ]) {
      const text = value?.trim()
      if (text && !isJapanese(text)) {
        englishValues.add(text)
        byCategory[category].add(text)
      }
    }
  }

  const fallback = [...englishValues].filter((value) => !dictMap.has(value)).sort((a, b) => a.localeCompare(b))
  const classified = new Map<string, { type: string; group: string; jaHint?: string; items: string[] }>()
  const unclassified: string[] = []

  for (const name of fallback) {
    const classification = classifyGeneric(name)

    if (!classification) {
      unclassified.push(name)
      continue
    }

    const existing = classified.get(classification.group)
    if (existing) {
      existing.items.push(name)
      continue
    }

    classified.set(classification.group, {
      type: classification.type,
      group: classification.group,
      jaHint: classification.jaHint,
      items: [name],
    })
  }

  let manualExactCount = 0
  let templateCount = 0

  for (const group of classified.values()) {
    if (group.type === 'manual-exact') {
      manualExactCount += group.items.length
    } else {
      templateCount += group.items.length
    }
  }

  const genericTotal = manualExactCount + templateCount
  const currentCovered = englishValues.size - fallback.length
  const afterManual = currentCovered + manualExactCount
  const afterTemplate = currentCovered + genericTotal

  const groupCounts = [...classified.entries()]
    .map(([group, value]) => ({ group, type: value.type, count: value.items.length, jaHint: value.jaHint }))
    .sort((a, b) => b.count - a.count)

  const focusLabels = [
    'MGP', 'Online Store', 'Quest', 'Achievement', 'Event', 'Premium',
    'Cosmic Exploration', 'Bozjan Clusters', 'Trophy Crystals', 'Bicolor Gemstones',
    'Wolf Marks', 'Allied Seals', 'Centurio Seals', 'Sacks', 'Timeworn Map',
  ]

  const focusBreakdown = Object.fromEntries(focusLabels.map((label) => {
    const matches = fallback.filter((value) => {
      if (label === 'MGP') return /\bMGP\b/.test(value)
      if (label === 'Online Store') return /Online Store/i.test(value)
      if (label === 'Quest') return /^Quest$/.test(value)
      if (label === 'Achievement') return /^Achievement$/.test(value)
      if (label === 'Event') return /^Event$/.test(value) || /\bEvent\b/.test(value)
      if (label === 'Premium') return /^Premium$/.test(value)
      if (label === 'Cosmic Exploration') return /Cosmic Exploration/i.test(value)
      if (label === 'Bozjan Clusters') return /Bozjan Clusters/i.test(value)
      if (label === 'Trophy Crystals') return /Trophy Crystals/i.test(value)
      if (label === 'Bicolor Gemstones') return /Bicolor Gemstones/i.test(value)
      if (label === 'Wolf Marks') return /Wolf Marks/i.test(value)
      if (label === 'Allied Seals') return /Allied Seals/i.test(value)
      if (label === 'Centurio Seals') return /Centurio Seals/i.test(value)
      if (label === 'Sacks') return /Sacks of Nuts| - .+ Sack$/i.test(value)
      if (label === 'Timeworn Map') return /^Timeworn .+ Map$/i.test(value)
      return false
    })

    const grouped = matches.filter((value) => classifyGeneric(value) !== null).length
    return [label, { total: matches.length, genericGrouped: grouped, samples: matches.slice(0, 5) }]
  }))

  const mountMinionEnglish = new Set([...byCategory.マウント, ...byCategory.ミニオン])
  const mountMinionFallback = fallback.filter((value) => mountMinionEnglish.has(value))
  const mountMinionGeneric = mountMinionFallback.filter((value) => classifyGeneric(value) !== null).length

  const remainingBuckets: Record<string, string[]> = {}
  const addRemaining = (key: string, value: string) => {
    remainingBuckets[key] ??= []
    remainingBuckets[key].push(value)
  }

  for (const value of unclassified) {
    if (/^Crafted by /i.test(value)) {
      addRemaining('Crafted by ... (Tier2拡張候補)', value)
    } else if (/Quartermaster|Salvager|Purchase from| - \d/.test(value)) {
      addRemaining('Vendor/composite (Tier3拡張候補)', value)
    } else if (/Collector's Edition|Pre-order|Promotion|Recruit a Friend|Butterfinger/i.test(value)) {
      addRemaining('Edition/promo (手動辞書)', value)
    } else if (/Voyagers' Record|Ancient Record|Token Booklet|Relics|Vouchers|Chunks of|Sanguinite|Fête Tokens|Phials of|Vegetal/i.test(value)) {
      addRemaining('通貨/素材トークン (テンプレ候補)', value)
    } else if (/Hunts$|Extreme\)|Turn \d|Coil|Fracture|Amphitheatre|Facility|Voyages:/i.test(value)) {
      addRemaining('コンテンツ名 (Teamcraft/Tier2)', value)
    } else if (/Heavensturn|Moonfire|Heavenly|Rising|Valention|All Saints|Hatching|Starlight/i.test(value)) {
      addRemaining('イベント名 (Teamcraft/手動)', value)
    } else if (/Achievement|A Life of|Open to Victory|Leader of the Band|Tile and Error|All That She Carried|Ceremony of Eternal Bonding|Attend a/i.test(value)) {
      addRemaining('実績/クエスト句 (Teamcraft/手動)', value)
    } else if (/^[A-Z][a-z]+( [A-Z][a-z]+)*$/.test(value) && value.split(' ').length <= 3) {
      addRemaining('短い固有名詞 (手動/Teamcraft)', value)
    } else {
      addRemaining('その他固有名詞', value)
    }
  }

  const remainingSummary = Object.fromEntries(
    Object.entries(remainingBuckets)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([key, items]) => [key, { count: items.length, samples: items.slice(0, 5) }]),
  )

  console.log(JSON.stringify({
    scopedEnglishTotal: englishValues.size,
    currentDictCovered: currentCovered,
    currentCoveragePct: ((currentCovered / englishValues.size) * 100).toFixed(1),
    fallbackTotal: fallback.length,
    genericLabelGrouped: genericTotal,
    manualExactImprovement: manualExactCount,
    templateImprovement: templateCount,
    remainingAfterGeneric: unclassified.length,
    mountMinion: {
      uniqueEnglish: mountMinionEnglish.size,
      currentCovered: mountMinionEnglish.size - mountMinionFallback.length,
      currentCoveragePct: (((mountMinionEnglish.size - mountMinionFallback.length) / mountMinionEnglish.size) * 100).toFixed(1),
      fallbackTotal: mountMinionFallback.length,
      genericGrouped: mountMinionGeneric,
      projectedCoverageAfterGeneric: `${(((mountMinionEnglish.size - mountMinionFallback.length + mountMinionGeneric) / mountMinionEnglish.size) * 100).toFixed(1)}%`,
    },
    byCategoryFallback: Object.fromEntries(
      Object.entries(byCategory).map(([category, values]) => [category, [...values].filter((value) => !dictMap.has(value)).length]),
    ),
    focusBreakdown,
    groupCounts,
    manualExactGroups: groupCounts.filter((group) => group.type === 'manual-exact'),
    templateGroups: groupCounts.filter((group) => group.type === 'template'),
    representativeFallback: fallback.slice(0, 50),
    unclassifiedSamples: unclassified.slice(0, 40),
    remainingSummary,
    projectedCoverageAfterManual: `${((afterManual / englishValues.size) * 100).toFixed(1)}%`,
    projectedCoverageAfterGeneric: `${((afterTemplate / englishValues.size) * 100).toFixed(1)}%`,
    projectedDictEntriesAfterManual: dictMap.size + manualExactCount,
    projectedDictEntriesAfterGeneric: dictMap.size + genericTotal,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
