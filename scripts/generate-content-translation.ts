import { readFile, writeFile } from 'node:fs/promises'
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

type TeamcraftRecord = {
  en?: string
  ja?: string
  name?: { en?: string; ja?: string }
}

type ContentTranslationEntry = {
  en: string
  ja: string
  tier: 'tier1-exact' | 'tier2-craft' | 'tier3-vendor' | 'tier4-template'
  source: string
  types: string[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const SOURCE_DICTIONARY_PATH = resolve(MANUAL_DIR, 'source_dictionary.json')
const OUTPUT_PATH = resolve(MANUAL_DIR, 'content_translation_dictionary.json')
const TEAMCRAFT_BASE =
  'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json'

const MANUAL_OVERRIDES: Record<string, string> = {
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
  "Gold Voyagers' Record": 'ゴールド・ボイジャー・レコード',
  '*The Merchant\'s Tale*': 'ザ・マーチャンツ・テイル',
  'Available for purchase on the online store or via promotional bonuses.':
    'オンラインストアまたはプロモーション特典で入手可能',
  'Final Fantasy XI Collaboration': 'FINAL FANTASY XI コラボレーション',
  'Final Fantasy XV Collaboration': 'FINAL FANTASY XV コラボレーション',
  'Final Fantasy XVI Collaboration': 'FINAL FANTASY XVI コラボレーション',
  'Dragon Quest X Collaboration': 'DRAGON QUEST X コラボレーション',
  'Yo-kai Watch Collaboration': '妖怪ウォッチ コラボレーション',
  'One Forest': 'ひとつの大きな森として！',
  'Protectors of the Wood': 'ロンカの守護者たち',
  'Moogle Treasure Trove Event': 'モグモグ★コレクション',
  "The Landsguard's New Clothes": '勇連隊の装備を完成させよ！',
  'Fan Festival 2016-17': 'ファンフェスティバル 2016-17',
  'Fan Festival 2018-19': 'ファンフェスティバル 2018-19',
  'Ceremony of Eternal Bonding': 'エターナルセレモニー',
  'Available if registered in the Companion app': 'コンパニオンアプリ登録で入手可能',
  'Recruit a Friend Campaign reward': '友達招待キャンペーン報酬',
  'Quest "Dreams Come True" (Requires Loporrits Rank 8)':
    'クエスト「夢を叶えるレポリット」（レポリット族ランク8必要）',
}

/** Phase E-2c: explicit English-keep entries (en === ja). */
const ENGLISH_KEEP_FIX: Record<string, true> = {
  'Item code included with Meister Quality Figure Hydaelyn & Zodiark': true,
  'Item code included with Meister Quality Figure Odin': true,
  'Item code included with Meister Quality Figure Omega': true,
  'Item code included with Meister Quality Figure Shiva': true,
  'Item code included with Meister Quality Figure Ultima, the High Seraph': true,
  'KFC Promotion (Japan Only)': true,
  'Jollibee Promotion (NA Only)': true,
  'Cosmic Fortune - Phaenna': true,
  'Cosmic Fortune - Sinus Ardonum': true,
}

const DUNGEON_SACK_LABELS: Record<string, string> = {
  'Eureka Orthos': 'オルト・エウレカ',
  'The Palace of the Dead': '死者の宮殿',
  'Heaven-on-High': 'アメノミハシラ',
  "Pilgrim's Traverse": 'ピルグリム・トラバース',
}

const DUNGEON_SACK_RANK_LABELS: Record<string, Record<string, string>> = {
  'The Palace of the Dead': {
    'Bronze Sack': '埋もれた財宝G1',
    'Gold Sack': '埋もれた財宝G4',
    'Iron/Silver Sack': '埋もれた財宝G2/G3',
    'Iron/Silver/Gold Sack': '埋もれた財宝G2/G3/G4',
  },
  'Heaven-on-High': {
    'Any Sack': '埋もれた財宝（任意）',
    'Silver Sack': '埋もれた財宝【壱】',
    'Gold Sack': '埋もれた財宝【弐】',
    'Platinum Sack': '埋もれた財宝【参】',
    'Gold/Platinum Sack': '埋もれた財宝【弐】/【参】',
    'Silver/Gold Sack': '埋もれた財宝【壱】/【弐】',
    'Silver/Platinum Sack': '埋もれた財宝【壱】/【参】',
  },
  'Eureka Orthos': {
    'Bronze/Silver Sack': '埋もれた財宝【I】/【II】',
    'Silver Sack': '埋もれた財宝【II】',
    'Gold Sack': '埋もれた財宝【III】',
    'Silver/Gold Sack': '埋もれた財宝【II】/【III】',
  },
  "Pilgrim's Traverse": {
    'Sack of First Light': '輝かしき財宝',
    'Silver Sack': '埋もれた財宝【三級】',
    'Gold Sack': '埋もれた財宝【二級】',
    'Platinum Sack': '埋もれた財宝【一級】',
    'Gold/Platinum Sack': '埋もれた財宝【二級】/【一級】',
    'Silver/Gold Sack': '埋もれた財宝【三級】/【二級】',
  },
}

const EVENT_BASE_LABELS: Record<string, string> = {
  "All Saints' Wake": 'オールセインツデー',
  'Digital Fan Festival': 'デジタルファンフェスティバル',
  'Fan Festival': 'ファンフェスティバル',
  'Hatching-tide': 'ハッチング・タイド',
  'Heavensturn': 'ヘヴンターン',
  "Little Ladies' Day": 'リトルレディズデー',
  "Little Ladies' Day & Hatching-tide": 'リトルレディズデー＆ハッチング・タイド',
  'Moonfire Faire': 'ムーンファイア・フェア',
  'The Make It Rain Campaign': 'メイク・イット・レイン・キャンペーン',
  'The Rising': 'ライジング',
  'The Starlight Celebration': 'スターライト・セレブレーション',
  "Valentione's Day": 'ヴァレンティオンデー',
}

const SUBAQUATIC_REGION_LABELS: Record<string, string> = {
  'Deep-sea Site': '溺没海',
  'Sea of Ash': '灰海',
  'Sea of Jade': '翠浪海',
  'Sirensong Sea': 'セイレーン海',
  'South Indigo Deep': '南蒼茫洋',
  'The Lilac Sea': '紫礁海',
  'The Northern Empty': '北洋',
}

const CRAFT_JOB_LABELS: Record<string, string> = {
  Alchemist: '錬金術師',
  Carpenter: '木工師',
  Blacksmith: '鍛冶師',
  Armorer: '甲冑師',
  Goldsmith: '彫金師',
  Leatherworker: '革細工師',
  Weaver: '裁縫師',
  Culinarian: '調理師',
}

const STANDALONE_CURRENCY_ITEM_LABELS: Record<string, string> = {
  'Enlightenment Silver Pieces': '十二都市銀貨',
  'Enlightenment Gold Pieces': '十二都市金貨',
  'Faux Leaves': '幻の葉',
  Cosmocredits: 'コスモクレジット',
  'Vegetal Vouchers': 'おやさい券',
  'Fête Tokens': 'フェトゥ参加証',
  'Auxesia Token Booklets': '惑星アウクセシア探索計画の証書',
  'Oizys Token Booklets': '惑星オイジュス探索計画の証書',
  'Phaenna Token Booklets': '惑星パエンナ探索計画の証書',
  'First Light Relics': 'ピルグリム・トラバースの石片',
  'Chunks of Sanguinite': '力の魔石',
  'Phials of Luminous Oil': 'リュクスオイル',
  "Bronze Voyagers' Record": '先駆者文明の記録:白銅',
  "Silver Voyagers' Record": '先駆者文明の記録:青銀',
  "Bronze/Silver Ancient Record": '古代の記録:銅/銀',
  "Bronze/Silver Voyagers' Record": '先駆者文明の記録:白銅/青銀',
  "Silver/Gold Voyagers' Record": '先駆者文明の記録:青銀/金',
  'Ananta Dreamstaves': 'アナンタ魔金錫貨',
  'Hammered Frogments': 'ドワーフ緑硬貨',
  'Mythic Clan Mark Logs': '傑物クラン員の手記',
  'Fragments of Illumed Aetherpool Glass': '光耀の魔器片',
  'Empyrean Potsherds': '天之土器片',
  'Aloalo Potsherds': 'アロアロ島の遺物',
  'Rokkon Potsherds': '六根山の遺物',
  'Corvosi Potsherds': 'コルヴォの遺物',
  "Sil'dihn Potsherds": 'シラディハの遺物',
}

const ACHIEVEMENT_ROUTE_LABELS: Record<string, string> = {
  'All That She Carried': '母の夢、農地の未来',
  'Tasteful Memories': 'はらへり旅情：完結篇',
  'Ceremony of Eternal Bonding (Gold/Platinum)': 'エターナルセレモニー（ゴールド/プラチナ）',
  'Attend a Ceremony of Eternal Bonding (Gold/Platinum)': 'エターナルセレモニーに参加（ゴールド/プラチナ）',
}

const SOUTH_HORN_COFFER_LABELS: Record<string, string> = {
  'Bronze Coffer': '銅箱',
  'Silver Coffer': '銀箱',
  'Bronze/Silver Coffer': '銅箱/銀箱',
  'Pot/Bunny Coffer': 'ポット/うさぎ箱',
}

const BOZJA_LOCKBOX_LABELS: Record<string, string> = {
  'Southern Front Lockbox': '南方戦線のロックボックス',
  'Zadnor Lockbox': '高原のロックボックス',
}

const BOZJA_FINAL_BOSS_CHEST_LABELS: Record<string, string> = {
  Dalriada: '旗艦ダル・リアータ',
  'Delubrum Reginae': 'デルブルム・レジーナ',
}

const MECH_PILOT_ZONE_LABELS: Record<string, string> = {
  Oizys: '惑星オイジュス',
  Phaenna: '惑星パエンナ',
  'Sinus Ardonum': '焦がれの入江',
}

const CRAFT_SOURCE_ALIASES: Record<string, string> = {
  "Hell's Kier (Extreme)": "Hells' Kier (Extreme)",
  "The Minstrel Balad: Shinryu's Domain": "The Minstrel's Ballad: Shinryu's Domain",
}

const CRAFT_SOURCE_MANUAL_JA: Record<string, string> = {
  'The Binding Coil of Bahamut -Turn 1, 2, 4 and 5':
    '大迷宮バハムート：邂逅編1/2/4/5',
  'Level 40-60 Treasure Maps': 'レベル40-60 トレジャーマップ',
  "The Minstrel's Ballad: Endsinger's Aria": '終極の戦い',
}

const GATHER_JOB_LABELS: Record<string, string> = {
  Botanist: '園芸師',
  Miner: '採掘師',
  Fisher: '漁師',
}

const SYSTEM_SHORT_LABELS: Record<string, string> = {
  Bozja: 'ボズヤ',
  Eureka: 'エウレカ',
  Gardening: 'ガーデニング',
  Skybuilders: 'スカイビルダー',
  'Gold Saucer': 'ゴールドソーサー',
  Tribal: 'トライバル',
  Voyages: 'ボイジャー',
  'Crystalline Conflict: Random Drop': 'クリスタライン・コンフリクト：ランダムドロップ',
}

const EXPLORATION_TYPE_LABELS: Record<string, string> = {
  'Field Exploration': 'フィールド探索',
  'Highland Exploration': 'ハイランド探索',
  'Waterside Exploration': '水辺探索',
  'Woodland Exploration': '林地探索',
}

const EXPLORATION_RANK_LABELS: Record<string, string> = {
  'Quick Exploration': 'クイック探索',
  'Field Exploration XIII': 'フィールド探索XIII',
  'Field Exploration XXII': 'フィールド探索XXII',
  'Field Exploration XXV': 'フィールド探索XXV',
  'Field Exploration XXVIII': 'フィールド探索XXVIII',
  'Highland Exploration XIII': 'ハイランド探索XIII',
  'Highland Exploration XIV': 'ハイランド探索XIV',
  'Highland Exploration XXII': 'ハイランド探索XXII',
  'Highland Exploration XXV': 'ハイランド探索XXV',
  'Highland Exploration XXVIII': 'ハイランド探索XXVIII',
  'Highland Exploration XXXI': 'ハイランド探索XXXI',
  'Waterside Exploration XIII': '水辺探索XIII',
  'Waterside Exploration XXII': '水辺探索XXII',
  'Waterside Exploration XXV': '水辺探索XXV',
  'Waterside Exploration XXVIII': '水辺探索XXVIII',
  'Waterside Exploration XXXI': '水辺探索XXXI',
  'Woodland Exploration XXII': '林地探索XXII',
  'Woodland Exploration XXV': '林地探索XXV',
  'Woodland Exploration XXVIII': '林地探索XXVIII',
  'Woodland Exploration XXXI': '林地探索XXXI',
}

const EUREKA_LOCKBOX_ITEM_ALLOWLIST = new Set([
  'Cold-warped Lockbox',
  'Heat-warped Lockbox',
  'Moisture-warped Lockbox',
])

const HAPPY_BUNNY_LOCKBOX_LABEL = 'Happy Bunny Lockbox'

const VOYAGE_POINT_LABELS: Record<string, string> = {
  'The Mystic Basin': '神秘の海盆',
  'Deep-sea Site 5': '溺没海05',
  'The Rimilala Shelf': 'リミララ海溝大傾斜',
  'Flickering Dip': '残照の白谷',
  'Sirensong Sea 5': 'セイレーン海05',
  'Bellflower Flood': '桔梗海溝中央',
}

const EUREKA_INSTANCE_MANUAL_JA: Record<string, string> = {
  'The Baldesion Arsenal': 'バルデシオンアーセナル',
}

const BOZJA_ZONE_INSTANCE_ALLOWLIST: Record<string, string> = {
  'The Dalriada': '旗艦ダル・リアータ攻略戦',
}

/** Phase A-3: unique vendor NPCs (JP client official names). B/C categories excluded. */
const VENDOR_NPC_LABELS: Record<string, string> = {
  Trisassant: 'トリザサン',
  Eschina: 'エシナ',
  Madhura: 'マドゥラ',
  Nesvaaz: 'ネズヴァズ',
  "Uah'shepya": 'ワフセパ',
  "Amalj'aa Vendor": 'アマルジャ族のよろず屋',
  Coiningway: 'コイニングウェイ',
  'E-Una-Kotor': 'エ・ウナ・コトロ',
  'Luna Vanu': '商人のルナバヌ',
  'Peculiar Goblin': '不思議なゴブリン族',
  Shikitahe: 'シキタヘ',
  'Sylphic Vendor': 'シルフ族のよろず屋',
  'Vath Stickpeddler': 'アキンド',
  'Yuqurl Manl': 'ユクルリ・マノル',
  Edelina: '稀物商 エデリーナ',
  Fathard: 'ファサード',
  Ghanta: 'ガンター',
  Gyosho: 'ギョショウ',
  Halden: '広域交易商 ハルデン',
  'Ixali Vendor': 'イクサル族のよろず屋',
  Jonathas: 'ジョナサス',
  'Jul Oul': 'ユル＝オール',
  'Kobold Vendor': 'コボルド族のよろず屋',
  Mizutt: 'ミズット',
  'Mogmul Mogbelly': '大食いのモグムリ',
  Nacille: '広域交易商 ナシル',
  Pavli: 'パーブリ',
  Rarkorgor: 'ラーコーゴー',
  'Ryubool Ja': 'リュブージャ',
  'Sahagin Vendor': 'サハギン族のよろず屋',
  'Sul Lad': '広域交易商 スール＝ラド',
  'Veerul Ja': 'ヴェールジャ',
  'Amber Trader': '稀少琥珀商人',
  Ardolain: 'アルドラン',
  Auriana: 'オーリアナ',
  Bertana: 'ベルタナ',
  Chachamun: '武具屋チャチャムン',
  Enie: 'エニー',
  'Goushs Ooan': '広域交易商 ゴウスィー・オーン',
  Gramsol: '広域交易商 グラムソル',
  'Maudlin Latool Ja': '泣男のラトージャ',
  'N-1499': '広域交易商 N-1499',
  'Rral Wuruq': '広域交易商 ラルルック',
  Siulmet: '広域交易商 シュルメ',
  Tepli: '広域交易商 テープリ',
  Zumutt: '広域交易商 ズムット',
  Aisara: '広域交易商 アイサラ',
  'Bango Zango': 'ブルゲール商会 バンゴ・ザンゴ',
  Beryl: '広域交易商 ベリル',
  'Boughbury Trader': 'バウバリー村の商人',
  'Confederate Custodian': '海賊衆の資材係',
  Faezbroes: '広域交易商 フェーズブルース',
  Frine: 'よろず屋 フリヌ',
  Gadfrid: '広域交易商 ガドフリッド',
  'Giant Beaver': 'ジャイアントビーバー',
  'Haneko Burneko': '雑貨商人 ハネコ・ブンネコ',
  Hismena: 'ヒスメナ',
  'Junkmonger Nonoroon': 'よろず屋商会 ノノルン',
  'Kajeel Ja': '広域交易商 カジェージャ',
  Kasumi: 'カスミ',
  Kunuhali: '広域交易商 クヌハリ',
  Mahveydah: '広域交易商 マヴェーダ',
  Maisenta: 'マイセンタ',
  'Minion Trader': 'ミニオントレーダー',
  Mitepe: '広域交易商 ミテぺ',
  Neon: 'ネオン',
  Pedronille: '広域交易商 ペドロニール',
  'Resistance Quartermaster': 'レジスタンスの補給兵',
  Roarich: 'アシュガナ貿易 ロリッヒ',
  Sajareen: '広域交易商 サジャリーン',
  'Splendors Vendor': '特殊品交換窓口',
  Tabeth: '稀物商 タベス',
  Toashana: '広域交易商 トーシュナ',
  Tradingway: '広域交易商 トレーディングウェイ',
  Zawawa: '広域交易商 ザワワ',
  "J'lakshai": 'ジャ・ラクシャイ',
  Wilmetta: 'ウィルメッタ',
  'Spoils Collector': 'スポイル取引窓口',
}

function translateVendorNpcLabel(npc: string) {
  return VENDOR_NPC_LABELS[npc] ?? null
}

function isContentTranslationScope(entry: SourceDictionaryEntry) {
  return entry.category1 === '譜面'
    || entry.subCategory === '譜面'
    || entry.category1 === 'マウント'
    || entry.category1 === 'ミニオン'
    || entry.category1 === 'エモート'
}

type CollectEmoteSource = {
  type: string
  text: string
  related_id: number | null
}

type CollectEmoteRecord = {
  sources?: CollectEmoteSource[]
}

function stripControlChars(text: string) {
  return text.replace(/[\uE000-\uF8FF]/g, '').trim()
}

async function fetchXivapiQuestNameJa(questId: number) {
  const response = await fetch(
    `https://v2.xivapi.com/api/sheet/Quest/${questId}?language=ja&fields=Name`,
  )

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as { fields?: { Name?: string } }
  const name = payload.fields?.Name?.trim()

  return name ? stripControlChars(name) : null
}

async function buildEmoteQuestJaMap(englishValues: Set<string>) {
  const response = await fetch('https://ffxivcollect.com/api/emotes')

  if (!response.ok) {
    throw new Error(`Failed to fetch Collect emotes: ${response.status}`)
  }

  const collectPayload = (await response.json()) as { results: CollectEmoteRecord[] }
  const questTextToId = new Map<string, number>()

  for (const emote of collectPayload.results) {
    for (const source of emote.sources ?? []) {
      if (source.type === 'Quest' && source.text && source.related_id) {
        questTextToId.set(normalizeKey(source.text), source.related_id)
      }
    }
  }

  const questJaMap = new Map<string, string>()
  const questIdsToFetch = new Set<number>()

  for (const english of englishValues) {
    const questId = questTextToId.get(normalizeKey(english))
    if (questId) {
      questIdsToFetch.add(questId)
    }
  }

  const questIdToJa = new Map<number, string>()
  const questIds = [...questIdsToFetch]

  for (let index = 0; index < questIds.length; index += 8) {
    const batch = questIds.slice(index, index + 8)
    const batchResults = await Promise.all(
      batch.map(async (questId) => {
        const ja = await fetchXivapiQuestNameJa(questId)
        return [questId, ja] as const
      }),
    )

    for (const [questId, ja] of batchResults) {
      if (ja) {
        questIdToJa.set(questId, ja)
      }
    }
  }

  for (const [englishText, questId] of questTextToId.entries()) {
    if (!englishValues.has(englishText)) {
      continue
    }

    const ja = questIdToJa.get(questId)
    if (ja) {
      questJaMap.set(englishText, ja)
    }
  }

  return questJaMap
}

function normalizeKey(value: string) {
  return value.trim()
}

function isJapanese(text: string) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function buildTeamcraftMap(data: Record<string, TeamcraftRecord>) {
  const map = new Map<string, string>()

  for (const record of Object.values(data)) {
    const en = record.en ?? record.name?.en
    const ja = record.ja ?? record.name?.ja

    if (en && ja) {
      map.set(normalizeKey(en), ja)
    }
  }

  return map
}

function stripHtmlTags(text: string) {
  return text.replace(/<[^>]+>/g, '')
}

function normalizeInstanceSourceKey(source: string) {
  return source
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\*/g, '')
    .trim()
}

function buildInstanceLookupMap(data: Record<string, TeamcraftRecord>) {
  const map = new Map<string, string>()

  for (const record of Object.values(data)) {
    const en = record.en ?? record.name?.en
    const ja = record.ja ?? record.name?.ja

    if (!en || !ja) {
      continue
    }

    map.set(normalizeKey(en), ja)

    const stripped = stripHtmlTags(en)
    if (stripped !== en) {
      map.set(normalizeKey(stripped), ja)
    }
  }

  return map
}

function lookupInstanceWithNormalization(source: string, instanceMap: Map<string, string>) {
  const alias = CRAFT_SOURCE_ALIASES[source]
  const resolvedSource = normalizeInstanceSourceKey(alias ?? source)

  const candidates = [
    resolvedSource,
    resolvedSource.replace(/^The /i, 'the '),
    `the ${resolvedSource.replace(/^The /i, '')}`,
    resolvedSource.replace(/ \(Turn (\d+)\)$/i, ' - Turn $1'),
    resolvedSource.replace(/^The /i, 'the ').replace(/ \(Turn (\d+)\)$/i, ' - Turn $1'),
    stripHtmlTags(resolvedSource),
    stripHtmlTags(resolvedSource).replace(/^The /i, 'the '),
  ]

  for (const candidate of candidates) {
    const ja = instanceMap.get(normalizeKey(candidate))
    if (ja) {
      return ja
    }
  }

  return null
}

function translateInstanceTitleLine(name: string, instanceMap: Map<string, string>) {
  const trimmed = name.trim()

  return lookupInstanceWithNormalization(trimmed, instanceMap)
}

function lookupFatePlace(placeName: string, placeMap: Map<string, string>, termMaps: Map<string, string>[]) {
  const direct = translateLocationSegment(placeName, placeMap, termMaps)
    ?? lookupTerm(placeName, [placeMap, ...termMaps])

  if (direct) {
    return direct
  }

  const trimmed = placeName.trim()
  const candidates = [
    `The ${trimmed}`,
    trimmed.replace(/^The /i, ''),
    `The ${trimmed.replace(/^The /i, '')}`,
  ]

  for (const candidate of candidates) {
    const ja = lookupTerm(candidate, [placeMap, ...termMaps])
    if (ja) {
      return ja
    }
  }

  return null
}

function translateFateLine(name: string, fateMap: Map<string, string>, placeMap: Map<string, string>, termMaps: Map<string, string>[]) {
  const match = name.match(/^FATE "(.+)" - (.+)$/)
  if (!match) {
    return null
  }

  const fateName = match[1].trim()
  const placeName = match[2].trim()
  const fateJa = lookupTerm(fateName, [fateMap, ...termMaps])
  const placeJa = lookupFatePlace(placeName, placeMap, termMaps)

  if (!fateJa || !placeJa) {
    return null
  }

  return `FATE「${fateJa}」 - ${placeJa}`
}

function translateGatheredByLine(name: string) {
  const match = name.match(/^Gathered by (Botanist|Miner|Fisher)$/i)
  if (!match) {
    return null
  }

  const jobLabel = GATHER_JOB_LABELS[match[1]]
  if (!jobLabel) {
    return null
  }

  return `${jobLabel}で採集`
}

function translateSystemShortLabel(name: string) {
  return SYSTEM_SHORT_LABELS[name.trim()] ?? null
}

function translateExplorationRangePart(rangePart: string) {
  if (rangePart.includes(' - ')) {
    const [start, end] = rangePart.split(' - ').map((part) => part.trim())
    if (start && end) {
      return `${start}〜${end}`
    }
  }

  if (/ and /i.test(rangePart)) {
    return rangePart.split(/ and /i).map((part) => part.trim()).join('/')
  }

  if (rangePart.includes(', ')) {
    return rangePart.split(', ').map((part) => part.trim()).join('/')
  }

  return rangePart
}

function translateRetainerExplorationLine(name: string) {
  const trimmed = name.trim()
  const manualJa = EXPLORATION_RANK_LABELS[trimmed]
  if (manualJa) {
    return manualJa
  }

  const match = trimmed.match(/^(Field|Highland|Waterside|Woodland) Exploration (.+)$/)
  if (!match) {
    return null
  }

  const typeJa = EXPLORATION_TYPE_LABELS[`${match[1]} Exploration`]
  if (!typeJa) {
    return null
  }

  const suffix = match[2].trim()

  if (/^[IVXLCDM]+$/i.test(suffix)) {
    return `${typeJa}${suffix.toUpperCase()}`
  }

  if (/,/.test(suffix) || / - /.test(suffix) || / and /i.test(suffix)) {
    return `${typeJa}${translateExplorationRangePart(suffix)}`
  }

  return null
}

function translateEurekaLockboxLine(name: string, itemMap: Map<string, string>, placeMap: Map<string, string>) {
  const trimmed = name.trim()

  const lockboxZoneMatch = trimmed.match(/^(.+?) - (Eureka (?:Anemos|Pagos|Pyros|Hydatos))$/)
  if (lockboxZoneMatch) {
    const lockboxName = lockboxZoneMatch[1].trim()
    if (lockboxName === HAPPY_BUNNY_LOCKBOX_LABEL) {
      const zoneName = lockboxZoneMatch[2].trim()
      const zoneJa = lookupTerm(zoneName, [placeMap])
      if (!zoneJa) {
        return null
      }

      return `しあわせうさぎの財宝探索 - ${zoneJa}`
    }

    if (!EUREKA_LOCKBOX_ITEM_ALLOWLIST.has(lockboxName)) {
      return null
    }

    const zoneName = lockboxZoneMatch[2].trim()
    const lockboxJa = lookupTerm(lockboxName, [itemMap])
    const zoneJa = lookupTerm(zoneName, [placeMap])

    if (!lockboxJa || !zoneJa) {
      return null
    }

    return `${lockboxJa} - ${zoneJa}`
  }

  const zoneTailMatch = trimmed.match(/^(Eureka (?:Anemos|Pagos|Pyros|Hydatos)) - (.+)$/)
  if (zoneTailMatch) {
    const zoneName = zoneTailMatch[1].trim()
    const tailName = zoneTailMatch[2].trim()
    const zoneJa = lookupTerm(zoneName, [placeMap])

    if (!zoneJa) {
      return null
    }

    const tailJa = EUREKA_LOCKBOX_ITEM_ALLOWLIST.has(tailName)
      ? lookupTerm(tailName, [itemMap])
      : EUREKA_INSTANCE_MANUAL_JA[tailName] ?? null

    if (!tailJa) {
      return null
    }

    return `${zoneJa} - ${tailJa}`
  }

  return null
}

function translateBozjaZoneInstanceLine(name: string, placeMap: Map<string, string>) {
  const match = name.trim().match(/^Zadnor - (.+)$/)
  if (!match) {
    return null
  }

  const instanceName = match[1].trim()
  const instanceJa = BOZJA_ZONE_INSTANCE_ALLOWLIST[instanceName]
  if (!instanceJa) {
    return null
  }

  const zoneJa = lookupTerm('Zadnor', [placeMap])
  if (!zoneJa) {
    return null
  }

  return `${zoneJa} - ${instanceJa}`
}

function lookupHuntSource(source: string, placeMap: Map<string, string>) {
  const match = source.match(/^(.+?) Hunts$/i)
  if (!match) {
    return null
  }

  const region = match[1].trim()
  const regionCandidates = [
    region,
    `The ${region}`,
    region.replace(/^The /i, ''),
  ]

  for (const candidate of regionCandidates) {
    const ja = placeMap.get(normalizeKey(candidate))
    if (ja) {
      return `${ja}モブハント`
    }
  }

  return null
}

function translateVoyagePointLabel(point: string, termMaps: Map<string, string>[]) {
  const trimmed = point.trim()
  return VOYAGE_POINT_LABELS[trimmed] ?? lookupTerm(trimmed, termMaps) ?? null
}

function translateVoyageCraftSource(source: string, termMaps: Map<string, string>[]) {
  const trimmed = source.trim()
  const exploratoryMatch = trimmed.match(/^Exploratory Voyages:\s*(.+)$/i)
  if (exploratoryMatch) {
    const route = exploratoryMatch[1].trim()
    const seaOfCloudsMatch = route.match(/^Sea of Clouds (\d+)$/i)
    if (seaOfCloudsMatch) {
      return `飛空艇探索：雲海${seaOfCloudsMatch[1]}`
    }

    return null
  }

  const subaquaticMatch = trimmed.match(/^Subaquatic Voyages:\s*(.+)$/i)
  if (!subaquaticMatch) {
    return null
  }

  const points = subaquaticMatch[1].split(/,\s*/).map((point) => point.trim())
  const translatedPoints: string[] = []

  for (const point of points) {
    const jaPoint = translateVoyagePointLabel(point, termMaps)
    if (!jaPoint) {
      return null
    }

    translatedPoints.push(jaPoint)
  }

  return `潜水艦探索：${translatedPoints.join('、')}`
}

function translateCraftPurchaseSource(source: string) {
  const aurianaMatch = source.match(
    /^Purchase from Auriana in Mor Dhona for ([\d,]+) Allagan Tomestones of Poetics$/,
  )
  if (aurianaMatch) {
    return `モードゥナのオーリアナから${aurianaMatch[1]}アラガントームストーン：詩学で購入`
  }

  const wolvesMatch = source.match(
    /^Purchase from the Wolves' Den for ([\d,]+) Wolf Marks$/,
  )
  if (wolvesMatch) {
    return `ウルヴズジェイルで${wolvesMatch[1]}ウルフマークと交換`
  }

  return null
}

function translateCraftSourcePart(
  part: string,
  instanceMap: Map<string, string>,
  termMaps: Map<string, string>[],
) {
  const trimmed = part.trim()
  const instanceJa = lookupInstanceWithNormalization(trimmed, instanceMap)
  if (instanceJa) {
    return instanceJa
  }

  return lookupTerm(trimmed, termMaps) ?? trimmed
}

function translateCraftSource(
  source: string,
  instanceMap: Map<string, string>,
  placeMap: Map<string, string>,
  termMaps: Map<string, string>[],
) {
  const trimmed = source.trim()
  const manualJa = CRAFT_SOURCE_MANUAL_JA[trimmed]
  if (manualJa) {
    return manualJa
  }

  const purchaseJa = translateCraftPurchaseSource(trimmed)
  if (purchaseJa) {
    return purchaseJa
  }

  const huntJa = lookupHuntSource(trimmed, placeMap)
  if (huntJa) {
    return huntJa
  }

  const voyageJa = translateVoyageCraftSource(trimmed, termMaps)
  if (voyageJa) {
    return voyageJa
  }

  const instanceJa = lookupInstanceWithNormalization(trimmed, instanceMap)
  if (instanceJa) {
    return instanceJa
  }

  return translateCompositeSource(trimmed, instanceMap, termMaps)
}

async function fetchTeamcraftJson<T>(filename: string) {
  const response = await fetch(`${TEAMCRAFT_BASE}/${filename}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch Teamcraft ${filename}: ${response.status}`)
  }

  return response.json() as Promise<T>
}

function lookupTerm(value: string, maps: Map<string, string>[]) {
  const key = normalizeKey(value)
  for (const map of maps) {
    const ja = map.get(key)
    if (ja) {
      return ja
    }
  }
  return null
}

function translateCompositeSource(
  source: string,
  instanceMap: Map<string, string>,
  termMaps: Map<string, string>[],
) {
  if (source.includes(' / ')) {
    const originalParts = source.split(' / ')
    const parts = originalParts.map((part) => translateCraftSourcePart(part, instanceMap, termMaps))
    const translatedCount = parts.filter((part, index) => part !== originalParts[index]?.trim()).length

    if (translatedCount > 0) {
      return parts.join(' / ')
    }

    return null
  }

  const partJa = translateCraftSourcePart(source, instanceMap, termMaps)
  return partJa !== source.trim() ? partJa : lookupTerm(source, termMaps)
}

function translateCostSegment(cost: string, maps: Map<string, string>[]) {
  const trimmed = cost.trim()
  const standaloneLabel = STANDALONE_CURRENCY_ITEM_LABELS[trimmed]
  if (standaloneLabel) {
    return standaloneLabel
  }

  const direct = lookupTerm(trimmed, maps)
  if (direct) {
    return direct
  }

  const original = cost
  let translated = cost
  let changed = false

  const replacements: Array<[RegExp, string]> = [
    [/\bGil\b/g, 'ギル'],
    [/\bAchievement Certificates\b/g, 'アチーブメント証書'],
    [/\bAllagan Tomestones of Poetics\b/g, 'アラガントームストーン：詩学'],
    [/\bBicolor Gemstones\b/g, '双極化晶薬'],
    [/\bCenturio Seals\b/g, 'センチュリオンシール'],
    [/\bFlame Seals\b/g, 'フレイムシール'],
    [/\bSerpent Seals\b/g, 'サーペントシール'],
    [/\bStorm Seals\b/g, 'ストームシール'],
    [/\bAllied Seals\b/g, 'アライドシール'],
    [/\bWolf Marks\b/g, 'ウルフマーク'],
    [/\bTrophy Crystals\b/g, 'トロフィークリスタル'],
    [/\bBozjan Clusters\b/g, 'ボズヤ・クラスター'],
    [/\bMGP\b/g, 'MGP'],
    [/\bMGF\b/g, 'MGF'],
    [/\bSacks of Nuts\b/gi, '袋のナッツ'],
    [/\bSeafarer's Cowries\b/g, '船員の貝貨'],
    [/\bCompany Seals\b/g, '軍票'],
    [/\bSkybuilders' Scrips\b/g, '蒼天街振興券'],
    [/\bPurple Crafters' Scrips\b/g, '紫票：クラフター'],
    [/\bPurple Gatherers' Scrips\b/g, '紫票：ギャザラー'],
  ]

  for (const [pattern, replacement] of replacements) {
    const next = translated.replace(pattern, replacement)
    if (next !== translated) {
      translated = next
      changed = true
    }
  }

  const countMatch = translated.match(/^(\d[\d,]*)\s+(.+)$/)
  if (countMatch) {
    const [, count, item] = countMatch
    const rankMatch = item.match(/^(.+?) \(Rank (\d+)\)$/)
    if (rankMatch) {
      const [, itemName, rank] = rankMatch
      const standaloneLabel = STANDALONE_CURRENCY_ITEM_LABELS[itemName.trim()]
      const jaItem = standaloneLabel ?? lookupTerm(itemName.trim(), maps)
      if (jaItem) {
        return `${count} ${jaItem}（ランク${rank}）`
      }
    }

    const standaloneLabel = STANDALONE_CURRENCY_ITEM_LABELS[item]
    const jaItem = standaloneLabel
      ?? (/\b(MGP|MGF)\b/.test(item) ? item : lookupTerm(item, maps) ?? item)

    if (standaloneLabel || changed || jaItem !== item || /^(MGP|MGF)$/.test(item)) {
      return `${count} ${jaItem}`
    }
  }

  return translated !== original ? translated : null
}

function translateAchievementRouteLine(name: string) {
  return ACHIEVEMENT_ROUTE_LABELS[name.trim()] ?? null
}

function translatePvpSeriesLine(name: string) {
  const match = name.trim().match(/^PvP Series (\d+) - Level (\d+)$/)
  if (!match) {
    return null
  }

  return `PvPシリーズ${match[1]} レベル${match[2]}`
}

function translateFeastSeasonLine(name: string) {
  const match = name.trim().match(/^The Feast: Season (\d+)$/)
  if (!match) {
    return null
  }

  return `ザ・フィースト シーズン${match[1]}`
}

function translateYokaiCollaborationLine(name: string) {
  const match = name.trim().match(/^Yo-kai Watch Collaboration - Obtain (\d+) Yo-kai (Minions|Weapons)$/)
  if (!match) {
    return null
  }

  const [, count, rewardType] = match
  if (rewardType === 'Minions') {
    return `妖怪ウォッチ コラボレーション - 妖怪ミニオン${count}種を獲得`
  }

  return `妖怪ウォッチ コラボレーション - コラボ武器${count}種を獲得`
}

function translateSouthHornCofferLine(name: string) {
  const match = name.trim().match(/^South Horn - (.+)$/)
  if (!match) {
    return null
  }

  const jaRank = SOUTH_HORN_COFFER_LABELS[match[1].trim()]
  if (!jaRank) {
    return null
  }

  return `蜃気楼の島：南征編 - ${jaRank}`
}

function translateLockboxSlashCompositeLine(name: string) {
  const match = name.trim().match(/^(.+?) \/ (.+)$/)
  if (!match) {
    return null
  }

  const leftJa = BOZJA_LOCKBOX_LABELS[match[1].trim()]
  const rightJa = BOZJA_LOCKBOX_LABELS[match[2].trim()]
  if (!leftJa || !rightJa) {
    return null
  }

  return `${leftJa} / ${rightJa}`
}

function translateBozjaFinalBossChestLine(name: string) {
  const match = name.trim().match(/^(.+?) - Final Boss Chests?$/)
  if (!match) {
    return null
  }

  const jaInstance = BOZJA_FINAL_BOSS_CHEST_LABELS[match[1].trim()]
  if (!jaInstance) {
    return null
  }

  return `${jaInstance} - 最終ボス宝箱`
}

function translateBaldesionAbsoluteVirtueChestLine(name: string) {
  if (name.trim() !== 'The Baldesion Arsenal (Eureka Hydatos) - Absolute Virtue Chest') {
    return null
  }

  return 'バルデシオンアーセナル - アブソリュート・ヴァーチュー宝箱'
}

function translateMechPilotRewardLine(name: string) {
  const match = name.trim().match(/^Mech Pilot Reward - (.+)$/)
  if (!match) {
    return null
  }

  const jaZone = MECH_PILOT_ZONE_LABELS[match[1].trim()]
  if (!jaZone) {
    return null
  }

  return `パイロット報酬 - ${jaZone}`
}

function translateCalamitySalvagerCampaignLine(name: string) {
  const match = name.trim().match(/^Calamity Salvager - (\d+) Gold Chocobo Feathers \(Recruit a Friend Campaign\)$/)
  if (!match) {
    return null
  }

  return `遺失物管理人 - ゴールドチョコボの羽根${match[1]}枚（友達招待キャンペーン）`
}

function translateDesynthesizeLine(name: string, termMaps: Map<string, string>[]) {
  const match = name.trim().match(/^Desynthesize a (.+)$/)
  if (!match) {
    return null
  }

  const itemJa = lookupTerm(match[1].trim(), termMaps)
  if (!itemJa) {
    return null
  }

  return `${itemJa}を分解`
}

function translateStandaloneCostLine(name: string, maps: Map<string, string>[]) {
  const parenMatch = name.match(/^(.+?)\s*\((.+)\)$/)
  if (parenMatch) {
    const [, base, note] = parenMatch
    const jaBase = translateCostSegment(base.trim(), maps)

    if (!jaBase) {
      return null
    }

    const trimmedNote = note.trim()
    const jaNote = MANUAL_OVERRIDES[trimmedNote] ?? lookupTerm(trimmedNote, maps) ?? trimmedNote
    return `${jaBase} (${jaNote})`
  }

  return translateCostSegment(name, maps)
}

function translateOnlineStoreLine(name: string) {
  const match = name.match(/^Online Store - (.+)$/i)
  if (!match) {
    return null
  }

  return `オンラインストア - ${match[1].trim()}`
}

function translateSackLine(name: string) {
  for (const englishPrefix of Object.keys(DUNGEON_SACK_LABELS).sort((a, b) => b.length - a.length)) {
    const prefix = `${englishPrefix} - `
    if (!name.startsWith(prefix)) {
      continue
    }

    const rank = name.slice(prefix.length).trim()
    const jaRank = DUNGEON_SACK_RANK_LABELS[englishPrefix]?.[rank]
    if (!jaRank) {
      return null
    }

    return `${DUNGEON_SACK_LABELS[englishPrefix]} - ${jaRank}`
  }

  return null
}

function translateTimewornMapLine(name: string) {
  const match = name.match(/^Timeworn (.+?) Map$/i)
  if (!match) {
    return null
  }

  return `タイムワーン${match[1].trim()}の地図`
}

function translateEventWithYearLine(name: string) {
  const numericYearMatch = name.match(/^(.+?) \((20\d{2}(?:-\d{2})?)\)$/)
  if (numericYearMatch) {
    const [, base, year] = numericYearMatch
    const jaBase = EVENT_BASE_LABELS[base.trim()]
    if (!jaBase) {
      return null
    }

    return `${jaBase} (${year})`
  }

  const monthYearMatch = name.match(
    /^(.+?) \((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (20\d{2})\)$/,
  )
  if (!monthYearMatch) {
    return null
  }

  const [, base, , year] = monthYearMatch
  const jaBase = EVENT_BASE_LABELS[base.trim()]
  if (!jaBase) {
    return null
  }

  return `${jaBase} (${year})`
}

function lookupSubaquaticRegionLabel(region: string) {
  const trimmed = region.trim()
  if (/^deep-?sea site$/i.test(trimmed)) {
    return SUBAQUATIC_REGION_LABELS['Deep-sea Site']
  }

  return SUBAQUATIC_REGION_LABELS[trimmed] ?? null
}

function translateSubaquaticRouteSegment(segment: string) {
  const match = segment.match(/^(.+?) \((.+)\)$/)
  if (!match) {
    return null
  }

  const [, region, codes] = match
  const jaRegion = lookupSubaquaticRegionLabel(region)
  if (!jaRegion) {
    return null
  }

  return `${jaRegion} (${codes})`
}

function translateSubaquaticVoyageLine(name: string) {
  const prefix = 'Subaquatic Voyages - '
  if (!name.startsWith(prefix)) {
    return null
  }

  const route = name.slice(prefix.length).trim()
  const segments = route.split(/,\s*/)
  const translatedSegments: string[] = []

  for (const segment of segments) {
    const translated = translateSubaquaticRouteSegment(segment)
    if (!translated) {
      return null
    }

    translatedSegments.push(translated)
  }

  return `潜水艦探索 - ${translatedSegments.join(', ')}`
}

function translateLocationSegment(location: string, placeMap: Map<string, string>, termMaps: Map<string, string>[]) {
  const direct = lookupTerm(location, [placeMap, ...termMaps])
  if (direct) {
    return direct
  }

  const parenMatch = location.match(/^(.+?)\s*\(([^)]+)\)$/)
  if (parenMatch) {
    const [, place, area] = parenMatch
    const jaPlace = lookupTerm(place.trim(), [placeMap, ...termMaps])
    const jaArea = lookupTerm(area.trim(), [placeMap, ...termMaps])

    if (jaPlace || jaArea) {
      return `${jaPlace ?? place.trim()}（${jaArea ?? area.trim()}）`
    }
  }

  if (location.includes('/')) {
    const parts = location.split('/').map((part) => lookupTerm(part.trim(), [placeMap, ...termMaps]) ?? part.trim())
    const translatedCount = parts.filter((part, index) => part !== location.split('/')[index]?.trim()).length

    if (translatedCount > 0) {
      return parts.join('/')
    }
  }

  return null
}

function isVendorPattern(name: string) {
  return /Quartermaster|Junkmonger|Maisenta|Roarich|Bango Zango|Smithy|Scrip Exchange|Rowena's Representative|Trisassant|Vendor|Purchase from|Gemstone Trader|^Eschina - |^Fathard - |^Nesvaaz - |^Uah'shepya - | - .+ - /i.test(name)
    && name.includes(' - ')
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

function isVendorFateExchangePartialLine(name: string) {
  return /^Eschina - |^Fathard - |^Nesvaaz - |^Uah'shepya - /i.test(name.trim())
}

function translateDualNpcCostLine(name: string, placeMap: Map<string, string>, termMaps: Map<string, string>[]) {
  const match = name.match(/^(.+?) \((.+?)\) \/ (.+?) \((.+?)\) - (.+)$/)
  if (!match) {
    return null
  }

  const [, npc1, place1, npc2, place2, cost] = match
  const jaNpc1 = translateVendorNpcLabel(npc1) ?? npc1
  const jaNpc2 = translateVendorNpcLabel(npc2) ?? npc2
  const jaPlace1 = lookupTerm(place1, [placeMap, ...termMaps]) ?? place1
  const jaPlace2 = lookupTerm(place2, [placeMap, ...termMaps]) ?? place2
  const jaCost = translateCostSegment(cost, termMaps)

  if (!jaCost || jaCost === cost.trim()) {
    return null
  }

  return `${jaNpc1}（${jaPlace1}）／${jaNpc2}（${jaPlace2}） - ${jaCost}`
}

function translateSpoilsCollectorLine(name: string, termMaps: Map<string, string>[]) {
  const match = name.match(/^Spoils Collector - (\d+) Iron Voyage Spoil \(Sea of Clouds Sector (\d+)\)$/)
  if (!match) {
    return null
  }

  const [, count, sector] = match
  const spoilJa = lookupTerm('Iron Voyage Spoil', termMaps) ?? 'ボイジャースポイル:鋳鉄'

  return `スポイル取引窓口 - ${spoilJa}×${count}（雲海${sector}）`
}

function translateCraftLine(
  name: string,
  instanceMap: Map<string, string>,
  placeMap: Map<string, string>,
  termMaps: Map<string, string>[],
) {
  const match = name.match(/^Crafted by (Alchemist|Carpenter|Blacksmith|Armorer|Goldsmith|Leatherworker|Weaver|Culinarian)(?:\s*-\s*(.+))?$/i)
  if (!match) {
    return null
  }

  const jobKey = match[1]
  const jobLabel = CRAFT_JOB_LABELS[jobKey]
  const source = match[2]?.trim()

  if (!jobLabel) {
    return null
  }

  if (!source) {
    return `${jobLabel}製作`
  }

  const jaSource = translateCraftSource(source, instanceMap, placeMap, termMaps)

  if (jaSource) {
    return `${jobLabel}製作 - ${jaSource}`
  }

  return `${jobLabel}製作 - ${source}`
}

function translateVendorLine(name: string, placeMap: Map<string, string>, termMaps: Map<string, string>[]) {
  if (!isVendorPattern(name)) {
    return null
  }

  const parsed = parseVendorTripleLine(name)
  if (!parsed) {
    return null
  }

  const { npc, location, cost } = parsed
  const jaNpc = translateVendorNpcLabel(npc) ?? npc
  const jaLocation = translateLocationSegment(location, placeMap, termMaps)

  if (isVendorFateExchangePartialLine(name)) {
    if (!jaLocation) {
      return null
    }

    const jaCost = translateCostSegment(cost, termMaps)
    return `${jaNpc} - ${jaLocation} - ${jaCost ?? cost}`
  }

  const jaCost = translateCostSegment(cost, termMaps)

  if (!jaLocation && !jaCost) {
    return null
  }

  if (jaLocation) {
    return `${jaNpc} - ${jaLocation} - ${jaCost ?? cost}`
  }

  return `${jaNpc} - ${location} - ${jaCost ?? cost}`
}

async function main() {
  const sourceDictionary = JSON.parse(await readFile(SOURCE_DICTIONARY_PATH, 'utf8')) as SourceDictionaryEntry[]
  const scopedEntries = sourceDictionary.filter(isContentTranslationScope)

  const englishValues = new Set<string>()

  for (const entry of scopedEntries) {
    const entryContentName = entry.contentName?.trim()
    if (entryContentName && !isJapanese(entryContentName)) {
      englishValues.add(entryContentName)
    }

    for (const route of entry.acquisitionRoutes ?? []) {
      const routeContentName = route.contentName?.trim()
      const routeDetail = route.detail?.trim()

      if (routeContentName && !isJapanese(routeContentName)) {
        englishValues.add(routeContentName)
      }

      if (routeDetail && !isJapanese(routeDetail)) {
        englishValues.add(routeDetail)
      }
    }
  }

  const [items, places, instances, fates, achievements, quests] = await Promise.all([
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('items.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('places.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('instances.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('fates.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('achievements.json'),
    fetchTeamcraftJson<Record<string, TeamcraftRecord>>('quests.json'),
  ])

  const itemMap = buildTeamcraftMap(items)
  const placeMap = buildTeamcraftMap(places)
  const instanceMap = buildInstanceLookupMap(instances)
  const fateMap = buildTeamcraftMap(fates)
  const achievementMap = buildTeamcraftMap(achievements)
  const questMap = buildTeamcraftMap(quests)
  const termMaps = [instanceMap, questMap, achievementMap, itemMap, placeMap, fateMap]
  const emoteQuestJaMap = await buildEmoteQuestJaMap(englishValues)

  const entries = new Map<string, ContentTranslationEntry>()
  const unmatched: string[] = []
  const tierCounts = {
    'tier1-exact': 0,
    'tier2-craft': 0,
    'tier3-vendor': 0,
    'tier4-template': 0,
  }

  const templateCounts = {
    standaloneCost: 0,
    instanceTitle: 0,
    fateLine: 0,
    gatheredBy: 0,
    systemShortLabel: 0,
    retainerExploration: 0,
    eurekaLockbox: 0,
    bozjaZoneInstance: 0,
    onlineStore: 0,
    sack: 0,
    timewornMap: 0,
    eventWithYear: 0,
    subaquaticVoyage: 0,
    dualNpcCost: 0,
    spoilsCollector: 0,
    achievementRoute: 0,
    pvpSeries: 0,
    feastSeason: 0,
    yokaiCollaboration: 0,
    southHornCoffer: 0,
    lockboxSlashComposite: 0,
    bozjaFinalBossChest: 0,
    baldesionArsenalChest: 0,
    mechPilotReward: 0,
    calamitySalvagerCampaign: 0,
    desynthesize: 0,
    emoteQuest: 0,
    englishKeep: 0,
  }

  for (const english of [...englishValues].sort((a, b) => a.localeCompare(b))) {
    const manualJa = MANUAL_OVERRIDES[english]
    if (manualJa) {
      entries.set(english, {
        en: english,
        ja: manualJa,
        tier: 'tier1-exact',
        source: 'manual',
        types: ['content_name'],
      })
      tierCounts['tier1-exact'] += 1
      continue
    }

    if (ENGLISH_KEEP_FIX[english]) {
      entries.set(english, {
        en: english,
        ja: english,
        tier: 'tier1-exact',
        source: 'keep-english',
        types: ['content_name', 'english_keep'],
      })
      tierCounts['tier1-exact'] += 1
      templateCounts.englishKeep += 1
      continue
    }

    const emoteQuestJa = emoteQuestJaMap.get(normalizeKey(english))
    if (emoteQuestJa) {
      entries.set(english, {
        en: english,
        ja: emoteQuestJa,
        tier: 'tier1-exact',
        source: 'xivapi-quest',
        types: ['content_name', 'emote_quest'],
      })
      tierCounts['tier1-exact'] += 1
      templateCounts.emoteQuest += 1
      continue
    }

    const exactJa = lookupTerm(english, termMaps)
    if (exactJa) {
      entries.set(english, {
        en: english,
        ja: exactJa,
        tier: 'tier1-exact',
        source: 'teamcraft',
        types: ['content_name'],
      })
      tierCounts['tier1-exact'] += 1
      continue
    }

    const instanceTitleJa = translateInstanceTitleLine(english, instanceMap)
    if (instanceTitleJa) {
      entries.set(english, {
        en: english,
        ja: instanceTitleJa,
        tier: 'tier4-template',
        source: 'template-instance-title',
        types: ['content_name', 'instance_title'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.instanceTitle += 1
      continue
    }

    const fateLineJa = translateFateLine(english, fateMap, placeMap, termMaps)
    if (fateLineJa) {
      entries.set(english, {
        en: english,
        ja: fateLineJa,
        tier: 'tier4-template',
        source: 'template-fate-line',
        types: ['content_name', 'fate_line'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.fateLine += 1
      continue
    }

    const gatheredByJa = translateGatheredByLine(english)
    if (gatheredByJa) {
      entries.set(english, {
        en: english,
        ja: gatheredByJa,
        tier: 'tier4-template',
        source: 'template-gathered-by',
        types: ['content_name', 'gathered_by'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.gatheredBy += 1
      continue
    }

    const systemShortLabelJa = translateSystemShortLabel(english)
    if (systemShortLabelJa) {
      entries.set(english, {
        en: english,
        ja: systemShortLabelJa,
        tier: 'tier4-template',
        source: 'template-system-short-label',
        types: ['content_name', 'system_short_label'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.systemShortLabel += 1
      continue
    }

    const retainerExplorationJa = translateRetainerExplorationLine(english)
    if (retainerExplorationJa) {
      entries.set(english, {
        en: english,
        ja: retainerExplorationJa,
        tier: 'tier4-template',
        source: 'template-retainer-exploration',
        types: ['content_name', 'retainer_exploration'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.retainerExploration += 1
      continue
    }

    const eurekaLockboxJa = translateEurekaLockboxLine(english, itemMap, placeMap)
    if (eurekaLockboxJa) {
      entries.set(english, {
        en: english,
        ja: eurekaLockboxJa,
        tier: 'tier4-template',
        source: 'template-eureka-lockbox',
        types: ['content_name', 'eureka_lockbox'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.eurekaLockbox += 1
      continue
    }

    const bozjaZoneInstanceJa = translateBozjaZoneInstanceLine(english, placeMap)
    if (bozjaZoneInstanceJa) {
      entries.set(english, {
        en: english,
        ja: bozjaZoneInstanceJa,
        tier: 'tier4-template',
        source: 'template-bozja-zone-instance',
        types: ['content_name', 'bozja_zone_instance'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.bozjaZoneInstance += 1
      continue
    }

    const craftJa = translateCraftLine(english, instanceMap, placeMap, termMaps)
    if (craftJa) {
      entries.set(english, {
        en: english,
        ja: craftJa,
        tier: 'tier2-craft',
        source: 'template-craft',
        types: ['content_name', 'craft_source'],
      })
      tierCounts['tier2-craft'] += 1
      continue
    }

    const vendorJa = translateVendorLine(english, placeMap, termMaps)
    if (vendorJa) {
      entries.set(english, {
        en: english,
        ja: vendorJa,
        tier: 'tier3-vendor',
        source: 'template-vendor',
        types: ['content_name', 'vendor_line'],
      })
      tierCounts['tier3-vendor'] += 1
      continue
    }

    const dualNpcCostJa = translateDualNpcCostLine(english, placeMap, termMaps)
    if (dualNpcCostJa) {
      entries.set(english, {
        en: english,
        ja: dualNpcCostJa,
        tier: 'tier3-vendor',
        source: 'template-dual-npc-cost',
        types: ['content_name', 'vendor_line'],
      })
      tierCounts['tier3-vendor'] += 1
      templateCounts.dualNpcCost += 1
      continue
    }

    const spoilsCollectorJa = translateSpoilsCollectorLine(english, termMaps)
    if (spoilsCollectorJa) {
      entries.set(english, {
        en: english,
        ja: spoilsCollectorJa,
        tier: 'tier3-vendor',
        source: 'template-spoils-collector',
        types: ['content_name', 'vendor_line'],
      })
      tierCounts['tier3-vendor'] += 1
      templateCounts.spoilsCollector += 1
      continue
    }

    const achievementRouteJa = translateAchievementRouteLine(english)
    if (achievementRouteJa) {
      entries.set(english, {
        en: english,
        ja: achievementRouteJa,
        tier: 'tier4-template',
        source: 'template-achievement-route',
        types: ['content_name', 'achievement_route'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.achievementRoute += 1
      continue
    }

    const pvpSeriesJa = translatePvpSeriesLine(english)
    if (pvpSeriesJa) {
      entries.set(english, {
        en: english,
        ja: pvpSeriesJa,
        tier: 'tier4-template',
        source: 'template-pvp-series',
        types: ['content_name', 'pvp_series'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.pvpSeries += 1
      continue
    }

    const feastSeasonJa = translateFeastSeasonLine(english)
    if (feastSeasonJa) {
      entries.set(english, {
        en: english,
        ja: feastSeasonJa,
        tier: 'tier4-template',
        source: 'template-feast-season',
        types: ['content_name', 'feast_season'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.feastSeason += 1
      continue
    }

    const yokaiCollaborationJa = translateYokaiCollaborationLine(english)
    if (yokaiCollaborationJa) {
      entries.set(english, {
        en: english,
        ja: yokaiCollaborationJa,
        tier: 'tier4-template',
        source: 'template-yokai-collaboration',
        types: ['content_name', 'collaboration'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.yokaiCollaboration += 1
      continue
    }

    const southHornCofferJa = translateSouthHornCofferLine(english)
    if (southHornCofferJa) {
      entries.set(english, {
        en: english,
        ja: southHornCofferJa,
        tier: 'tier4-template',
        source: 'template-south-horn-coffer',
        types: ['content_name', 'occult_crescent_coffer'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.southHornCoffer += 1
      continue
    }

    const lockboxSlashCompositeJa = translateLockboxSlashCompositeLine(english)
    if (lockboxSlashCompositeJa) {
      entries.set(english, {
        en: english,
        ja: lockboxSlashCompositeJa,
        tier: 'tier4-template',
        source: 'template-lockbox-slash-composite',
        types: ['content_name', 'lockbox_composite'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.lockboxSlashComposite += 1
      continue
    }

    const bozjaFinalBossChestJa = translateBozjaFinalBossChestLine(english)
    if (bozjaFinalBossChestJa) {
      entries.set(english, {
        en: english,
        ja: bozjaFinalBossChestJa,
        tier: 'tier4-template',
        source: 'template-bozja-final-boss-chest',
        types: ['content_name', 'bozja_final_boss_chest'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.bozjaFinalBossChest += 1
      continue
    }

    const baldesionArsenalChestJa = translateBaldesionAbsoluteVirtueChestLine(english)
    if (baldesionArsenalChestJa) {
      entries.set(english, {
        en: english,
        ja: baldesionArsenalChestJa,
        tier: 'tier4-template',
        source: 'template-baldesion-arsenal-chest',
        types: ['content_name', 'eureka_baldesion_chest'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.baldesionArsenalChest += 1
      continue
    }

    const mechPilotRewardJa = translateMechPilotRewardLine(english)
    if (mechPilotRewardJa) {
      entries.set(english, {
        en: english,
        ja: mechPilotRewardJa,
        tier: 'tier4-template',
        source: 'template-mech-pilot-reward',
        types: ['content_name', 'mech_pilot_reward'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.mechPilotReward += 1
      continue
    }

    const calamitySalvagerCampaignJa = translateCalamitySalvagerCampaignLine(english)
    if (calamitySalvagerCampaignJa) {
      entries.set(english, {
        en: english,
        ja: calamitySalvagerCampaignJa,
        tier: 'tier4-template',
        source: 'template-calamity-salvager-campaign',
        types: ['content_name', 'vendor_campaign_composite'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.calamitySalvagerCampaign += 1
      continue
    }

    const desynthesizeJa = translateDesynthesizeLine(english, termMaps)
    if (desynthesizeJa) {
      entries.set(english, {
        en: english,
        ja: desynthesizeJa,
        tier: 'tier4-template',
        source: 'template-desynthesize',
        types: ['content_name', 'desynthesize'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.desynthesize += 1
      continue
    }

    const standaloneCostJa = translateStandaloneCostLine(english, termMaps)
    if (standaloneCostJa) {
      entries.set(english, {
        en: english,
        ja: standaloneCostJa,
        tier: 'tier4-template',
        source: 'template-standalone-cost',
        types: ['content_name', 'currency_line'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.standaloneCost += 1
      continue
    }

    const onlineStoreJa = translateOnlineStoreLine(english)
    if (onlineStoreJa) {
      entries.set(english, {
        en: english,
        ja: onlineStoreJa,
        tier: 'tier4-template',
        source: 'template-online-store',
        types: ['content_name', 'online_store'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.onlineStore += 1
      continue
    }

    const sackJa = translateSackLine(english)
    if (sackJa) {
      entries.set(english, {
        en: english,
        ja: sackJa,
        tier: 'tier4-template',
        source: 'template-sack',
        types: ['content_name', 'deep_dungeon_sack'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.sack += 1
      continue
    }

    const timewornMapJa = translateTimewornMapLine(english)
    if (timewornMapJa) {
      entries.set(english, {
        en: english,
        ja: timewornMapJa,
        tier: 'tier4-template',
        source: 'template-timeworn-map',
        types: ['content_name', 'timeworn_map'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.timewornMap += 1
      continue
    }

    const eventWithYearJa = translateEventWithYearLine(english)
    if (eventWithYearJa) {
      entries.set(english, {
        en: english,
        ja: eventWithYearJa,
        tier: 'tier4-template',
        source: 'template-event-with-year',
        types: ['content_name', 'event_with_year'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.eventWithYear += 1
      continue
    }

    const subaquaticVoyageJa = translateSubaquaticVoyageLine(english)
    if (subaquaticVoyageJa) {
      entries.set(english, {
        en: english,
        ja: subaquaticVoyageJa,
        tier: 'tier4-template',
        source: 'template-subaquatic-voyage',
        types: ['content_name', 'subaquatic_voyage'],
      })
      tierCounts['tier4-template'] += 1
      templateCounts.subaquaticVoyage += 1
      continue
    }

    unmatched.push(english)
  }

  const output = [
    {
      version: 1,
      type: 'metadata',
      description: 'English to Japanese translations for acquisition contentName and route detail values.',
      generatedAt: new Date().toISOString(),
      scope: 'orchestrion,mount,minion,emote',
      sources: [
        'Teamcraft items/places/instances/quests/achievements/fates',
        'XIVAPI Quest (Collect emote related_id)',
        'template craft',
        'template vendor',
        'template dual npc cost',
        'template spoils collector',
        'template standalone cost',
        'template instance title',
        'template fate line',
        'template gathered by',
        'template system short label',
        'template retainer exploration',
        'template achievement route',
        'template pvp series',
        'template feast season',
        'template yokai collaboration',
        'template south horn coffer',
        'template lockbox slash composite',
        'template bozja final boss chest',
        'template baldesion arsenal chest',
        'template mech pilot reward',
        'template calamity salvager campaign',
        'template desynthesize',
        'template eureka lockbox',
        'template bozja zone instance',
        'template online store',
        'template sack',
        'template timeworn map',
        'template event with year',
        'template subaquatic voyage',
        'manual override',
        'keep-english fix',
      ],
      counts: {
        scopedUniqueEnglish: englishValues.size,
        dictionaryEntries: entries.size,
        tier1Exact: tierCounts['tier1-exact'],
        tier2Craft: tierCounts['tier2-craft'],
        tier3Vendor: tierCounts['tier3-vendor'],
        tier4Template: tierCounts['tier4-template'],
        templateStandaloneCost: templateCounts.standaloneCost,
        templateInstanceTitle: templateCounts.instanceTitle,
        templateFateLine: templateCounts.fateLine,
        templateGatheredBy: templateCounts.gatheredBy,
        templateSystemShortLabel: templateCounts.systemShortLabel,
        templateRetainerExploration: templateCounts.retainerExploration,
        templateEurekaLockbox: templateCounts.eurekaLockbox,
        templateBozjaZoneInstance: templateCounts.bozjaZoneInstance,
        templateOnlineStore: templateCounts.onlineStore,
        templateSack: templateCounts.sack,
        templateTimewornMap: templateCounts.timewornMap,
        templateEventWithYear: templateCounts.eventWithYear,
        templateSubaquaticVoyage: templateCounts.subaquaticVoyage,
        templateDualNpcCost: templateCounts.dualNpcCost,
        templateSpoilsCollector: templateCounts.spoilsCollector,
        templateAchievementRoute: templateCounts.achievementRoute,
        templatePvpSeries: templateCounts.pvpSeries,
        templateFeastSeason: templateCounts.feastSeason,
        templateYokaiCollaboration: templateCounts.yokaiCollaboration,
        templateSouthHornCoffer: templateCounts.southHornCoffer,
        templateLockboxSlashComposite: templateCounts.lockboxSlashComposite,
        templateBozjaFinalBossChest: templateCounts.bozjaFinalBossChest,
        templateBaldesionArsenalChest: templateCounts.baldesionArsenalChest,
        templateMechPilotReward: templateCounts.mechPilotReward,
        templateCalamitySalvagerCampaign: templateCounts.calamitySalvagerCampaign,
        templateDesynthesize: templateCounts.desynthesize,
        emoteQuestXivapi: templateCounts.emoteQuest,
        englishKeepFix: templateCounts.englishKeep,
        englishFallback: unmatched.length,
        manual: Object.keys(MANUAL_OVERRIDES).length,
      },
    },
    ...[...entries.values()].sort((a, b) => a.en.localeCompare(b.en)),
  ]

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(`Wrote ${OUTPUT_PATH}`)
  console.log(`scoped unique english: ${englishValues.size}`)
  console.log(`dictionary entries: ${entries.size}`)
  console.log(`tier1 exact: ${tierCounts['tier1-exact']}`)
  console.log(`tier2 craft: ${tierCounts['tier2-craft']}`)
  console.log(`tier3 vendor: ${tierCounts['tier3-vendor']}`)
  console.log(`tier4 template: ${tierCounts['tier4-template']}`)
  console.log(`  standalone cost: ${templateCounts.standaloneCost}`)
  console.log(`  instance title: ${templateCounts.instanceTitle}`)
  console.log(`  fate line: ${templateCounts.fateLine}`)
  console.log(`  gathered by: ${templateCounts.gatheredBy}`)
  console.log(`  system short label: ${templateCounts.systemShortLabel}`)
  console.log(`  retainer exploration: ${templateCounts.retainerExploration}`)
  console.log(`  eureka lockbox: ${templateCounts.eurekaLockbox}`)
  console.log(`  bozja zone instance: ${templateCounts.bozjaZoneInstance}`)
  console.log(`  online store: ${templateCounts.onlineStore}`)
  console.log(`  sack: ${templateCounts.sack}`)
  console.log(`  timeworn map: ${templateCounts.timewornMap}`)
  console.log(`  event with year: ${templateCounts.eventWithYear}`)
  console.log(`  subaquatic voyage: ${templateCounts.subaquaticVoyage}`)
  console.log(`  dual npc cost: ${templateCounts.dualNpcCost}`)
  console.log(`  spoils collector: ${templateCounts.spoilsCollector}`)
  console.log(`  achievement route: ${templateCounts.achievementRoute}`)
  console.log(`  pvp series: ${templateCounts.pvpSeries}`)
  console.log(`  feast season: ${templateCounts.feastSeason}`)
  console.log(`  yokai collaboration: ${templateCounts.yokaiCollaboration}`)
  console.log(`  south horn coffer: ${templateCounts.southHornCoffer}`)
  console.log(`  lockbox slash composite: ${templateCounts.lockboxSlashComposite}`)
  console.log(`  bozja final boss chest: ${templateCounts.bozjaFinalBossChest}`)
  console.log(`  baldesion arsenal chest: ${templateCounts.baldesionArsenalChest}`)
  console.log(`  mech pilot reward: ${templateCounts.mechPilotReward}`)
  console.log(`  calamity salvager campaign: ${templateCounts.calamitySalvagerCampaign}`)
  console.log(`  desynthesize: ${templateCounts.desynthesize}`)
  console.log(`  emote quest (xivapi): ${templateCounts.emoteQuest}`)
  console.log(`  english keep fix: ${templateCounts.englishKeep}`)
  console.log(`manual overrides: ${Object.keys(MANUAL_OVERRIDES).length}`)
  console.log(`english fallback: ${unmatched.length}`)

  if (unmatched.length > 0) {
    console.log(`unmatched samples:`)
    unmatched.slice(0, 10).forEach((name) => console.log(` - ${name}`))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
