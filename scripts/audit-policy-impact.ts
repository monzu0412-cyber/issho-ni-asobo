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

type DictionaryEntry = {
  en?: string
  ja?: string
  tier?: string
  source?: string
  types?: string[]
}

type Category =
  | 'npc-name'
  | 'fate-name'
  | 'content-name'
  | 'system-name'
  | 'exchange-destination'
  | 'material-cost'
  | 'edition-promo'
  | 'other'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')

function isScoped(entry: SourceDictionaryEntry) {
  return entry.category1 === '譜面'
    || entry.subCategory === '譜面'
    || entry.category1 === 'マウント'
    || entry.category1 === 'ミニオン'
}

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function hasLatin(text: string) {
  return /[A-Za-z]/.test(text)
}

function parseVendorTripleLine(name: string) {
  const firstDash = name.indexOf(' - ')
  if (firstDash === -1) {
    return null
  }

  const secondDash = name.indexOf(' - ', firstDash + 3)
  if (secondDash === -1) {
    return null
  }

  return {
    npc: name.slice(0, firstDash).trim(),
    location: name.slice(firstDash + 3, secondDash).trim(),
    cost: name.slice(secondDash + 3).trim(),
  }
}

function classifyEnglishRetention(entry: DictionaryEntry, bucket: 'fallback' | 'dictionary'): Category {
  const en = entry.en?.trim() ?? ''
  const ja = entry.ja?.trim() ?? en
  const source = entry.source ?? ''

  if (/Collector'?s Edition|Pre-order|Pre-order Bonus|Digital Collector|Physical Collector|Starter Edition|Complete Edition|Online Store|Soundtrack|Orchestrion Roll$|Arrangement$|Orchestral Version$|FINAL FANTASY/i.test(en)) {
    return 'edition-promo'
  }

  if (/^FATE "/.test(en) || /FATE "/.test(en) || /^FATE「/.test(ja)) {
    return 'fate-name'
  }

  if (source === 'template-vendor' || /^.+(Quartermaster|Vendor|Junkmonger|Scrip Exchange|Gemstone Trader)/i.test(en)) {
    const parsed = parseVendorTripleLine(en)
    if (parsed) {
      if (hasLatin(parsed.npc) && !isJapanese(parsed.npc)) {
        return 'npc-name'
      }
      if (hasLatin(parsed.cost) && /FATE|Horns|Fragments|Cog|Bolts|Beads|Bottles|Scales|Magicogs|Tonic|Spoil/i.test(parsed.cost)) {
        return bucket === 'fallback' ? 'exchange-destination' : 'material-cost'
      }
      return 'exchange-destination'
    }
    return 'exchange-destination'
  }

  if (/Exploration|Lockbox|Voyagers' Record|Ancient Record|Cosmic Fortune|Treasure Trove|Quick Exploration|Gardening|Skybuilders|Bozja$|Eureka$|Tribal$|Voyages$|PvP|Hunts$|Sack|Orthos|Palace of the Dead|Heaven-on-High|Pilgrim's Traverse|Island Sanctuary|Gold Saucer|Crystalline Conflict|South Horn|Desynthesize|Gathered by|Subaquatic|Voyage|Ceremony of Eternal Bonding/i.test(en)) {
    return 'system-name'
  }

  if (source === 'template-craft' && / - /.test(en)) {
    return 'content-name'
  }

  if (source === 'template-instance-title' || source === 'teamcraft' && /\(Extreme\)|\(Savage\)|\(Unreal\)|The /i.test(en)) {
    return 'content-name'
  }

  if (/^[A-Z][a-z]+(?:'[a-z]+)? - /.test(en) && !/Quartermaster|Vendor|Crafted by|Gathered by|FATE|Exploration|Lockbox/i.test(en)) {
    return 'npc-name'
  }

  if (ja === en) {
    return 'other'
  }

  if (hasLatin(ja)) {
    return 'content-name'
  }

  return 'other'
}

function isOldPolicyEnglishKeep(entry: DictionaryEntry, bucket: 'fallback' | 'dictionary') {
  const en = entry.en?.trim() ?? ''
  const ja = entry.ja?.trim() ?? ''

  if (!en) {
    return false
  }

  if (bucket === 'fallback') {
    return true
  }

  if (ja === en) {
    return true
  }

  if (entry.source === 'template-vendor' && isVendorPartialEnglishKeep(en, ja)) {
    return true
  }

  if (entry.source === 'template-craft' && /^.+製作 - [A-Za-z]/.test(ja) && hasLatin(ja.split(' - ').at(-1) ?? '')) {
    return true
  }

  if (entry.source === 'template-online-store' && / - [A-Za-z]/.test(ja)) {
    return true
  }

  if (entry.source === 'manual' && ja === en) {
    return true
  }

  if (entry.source === 'teamcraft' && ja === en) {
    return true
  }

  return false
}

function isVendorPartialEnglishKeep(en: string, ja: string) {
  const parsedEn = parseVendorTripleLine(en)
  const parsedJa = parseVendorTripleLine(ja)
  if (!parsedEn || !parsedJa) {
    return hasLatin(ja) && ja !== en
  }

  const npcKeptEnglish = parsedEn.npc === parsedJa.npc && hasLatin(parsedJa.npc)
  const costKeptEnglish = parsedEn.cost === parsedJa.cost && hasLatin(parsedJa.cost)
  return npcKeptEnglish || costKeptEnglish
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as SourceDictionaryEntry[]
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<DictionaryEntry & { type?: string }>
  const dictEntries = dictionary.filter((entry) => entry.en && entry.ja)
  const dictMap = new Set(dictEntries.map((entry) => entry.en!.trim()))

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

  const fallbackEntries = [...englishValues]
    .filter((value) => !dictMap.has(value))
    .sort((a, b) => a.localeCompare(b))
    .map((en) => ({ en, ja: en, source: 'english-fallback' }))

  const dictionaryCandidates = dictEntries.filter((entry) => isOldPolicyEnglishKeep(entry, 'dictionary'))
  const fallbackCandidates = fallbackEntries.filter((entry) => isOldPolicyEnglishKeep(entry, 'fallback'))

  function summarize(entries: Array<DictionaryEntry & { source?: string }>, bucket: 'fallback' | 'dictionary') {
    const byCategory: Record<Category, number> = {
      'npc-name': 0,
      'fate-name': 0,
      'content-name': 0,
      'system-name': 0,
      'exchange-destination': 0,
      'material-cost': 0,
      'edition-promo': 0,
      other: 0,
    }

    const bySource: Record<string, number> = {}
    const samples: Record<Category, string[]> = {
      'npc-name': [],
      'fate-name': [],
      'content-name': [],
      'system-name': [],
      'exchange-destination': [],
      'material-cost': [],
      'edition-promo': [],
      other: [],
    }

    for (const entry of entries) {
      const category = classifyEnglishRetention(entry, bucket)
      byCategory[category] += 1
      const sourceKey = entry.source ?? 'unknown'
      bySource[sourceKey] = (bySource[sourceKey] ?? 0) + 1
      if (samples[category].length < 3) {
        samples[category].push(entry.en!)
      }
    }

    return { total: entries.length, byCategory, bySource, samples }
  }

  const dictSummary = summarize(dictionaryCandidates, 'dictionary')
  const fallbackSummary = summarize(fallbackCandidates, 'fallback')

  const combinedByCategory = Object.fromEntries(
    (Object.keys(dictSummary.byCategory) as Category[]).map((key) => [
      key,
      dictSummary.byCategory[key] + fallbackSummary.byCategory[key],
    ]),
  ) as Record<Category, number>

  console.log(JSON.stringify({
    auditPurpose: '旧方針(Teamcraft未収録→英語維持)影響候補の抽出。辞書再生成は行わない。',
    currentState: {
      dictionaryEntries: dictEntries.length,
      englishFallback: fallbackEntries.length,
      coveragePct: (((englishValues.size - fallbackEntries.length) / englishValues.size) * 100).toFixed(1),
    },
    dictionaryEnglishKeepCandidates: dictSummary,
    fallbackEnglishKeepCandidates: fallbackSummary,
    combinedByCategory,
    combinedTotal: dictSummary.total + fallbackSummary.total,
    notes: [
      'dictionary候補: 辞書登録済みだが英語部分を意図的に残している項目',
      'fallback候補: 辞書未登録の全151件（旧方針で未翻訳）',
      'categoryはヒューリスティック分類。再監査時にJPクライアント表記で確定',
      'edition-promoはJPクライアントでも英語表記のため、新方針でも英語維持の可能性が高い',
    ],
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
