import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function classify(name) {
  if (/^Item code included with /i.test(name)) {
    return { category: 'edition-promo', subcategory: 'item-code-bundle', recommendation: 'english-fallback', risk: 'low', priority: 'P4' }
  }
  if (/Original Soundtrack$|Collector'?s Edition$|Pre-order$|Artbook$|Encyclopaedia Eorzea|Fan Festival Album|Compilation Album|Primals Live|Zepp Tour/i.test(name)) {
    return { category: 'edition-promo', subcategory: 'product-name', recommendation: 'english-fallback', risk: 'low', priority: 'P4' }
  }
  if (/^Fan Festival 20\d{2}/i.test(name)) {
    return { category: 'edition-promo', subcategory: 'fan-festival', recommendation: 'english-fallback', risk: 'low', priority: 'P4' }
  }
  if (/Promotion \(|Campaign reward|In-Game Item Campaign|Recruit a Friend|Butterfinger|Lawson|Gong Cha|Twitch Campaign|Ceremony of Eternal Bonding|Attend a Ceremony|Fly the Falcon|Mech Pilot Reward|Calamity Salvager - \d+ Gold Chocobo|Online Store \(China Only\)/i.test(name)) {
    return { category: 'edition-promo', subcategory: 'promo-campaign', recommendation: 'english-fallback', risk: 'low', priority: 'P4' }
  }
  if (/^Cosmic Fortune - /i.test(name)) {
    return { category: 'edition-promo', subcategory: 'cosmic-fortune', recommendation: 'manual-dictionary', risk: 'medium', priority: 'P3' }
  }
  if (/^Online Store - /i.test(name)) {
    return { category: 'edition-promo', subcategory: 'online-store-set', recommendation: 'english-fallback', risk: 'low', priority: 'P4' }
  }
  if (/Collaboration/i.test(name)) {
    return { category: 'edition-promo', subcategory: 'collaboration', recommendation: 'english-fallback', risk: 'low', priority: 'P4' }
  }

  if (/^\d[\d,]* (?:MGP|MGF|Gil|(?:Flame|Serpent|Storm) Seals|Allied Seals|Centurio Seals|Wolf Marks|Trophy Crystals|Cosmocredits|Faux Leaves|Bicolor Gemstones|Bozjan Clusters|Fête Tokens|Vegetal Vouchers|Enlightenment (?:Gold|Silver) Pieces|Allagan Silver Pieces|First Light Relics|Token Booklets|Auxesia Token Booklets|Oizys Token Booklets|Phaenna Token Booklets)/i.test(name)) {
    return { category: 'currency-token', subcategory: 'standalone-currency', recommendation: 'auto-template', risk: 'low', priority: 'P1' }
  }
  if (/^\d+ (?:Chunks? of Sanguinite|Phials? of Luminous Oil)/i.test(name)) {
    return { category: 'currency-token', subcategory: 'item-quantity', recommendation: 'manual-dictionary', risk: 'high', priority: 'P3' }
  }
  if (/Lockbox|Southern Front Lockbox|Zadnor Lockbox/i.test(name) && !/Eureka|Happy Bunny|Heat-warped|Moisture-warped/i.test(name)) {
    return { category: 'currency-token', subcategory: 'lockbox', recommendation: 'manual-dictionary', risk: 'medium', priority: 'P3' }
  }

  if (/^[A-Za-z].+ - .+ - \d/.test(name) || /^J'lakshai/i.test(name) || /^Spoils Collector - /i.test(name)) {
    return { category: 'vendor-composite', subcategory: /FATE|Horns|Fragments|Cog|Bolts|Beads|Bottles|Burning|Tonic|Sacks Of Nuts|Spoil/i.test(name) ? 'fate-vendor' : 'npc-vendor', recommendation: 'manual-dictionary', risk: 'medium', priority: 'P2' }
  }
  if (/^The Baldesion Arsenal|^Nesvaaz - |^Eschina - |^Fathard - /i.test(name)) {
    return { category: 'vendor-composite', subcategory: 'special-vendor', recommendation: 'manual-dictionary', risk: 'medium', priority: 'P2' }
  }

  if (/^Crafted by .+ - (?:Exploratory|Subaquatic) Voyages:/i.test(name)) {
    return { category: 'proper-content', subcategory: 'voyage-crafted', recommendation: 'english-fallback', risk: 'low', priority: 'P4' }
  }
  if (/^FATE "/i.test(name)) {
    return { category: 'proper-content', subcategory: 'fate-line', recommendation: 'manual-dictionary', risk: 'medium', priority: 'P2' }
  }
  if (/^Heaven-on-High|^The Palace of the Dead|^Pilgrim's Traverse|^Eureka Orthos|^Eureka (?:Anemos|Pagos|Pyros|Hydatos)|^Happy Bunny Lockbox|^Heat-warped Lockbox|^Moisture-warped Lockbox|^Zadnor - /i.test(name)) {
    return { category: 'proper-content', subcategory: 'deep-dungeon-eureka', recommendation: 'manual-dictionary', risk: 'medium', priority: 'P2' }
  }
  if (/^Field Exploration|^Highland Exploration|^Quick Exploration|^Waterside Exploration|^Woodland Exploration|^Gathered by |^Desynthesize|^Gardening|^Skybuilders|^Bronze\/Silver|^Voyagers' Record|^Ancient Record|^Eureka$|^Bozja$|^Protectors of the Wood|^One Forest|^Tasteful Memories|^All That She Carried|^Moogle Treasure Trove|^Dalriada|^Delubrum|^Crystalline Conflict|^The Dusk Vigil|^The Stone Vigil|^Gold Saucer$|^Voyages$|^Tribal$|^South Horn - /i.test(name)) {
    return { category: 'proper-content', subcategory: 'game-system', recommendation: 'manual-dictionary', risk: 'medium', priority: 'P2' }
  }
  if (/^PvP Series|^The Feast: Season/i.test(name)) {
    return { category: 'proper-content', subcategory: 'pvp-feast', recommendation: 'manual-dictionary', risk: 'medium', priority: 'P3' }
  }
  if (/^Timeworn .+ Map$/i.test(name)) {
    return { category: 'proper-content', subcategory: 'timeworn-map', recommendation: 'auto-template', risk: 'low', priority: 'P1' }
  }
  if (/^The Minstrel's Ballad:|^The Cloud of Darkness|^The Hidden Canals|^The Void Ark|^The Thousand Maws|^The Landsguard's New Clothes/i.test(name) || /^[A-Z].*(?:\(Extreme\)|\(Hard\)|\(Savage\)|\(Chaotic\)|Turn \d+)/i.test(name)) {
    return { category: 'proper-content', subcategory: 'instance-title', recommendation: 'auto-template', risk: 'medium', priority: 'P1' }
  }

  return { category: 'other', subcategory: 'misc', recommendation: 'defer', risk: 'high', priority: 'P5' }
}

async function main() {
  const result = JSON.parse(await readFile(resolve('.tmp-audit-phase7d/result.json'), 'utf8'))
  const classified = result.allFallback.map((entry) => ({ name: entry.name, ...classify(entry.name) }))

  const byCategory = Object.groupBy(classified, (entry) => entry.category)
  const byRec = Object.groupBy(classified, (entry) => entry.recommendation)
  const byPriority = Object.groupBy(classified, (entry) => entry.priority)

  const subcounts = Object.entries(
    classified.reduce((acc, entry) => {
      const key = `${entry.category}/${entry.subcategory}`
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const englishKeep = classified.filter((entry) => entry.recommendation === 'english-fallback')
  const auto = classified.filter((entry) => entry.recommendation === 'auto-template')
  const manual = classified.filter((entry) => entry.recommendation === 'manual-dictionary')
  const defer = classified.filter((entry) => entry.recommendation === 'defer')
  const costEffective = classified.filter((entry) => entry.priority === 'P1' || (entry.priority === 'P2' && entry.risk !== 'high'))

  const conservativeResolvable = auto.length + manual.filter((e) => e.risk !== 'high').length
  const optimisticResolvable = auto.length + manual.length

  const output = {
    currentFallbackTotal: 260,
    currentCoveragePct: '77.0',
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, v.length])),
    byRecommendation: Object.fromEntries(Object.entries(byRec).map(([k, v]) => [k, v.length])),
    byPriority: Object.fromEntries(Object.entries(byPriority).map(([k, v]) => [k, v.length])),
    subcounts,
    autoCount: auto.length,
    manualCount: manual.length,
    englishKeepCount: englishKeep.length,
    deferCount: defer.length,
    costEffectiveCount: costEffective.length,
    highRisk: classified.filter((e) => e.risk === 'high').map((e) => e.name),
    projections: {
      conservative: {
        resolved: conservativeResolvable,
        fallbackAfter: 260 - conservativeResolvable,
        coveragePct: (((1131 - (260 - conservativeResolvable)) / 1131) * 100).toFixed(1),
      },
      optimistic: {
        resolved: optimisticResolvable,
        fallbackAfter: 260 - optimisticResolvable,
        coveragePct: (((1131 - (260 - optimisticResolvable)) / 1131) * 100).toFixed(1),
      },
      withEnglishKeep: {
        note: 'edition-promo/product names remain English by policy',
        englishKeep: englishKeep.length,
        netResolvable: optimisticResolvable,
        fallbackAfter: 260 - optimisticResolvable,
        coveragePct: (((1131 - (260 - optimisticResolvable)) / 1131) * 100).toFixed(1),
      },
    },
    top20Examples: classified.slice(0, 20),
    examplesByCategory: Object.fromEntries(
      ['vendor-composite', 'edition-promo', 'proper-content', 'currency-token', 'other'].map((cat) => [
        cat,
        classified.filter((e) => e.category === cat).slice(0, 20),
      ]),
    ),
    allClassified: classified,
  }

  await writeFile(resolve('.tmp-audit-phase7d/final-analysis.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    byCategory: output.byCategory,
    byRecommendation: output.byRecommendation,
    byPriority: output.byPriority,
    subcounts: output.subcounts,
    autoCount: output.autoCount,
    manualCount: output.manualCount,
    englishKeepCount: output.englishKeepCount,
    deferCount: output.deferCount,
    costEffectiveCount: output.costEffectiveCount,
    projections: output.projections,
    highRisk: output.highRisk,
  }, null, 2))
}

main()
