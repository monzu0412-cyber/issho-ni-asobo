import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type DictionaryEntry = {
  en?: string
  ja?: string
  source?: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MANUAL_DIR = resolve(ROOT, 'src/data/reverse-search/manual')
const OUTPUT_DIR = resolve(ROOT, '.tmp-audit-policy-phase-a')
const TEAMCRAFT_BASE =
  'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json'

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

async function fetchTeamcraftJson<T>(filename: string) {
  const response = await fetch(`${TEAMCRAFT_BASE}/${filename}`)
  if (!response.ok) {
    return null
  }
  return response.json() as Promise<T>
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const dictionary = JSON.parse(await readFile(resolve(MANUAL_DIR, 'content_translation_dictionary.json'), 'utf8')) as Array<DictionaryEntry>
  const vendorEntries = dictionary.filter((entry) => entry.source === 'template-vendor')

  const npcMap = new Map<string, {
    count: number
    npcJaSet: Set<string>
    samples: string[]
  }>()

  for (const entry of vendorEntries) {
    const parsedEn = parseVendorTripleLine(entry.en ?? '')
    const parsedJa = parseVendorTripleLine(entry.ja ?? '')
    if (!parsedEn?.npc) {
      continue
    }

    const current = npcMap.get(parsedEn.npc) ?? {
      count: 0,
      npcJaSet: new Set<string>(),
      samples: [],
    }

    current.count += 1
    if (parsedJa?.npc) {
      current.npcJaSet.add(parsedJa.npc)
    }
    if (current.samples.length < 2) {
      current.samples.push(entry.en!)
    }
    npcMap.set(parsedEn.npc, current)
  }

  const npcsJson = await fetchTeamcraftJson<Record<string, { en?: string; ja?: string; name?: { en?: string; ja?: string } }>>('npcs.json')
  const npcLookup = new Map<string, string>()

  if (npcsJson) {
    for (const record of Object.values(npcsJson)) {
      const en = record.en ?? record.name?.en
      const ja = record.ja ?? record.name?.ja
      if (en && ja) {
        npcLookup.set(en.trim(), ja)
      }
    }
  }

  const rows = [...npcMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([npcEn, data]) => {
      const npcJaInDict = [...data.npcJaSet]
      const npcStillEnglish = npcJaInDict.every((name) => name === npcEn)
      const teamcraftJa = npcLookup.get(npcEn) ?? null
      const genericRole = /Vendor|Quartermaster|Junkmonger|Merchant|Mender|Melder|Trader|Smithy|Custodian|Minion Trader|Housing Merchant|Traveling Merchant|Splendors Vendor|Resistance Quartermaster|Boughbury Trader|Stickpeddler|Giant Beaver|Clerk /i.test(npcEn)

      let jpClientConfirm: 'confirmed' | 'partial' | 'unconfirmed'
      let jpOfficialName: string | null
      let fixNeeded: 'yes' | 'no' | 'review'

      if (teamcraftJa && teamcraftJa !== npcEn) {
        jpClientConfirm = 'confirmed'
        jpOfficialName = teamcraftJa
        fixNeeded = npcStillEnglish ? 'yes' : 'no'
      } else if (genericRole) {
        jpClientConfirm = 'partial'
        jpOfficialName = null
        fixNeeded = 'review'
      } else if (/^[A-Z0-9-]+$/.test(npcEn) || npcEn === 'Neon') {
        jpClientConfirm = 'confirmed'
        jpOfficialName = npcEn
        fixNeeded = 'no'
      } else {
        jpClientConfirm = 'unconfirmed'
        jpOfficialName = null
        fixNeeded = npcStillEnglish ? 'review' : 'no'
      }

      return {
        npcEn,
        count: data.count,
        jpClientConfirm,
        jpOfficialName,
        currentDictState: npcStillEnglish ? 'NPC英語維持' : `NPC部分日本語: ${npcJaInDict.join(' / ')}`,
        oldPolicyImpact: npcStillEnglish ? 'あり' : 'なし',
        fixNeeded,
        teamcraftJa,
        samples: data.samples,
      }
    })

  const summary = {
    vendorLines: vendorEntries.length,
    uniqueNpcs: rows.length,
    oldPolicyImpactYes: rows.filter((row) => row.oldPolicyImpact === 'あり').length,
    fixNeededYes: rows.filter((row) => row.fixNeeded === 'yes').length,
    fixNeededReview: rows.filter((row) => row.fixNeeded === 'review').length,
    fixNeededNo: rows.filter((row) => row.fixNeeded === 'no').length,
    jpConfirmed: rows.filter((row) => row.jpClientConfirm === 'confirmed' && row.jpOfficialName && row.jpOfficialName !== row.npcEn).length,
  }

  await writeFile(resolve(OUTPUT_DIR, 'vendor-npc-audit.json'), `${JSON.stringify({ summary, rows }, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ summary, rows }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
