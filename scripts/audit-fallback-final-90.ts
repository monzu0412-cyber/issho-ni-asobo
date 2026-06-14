import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type PolicyClass = 'english-keep' | 'jp-target' | 'review' | 'high-risk'

type ClassifiedItem = {
  en: string
  policyClass: PolicyClass
  subCategory: string
  reason: string
  jpHint?: string
  implementationRisk?: 'low' | 'medium' | 'high'
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const OUTPUT_DIR = resolve(ROOT, '.tmp-audit-policy-phase-a')

const MANUAL_CLASSIFICATION: Record<string, Omit<ClassifiedItem, 'en'>> = {
  "A Realm Reborn Collector's Edition": { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のCollector\'s Edition表記' },
  'A Realm Reborn Pre-order': { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のPre-order表記' },
  "Dawntrail Collector's Edition": { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のCollector\'s Edition表記' },
  'Dawntrail Pre-order': { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のPre-order表記' },
  "Endwalker Collector's Edition": { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のCollector\'s Edition表記' },
  'Endwalker Pre-order': { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のPre-order表記' },
  "Heavensward Collector's Edition": { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のCollector\'s Edition表記' },
  'Heavensward Pre-order': { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のPre-order表記' },
  "Shadowbringers Collector's Edition": { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のCollector\'s Edition表記' },
  'Shadowbringers Pre-order': { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のPre-order表記' },
  "Stormblood Collector's Edition": { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のCollector\'s Edition表記' },
  'Stormblood Pre-order': { policyClass: 'english-keep', subCategory: 'edition-preorder', reason: 'JP Mog Stationでも英語のPre-order表記' },

  'Butterfinger Promotion (NA Only)': { policyClass: 'english-keep', subCategory: 'external-promo', reason: '北米限定外部プロモ名' },
  'Gong Cha Promotion': { policyClass: 'english-keep', subCategory: 'external-promo', reason: '外部飲料店コラボプロモ名' },
  'Lawson Promotion (Japan Only)': { policyClass: 'english-keep', subCategory: 'external-promo', reason: '日本限定外部プロモ名' },
  'Mountain Dew Promotion (NA Only)': { policyClass: 'english-keep', subCategory: 'external-promo', reason: '北米限定外部プロモ名' },
  'Twitch Campaign (2021)': { policyClass: 'english-keep', subCategory: 'external-promo', reason: 'Twitch配信キャンペーン名' },
  'Twitch Campaign (December 2024)': { policyClass: 'english-keep', subCategory: 'external-promo', reason: 'Twitch配信キャンペーン名' },
  'Twitch Campaign (July 2024)': { policyClass: 'english-keep', subCategory: 'external-promo', reason: 'Twitch配信キャンペーン名' },
  'Fly the Falcon Mount Campaign': { policyClass: 'english-keep', subCategory: 'external-promo', reason: '期間限定マウントキャンペーン名' },
  'In-Game Item Campaign': { policyClass: 'english-keep', subCategory: 'external-promo', reason: '汎用インゲームキャンペーン名' },
  'Recruit a Friend Campaign reward': { policyClass: 'english-keep', subCategory: 'campaign-reward', reason: 'フレンド招待キャンペーン報酬ラベル' },
  'Online Store (China Only)': { policyClass: 'english-keep', subCategory: 'online-store-region', reason: '中国限定オンラインストア表記' },

  'Cosmic Fortune - Auxesia': { policyClass: 'english-keep', subCategory: 'cosmic-fortune', reason: 'Cosmic FortuneはJP UIでも英語。ゾーン名も英語固有名', jpHint: 'Cosmic Fortune - Auxesia' },
  'Cosmic Fortune - Oizys': { policyClass: 'english-keep', subCategory: 'cosmic-fortune', reason: 'Cosmic FortuneはJP UIでも英語。ゾーン名も英語固有名', jpHint: 'Cosmic Fortune - Oizys' },
  'Cosmic Fortune - Phaenna': { policyClass: 'english-keep', subCategory: 'cosmic-fortune', reason: 'Cosmic FortuneはJP UIでも英語。ゾーン名も英語固有名', jpHint: 'Cosmic Fortune - Phaenna' },
  'Cosmic Fortune - Sinus Ardonum': { policyClass: 'english-keep', subCategory: 'cosmic-fortune', reason: 'Cosmic FortuneはJP UIでも英語。ゾーン名も英語固有名', jpHint: 'Cosmic Fortune - Sinus Ardonum' },

  'Dragon Quest X Collaboration': { policyClass: 'jp-target', subCategory: 'collaboration', reason: 'FFコラボと同系。JP正式表記あり', jpHint: 'DRAGON QUEST X コラボレーション', implementationRisk: 'low' },
  'Yo-kai Watch Collaboration': { policyClass: 'jp-target', subCategory: 'collaboration-yokai', reason: '公式イベント名は妖怪ウォッチ', jpHint: '妖怪ウォッチ コラボレーション', implementationRisk: 'low' },
  'Yo-kai Watch Collaboration - Obtain 13 Yo-kai Minions': { policyClass: 'jp-target', subCategory: 'collaboration-yokai', reason: 'コラボ達成条件句テンプレ化可', jpHint: '妖怪ウォッチ コラボレーション - 妖怪ミニオン13種を獲得', implementationRisk: 'low' },
  'Yo-kai Watch Collaboration - Obtain 13 Yo-kai Weapons': { policyClass: 'jp-target', subCategory: 'collaboration-yokai', reason: 'コラボ達成条件句テンプレ化可', jpHint: '妖怪ウォッチ コラボレーション - コラボ武器13種を獲得', implementationRisk: 'low' },
  'Yo-kai Watch Collaboration - Obtain 17 Yo-kai Weapons': { policyClass: 'jp-target', subCategory: 'collaboration-yokai', reason: 'コラボ達成条件句テンプレ化可', jpHint: '妖怪ウォッチ コラボレーション - コラボ武器17種を獲得', implementationRisk: 'low' },

  'One Forest': { policyClass: 'jp-target', subCategory: 'quest-name', reason: 'JP Lodestone正式クエスト名', jpHint: 'ひとつの大きな森として！', implementationRisk: 'low' },
  'Protectors of the Wood': { policyClass: 'jp-target', subCategory: 'quest-name', reason: 'JP Lodestone正式クエスト名', jpHint: 'ロンカの守護者たち', implementationRisk: 'low' },

  'South Horn - Bronze Coffer': { policyClass: 'jp-target', subCategory: 'occult-crescent-coffer', reason: '蜃気楼の島南部宝箱。テンプレ1本で4件吸収可', jpHint: '蜃気楼の島：南征編 - 銅箱', implementationRisk: 'low' },
  'South Horn - Bronze/Silver Coffer': { policyClass: 'jp-target', subCategory: 'occult-crescent-coffer', reason: '蜃気楼の島南部宝箱。テンプレ1本で4件吸収可', jpHint: '蜃気楼の島：南征編 - 銅箱/銀箱', implementationRisk: 'low' },
  'South Horn - Pot/Bunny Coffer': { policyClass: 'jp-target', subCategory: 'occult-crescent-coffer', reason: 'おねだりポット/しあわせうさぎ宝箱', jpHint: '蜃気楼の島：南征編 - ポット/うさぎ箱', implementationRisk: 'medium' },
  'South Horn - Silver Coffer': { policyClass: 'jp-target', subCategory: 'occult-crescent-coffer', reason: '蜃気楼の島南部宝箱。テンプレ1本で4件吸収可', jpHint: '蜃気楼の島：南征編 - 銀箱', implementationRisk: 'low' },

  'Mech Pilot Reward - Oizys': { policyClass: 'jp-target', subCategory: 'mech-pilot-reward', reason: 'メカオペ・パイロット報酬行', jpHint: 'パイロット報酬 - Oizys', implementationRisk: 'medium' },
  'Mech Pilot Reward - Phaenna': { policyClass: 'jp-target', subCategory: 'mech-pilot-reward', reason: 'メカオペ・パイロット報酬行', jpHint: 'パイロット報酬 - Phaenna', implementationRisk: 'medium' },
  'Mech Pilot Reward - Sinus Ardonum': { policyClass: 'jp-target', subCategory: 'mech-pilot-reward', reason: 'メカオペ・パイロット報酬行', jpHint: 'パイロット報酬 - Sinus Ardonum', implementationRisk: 'medium' },

  'Dalriada - Final Boss Chest': { policyClass: 'jp-target', subCategory: 'bozja-final-chest', reason: '旗艦ダル・リアータ最終宝箱行', jpHint: '旗艦ダル・リアータ - 最終ボス宝箱', implementationRisk: 'medium' },
  'Delubrum Reginae - Final Boss Chests': { policyClass: 'jp-target', subCategory: 'bozja-final-chest', reason: 'デルブルム・レジーナ最終宝箱行', jpHint: 'デルブルム・レジーナ - 最終ボス宝箱', implementationRisk: 'medium' },

  'Fan Festival 2016-17': { policyClass: 'review', subCategory: 'fan-festival', reason: 'FAN FESTIVAL表記のJP正式名要確認（英語/ファンフェス混在）' },
  'Fan Festival 2018-19': { policyClass: 'review', subCategory: 'fan-festival', reason: 'FAN FESTIVAL表記のJP正式名要確認（英語/ファンフェス混在）' },
  'Moogle Treasure Trove Event': { policyClass: 'review', subCategory: 'moogle-trove', reason: 'モグリトレジャーハント等の正式イベント名要確認' },
  "The Landsguard's New Clothes": { policyClass: 'review', subCategory: 'quest-name-unverified', reason: 'JPクエスト名のLodestone/Teamcraft確認未了' },
  'Calamity Salvager - 15 Gold Chocobo Feathers (Recruit a Friend Campaign)': { policyClass: 'review', subCategory: 'vendor-campaign-composite', reason: 'NPC+通貨+キャンペーン複合。dualNpc拡張設計要' },
  'Calamity Salvager - 8 Gold Chocobo Feathers (Recruit a Friend Campaign)': { policyClass: 'review', subCategory: 'vendor-campaign-composite', reason: 'NPC+通貨+キャンペーン複合。dualNpc拡張設計要' },

  'Southern Front Lockbox / Zadnor Lockbox': { policyClass: 'high-risk', subCategory: 'lockbox-slash-composite', reason: '2種ロックボックスのスラッシュ連結。部分翻訳/誤分割リスク', implementationRisk: 'high' },
  'The Baldesion Arsenal (Eureka Hydatos) - Absolute Virtue Chest': { policyClass: 'high-risk', subCategory: 'eureka-paren-chest', reason: '括弧付きEureka複合行。既存lockbox/instanceテンプレとの整合要確認', implementationRisk: 'high' },
}

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function isScoped(entry: { category1?: string; subCategory?: string }) {
  return entry.category1 === '譜面' || entry.subCategory === '譜面' || entry.category1 === 'マウント' || entry.category1 === 'ミニオン'
}

function classifyFallback(en: string): ClassifiedItem {
  if (MANUAL_CLASSIFICATION[en]) {
    return { en, ...MANUAL_CLASSIFICATION[en] }
  }

  if (en.startsWith('Item code included with ')) {
    return {
      en,
      policyClass: 'english-keep',
      subCategory: 'item-code-product',
      reason: '商品名・サントラ名・アートブック名はJP公式でも英語',
    }
  }

  return {
    en,
    policyClass: 'review',
    subCategory: 'unclassified',
    reason: '未分類。個別確認要',
  }
}

async function main() {
  const source = JSON.parse(await readFile(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')) as Array<{
    category1?: string
    subCategory?: string
    contentName?: string | null
    acquisitionRoutes?: Array<{ contentName?: string; detail?: string }>
  }>
  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<{ en?: string; ja?: string; type?: string; counts?: { dictionaryEntries?: number; englishFallback?: number } }>
  const dictSet = new Set(dictionary.filter((entry) => entry.en && entry.ja && entry.type !== 'metadata').map((entry) => entry.en!.trim()))
  const meta = dictionary.find((entry) => entry.type === 'metadata')

  const englishValues = new Set<string>()
  for (const entry of source.filter(isScoped)) {
    for (const value of [entry.contentName, ...(entry.acquisitionRoutes ?? []).flatMap((route) => [route.contentName, route.detail])]) {
      const text = value?.trim()
      if (text && !isJapanese(text)) {
        englishValues.add(text)
      }
    }
  }

  const fallback = [...englishValues].filter((value) => !dictSet.has(value)).sort((a, b) => a.localeCompare(b))
  const classified = fallback.map(classifyFallback)

  const counts = {
    'english-keep': classified.filter((item) => item.policyClass === 'english-keep').length,
    'jp-target': classified.filter((item) => item.policyClass === 'jp-target').length,
    review: classified.filter((item) => item.policyClass === 'review').length,
    'high-risk': classified.filter((item) => item.policyClass === 'high-risk').length,
  }

  const bySubCategory = new Map<string, ClassifiedItem[]>()
  for (const item of classified) {
    const key = `${item.policyClass}::${item.subCategory}`
    const list = bySubCategory.get(key) ?? []
    list.push(item)
    bySubCategory.set(key, list)
  }

  const subCategoryBreakdown = [...bySubCategory.entries()]
    .map(([key, items]) => ({ key, count: items.length, items: items.map((item) => item.en) }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))

  const lowRiskCandidates = classified.filter(
    (item) => item.policyClass === 'jp-target' && (item.implementationRisk ?? 'low') === 'low',
  )
  const mediumRiskJpTarget = classified.filter(
    (item) => item.policyClass === 'jp-target' && item.implementationRisk === 'medium',
  )

  const dictCount = meta?.counts?.dictionaryEntries ?? dictSet.size
  const currentCoverage = ((dictCount / englishValues.size) * 100).toFixed(1)

  const output = {
    summary: {
      scopedUniqueEnglish: englishValues.size,
      dictionaryEntries: dictCount,
      fallbackTotal: fallback.length,
      currentCoveragePercent: currentCoverage,
      counts,
    },
    subCategoryBreakdown,
    lists: {
      englishKeep: classified.filter((item) => item.policyClass === 'english-keep'),
      jpTarget: classified.filter((item) => item.policyClass === 'jp-target'),
      review: classified.filter((item) => item.policyClass === 'review'),
      highRisk: classified.filter((item) => item.policyClass === 'high-risk'),
    },
    lowRiskImplementationCandidates: lowRiskCandidates,
    projectedImprovement: {
      lowRiskOnly: {
        resolved: lowRiskCandidates.length,
        dictionaryEntries: dictCount + lowRiskCandidates.length,
        fallback: fallback.length - lowRiskCandidates.length,
        coveragePercent: (((dictCount + lowRiskCandidates.length) / englishValues.size) * 100).toFixed(1),
      },
      allJpTarget: {
        resolved: counts['jp-target'],
        dictionaryEntries: dictCount + counts['jp-target'],
        fallback: fallback.length - counts['jp-target'],
        coveragePercent: (((dictCount + counts['jp-target']) / englishValues.size) * 100).toFixed(1),
      },
      lowAndMediumJpTarget: {
        resolved: counts['jp-target'],
        dictionaryEntries: dictCount + counts['jp-target'],
        fallback: fallback.length - counts['jp-target'],
        coveragePercent: (((dictCount + counts['jp-target']) / englishValues.size) * 100).toFixed(1),
        note: 'medium risk items included in jp-target total',
      },
      maximumTheoretical: {
        resolved: counts['jp-target'] + counts.review,
        dictionaryEntries: dictCount + counts['jp-target'] + counts.review,
        fallback: counts['english-keep'] + counts['high-risk'],
        coveragePercent: (((dictCount + counts['jp-target'] + counts.review) / englishValues.size) * 100).toFixed(1),
        note: 'review items resolved + english-keep/high-risk remain fallback',
      },
    },
    mediumRiskJpTarget,
    classified,
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(resolve(OUTPUT_DIR, 'fallback-final-90-audit.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    fallbackTotal: fallback.length,
    counts,
    lowRiskCandidates: lowRiskCandidates.length,
    projected: output.projectedImprovement,
  }, null, 2))
}

main()
