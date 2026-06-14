import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANUAL_DIR = resolve(__dirname, '../src/data/reverse-search/manual')

const contentJa = new Map(
  JSON.parse(readFileSync(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8'))
    .filter((entry) => entry.type !== 'metadata')
    .map((entry) => [entry.en, entry.ja]),
)

const src = JSON.parse(readFileSync(resolve(MANUAL_DIR, 'source_dictionary.json'), 'utf8')).filter(
  (entry) => entry.category1 === 'エモート',
)

const isJa = (text) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)

const questTexts = new Set([
  'A Dream Realized',
  'Imposing Views',
  'An Intrepid New Enterprise',
  'A Dream Worth Chasing',
  'Death Unto Dawn',
  'Learning to Lali-ho',
  "Don't Do the Dewprism",
  'What a Wonder-full World',
  'The Call',
  'The Fire-bird Down Below',
  'Emissary of the Dawn',
  'Tidings from the East',
  "Arenvald's Adventure",
  'In Soroban We Trust',
  'Confederate Consternation',
  'Acting the Part',
  'Good for What Ales You',
  'Saw That One Coming',
  'Help Me, Lord of the Dance',
  'Toss Fit Workout',
  'A Spectacle for the Ages',
  'Causes and Costs',
  'Letters from No One',
  'The Burdens We Bear',
  'Piecing Together the Past',
  'Eternity, Loyalty, Honesty',
  'The Hammer',
  'Sundrop the Beat',
])

const instanceDictTexts = new Set([
  'The Dungeons of Lyhe Ghiah',
  'The Shifting Oubliettes of Lyhe Ghiah',
])

const currencyTexts = new Set([
  "1,800 Skybuilders' Scrips",
  '1,800 Skybuilders\' Scrips (Unlock with the "Read" emote)',
  '10,000 Company Seals',
  '100,000 MGP',
  '3,000 Trophy Crystals',
  '30 Chunks of Sanguinite',
  '40,000 Company Seals',
  '50 Bozjan Clusters',
  '50 Fragments of Illumed Aetherpool Glass',
  '80,000 MGP',
  '9,600 Cosmocredits',
  "900 Skybuilders' Scrips",
])

const keepEnglishTexts = new Set([
  'Online Store',
  'Available if registered in the Companion app',
  'Ceremony of Eternal Bonding',
  'Collect sources unavailable',
  'Item code included with Meister Quality Figure Hydaelyn & Zodiark',
  'Item code included with Meister Quality Figure Odin',
  'Item code included with Meister Quality Figure Omega',
  'Item code included with Meister Quality Figure Shiva',
  'Item code included with Meister Quality Figure Ultima, the High Seraph',
  'Jollibee Promotion (NA Only)',
  'KFC Promotion (Japan Only)',
  'Recruit a Friend Campaign reward',
  'Unresolved',
])

function classifyText(text) {
  if (contentJa.has(text) || isJa(text)) return 'covered_existing'
  if (questTexts.has(text)) return 'tier1_quest_xivapi'
  if (instanceDictTexts.has(text) || contentJa.has(text)) return 'tier2_instance_dict'
  if (currencyTexts.has(text)) return 'tier3_currency_template'
  if (keepEnglishTexts.has(text)) return 'tier5_keep_english'
  if (/Moonfire Faire|All Saints' Wake|Make It Rain|Little Ladies' Day|Valentione's Day|Starlight Celebration/.test(text)) {
    return 'tier4_event_manual'
  }
  if (/^PvP Series \d+ - Level \d+$/.test(text)) return 'tier4_pvp_template'
  if (/ - .+ - /.test(text)) return 'tier3_vendor_template'
  if (/Lockbox|South Horn -/.test(text)) return 'tier6_occult_manual'
  if (/^Cosmic Fortune - /.test(text)) return 'tier4_cosmic_manual'
  return 'tier4_manual_dictionary'
}

const routeTierCounts = {}
const uniqueTierCounts = {}
const uniqueByTier = new Map()

for (const entry of src) {
  for (const route of entry.acquisitionRoutes) {
    for (const text of new Set([route.contentName, route.detail])) {
      const tier = classifyText(text)
      routeTierCounts[tier] = (routeTierCounts[tier] ?? 0) + 1
      if (!uniqueByTier.has(tier)) uniqueByTier.set(tier, new Set())
      uniqueByTier.get(tier).add(text)
    }
  }
}

for (const [tier, texts] of uniqueByTier.entries()) {
  uniqueTierCounts[tier] = texts.size
}

const totalRouteRefs = Object.values(routeTierCounts).reduce((sum, count) => sum + count, 0)
const coveredRouteRefs =
  (routeTierCounts.covered_existing ?? 0) +
  (routeTierCounts.tier1_quest_xivapi ?? 0) +
  (routeTierCounts.tier2_instance_dict ?? 0) +
  (routeTierCounts.tier3_currency_template ?? 0) +
  (routeTierCounts.tier3_vendor_template ?? 0) +
  (routeTierCounts.tier4_pvp_template ?? 0) +
  (routeTierCounts.tier5_keep_english ?? 0)

console.log(
  JSON.stringify(
    {
      totalRouteFieldRefs: totalRouteRefs,
      routeTierCounts,
      uniqueTierCounts,
      autoResolvableRouteFieldRefs:
        (routeTierCounts.tier1_quest_xivapi ?? 0) +
        (routeTierCounts.tier3_currency_template ?? 0) +
        (routeTierCounts.tier3_vendor_template ?? 0) +
        (routeTierCounts.tier4_pvp_template ?? 0),
      coveredAfterTier1to5:
        coveredRouteRefs + (routeTierCounts.tier4_event_manual ?? 0) + (routeTierCounts.tier4_cosmic_manual ?? 0),
      manualDictionaryUnique:
        (uniqueTierCounts.tier4_event_manual ?? 0) +
        (uniqueTierCounts.tier4_manual_dictionary ?? 0) +
        (uniqueTierCounts.tier4_cosmic_manual ?? 0) +
        (uniqueTierCounts.tier6_occult_manual ?? 0),
      eventManualTexts: [...(uniqueByTier.get('tier4_event_manual') ?? [])].sort(),
      manualDictionaryTexts: [...(uniqueByTier.get('tier4_manual_dictionary') ?? [])].sort(),
    },
    null,
    2,
  ),
)
