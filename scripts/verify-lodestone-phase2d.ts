import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeLodestoneProfileOnRefetch } from '../src/lib/lodestone/mergeLodestoneProfileOnRefetch.ts'
import { createDefaultLodestoneCardState } from '../src/types/lodestone.ts'
import {
  buildCharacterDraft,
  CARD_DRAFT_VERSION,
  parseCardDraft,
  sanitizeLodestoneCardState,
} from '../src/utils/cardDraftStorage.ts'
import { createDefaultCardDraftForWorlds } from '../src/utils/characterState.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, 'output/lodestone-phase2d-verify.json')

const worldsByDc = {
  Elemental: ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'],
  Gaia: ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
  Mana: ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan'],
  Meteor: ['Belias', 'Mandragora', 'Ramuh', 'Shinryu', 'Unicorn', 'Valefor', 'Yojimbo', 'Zeromus'],
} as const

const sampleProfile = {
  characterId: '12345678',
  name: 'Sample Character',
  world: 'Shinryu',
  dataCenter: 'Meteor',
  jobs: [
    { jobId: 'PLD', jobName: 'ナイト', level: 100, isCapped: true },
    { jobId: 'WAR', jobName: '戦士', level: 90, isCapped: false },
  ],
}

function main() {
  const failures: string[] = []
  const fallback = createDefaultCardDraftForWorlds(worldsByDc)

  const beforeLodestone = {
    ...createDefaultLodestoneCardState(),
    characterId: '12345678',
    input: '12345678',
    leftColumnDisplayMode: 'jobs' as const,
    jobSelections: {
      PLD: 'main' as const,
      WAR: 'playable' as const,
    },
    profile: {
      ...sampleProfile,
      jobs: [{ jobId: 'PLD', jobName: 'ナイト', level: 90, isCapped: false }],
    },
  }

  const updatedProfile = {
    ...sampleProfile,
    jobs: [
      { jobId: 'PLD', jobName: 'ナイト', level: 100, isCapped: true },
      { jobId: 'WAR', jobName: '戦士', level: 100, isCapped: true },
    ],
  }

  const merged = mergeLodestoneProfileOnRefetch(beforeLodestone, updatedProfile)

  if (merged.jobSelections.PLD !== 'main' || merged.jobSelections.WAR !== 'playable') {
    failures.push('refetch merge did not preserve jobSelections')
  }

  if (merged.leftColumnDisplayMode !== 'jobs') {
    failures.push('refetch merge did not preserve leftColumnDisplayMode')
  }

  if (merged.profile?.jobs[0]?.isCapped !== true) {
    failures.push('refetch merge did not update profile jobs')
  }

  if (merged.characterId !== '12345678') {
    failures.push('refetch merge did not update characterId from profile')
  }

  const oldDraftJson = JSON.stringify({
    version: CARD_DRAFT_VERSION,
    layoutMode: 'character',
    cardColorTheme: 'blue',
    cardBaseBackground: '02',
    cardSectionTheme: 'fish',
    cardSectionStyle: 'simple',
    targetSearchQueries: ['', '', ''],
    contentSelections: fallback.contentSelections,
    character: {
      name: 'Legacy Character',
      dc: 'Meteor',
      world: 'Shinryu',
      imageSettings: { scale: 1, x: 0, y: 0, rotation: 0 },
      imageFrameTheme: 'simple',
      targetFrameTheme: 'simple',
      roles: { tank: true, healer: false, dps: false },
      playTime: fallback.character.playTime,
      vc: 'VC OK',
      interests: fallback.character.interests,
      targets: [],
      todoList: [],
      unfinishedList: [],
      sectionTitles: fallback.character.sectionTitles,
      tags: [],
      message: 'legacy message',
    },
  })

  const oldDraft = parseCardDraft(oldDraftJson, fallback)

  if (!oldDraft) {
    failures.push('old draft without lodestone failed to parse')
  } else {
    if (oldDraft.layoutMode !== 'character') {
      failures.push('old draft layoutMode not restored')
    }

    if (oldDraft.character.name !== 'Legacy Character') {
      failures.push('old draft character name not restored')
    }

    const restoredLodestone = sanitizeLodestoneCardState(oldDraft.character.lodestone, createDefaultLodestoneCardState())

    if (restoredLodestone.characterId !== '' || restoredLodestone.profile !== null) {
      failures.push('old draft should use default lodestone state')
    }
  }

  const fullCharacter = {
    ...fallback.character,
    name: 'Rogan Stone',
    dc: 'Meteor' as const,
    world: 'Shinryu',
    imageSettings: { scale: 1.1, x: 2, y: -3, rotation: 5 },
    lodestone: {
      characterId: '12345678',
      input: '12345678',
      leftColumnDisplayMode: 'jobs' as const,
      jobSelections: { PLD: 'main' as const, GNB: 'playable' as const },
      profile: sampleProfile,
    },
  }

  const builtDraft = buildCharacterDraft(fullCharacter)
  const roundTrip = parseCardDraft(JSON.stringify({
    version: CARD_DRAFT_VERSION,
    layoutMode: 'asobo',
    cardColorTheme: fallback.cardColorTheme,
    cardBaseBackground: fallback.cardBaseBackground,
    cardSectionTheme: fallback.cardSectionTheme,
    cardSectionStyle: fallback.cardSectionStyle,
    targetSearchQueries: ['alpha', 'beta', 'gamma'],
    contentSelections: fallback.contentSelections,
    character: builtDraft,
  }), fallback)

  if (!roundTrip) {
    failures.push('full draft round-trip failed to parse')
  } else {
    if (roundTrip.layoutMode !== 'asobo') {
      failures.push('round-trip layoutMode mismatch')
    }

    if (roundTrip.character.name !== 'Rogan Stone') {
      failures.push('round-trip name mismatch')
    }

    if (roundTrip.character.dc !== 'Meteor' || roundTrip.character.world !== 'Shinryu') {
      failures.push('round-trip dc/world mismatch')
    }

    const lodestone = sanitizeLodestoneCardState(roundTrip.character.lodestone, createDefaultLodestoneCardState())

    if (lodestone.characterId !== '12345678') {
      failures.push('round-trip lodestone.characterId mismatch')
    }

    if (lodestone.leftColumnDisplayMode !== 'jobs') {
      failures.push('round-trip leftColumnDisplayMode mismatch')
    }

    if (lodestone.jobSelections.PLD !== 'main' || lodestone.jobSelections.GNB !== 'playable') {
      failures.push('round-trip jobSelections mismatch')
    }

    if (!lodestone.profile || lodestone.profile.name !== 'Sample Character') {
      failures.push('round-trip lodestone.profile mismatch')
    }

    if (roundTrip.character.imageSettings.scale !== 1.1) {
      failures.push('round-trip imageSettings mismatch')
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mergeResult: merged,
    oldDraftCharacterName: oldDraft?.character.name ?? null,
    oldDraftLodestone: oldDraft
      ? sanitizeLodestoneCardState(oldDraft.character.lodestone, createDefaultLodestoneCardState())
      : null,
    roundTrip: roundTrip
      ? {
          layoutMode: roundTrip.layoutMode,
          name: roundTrip.character.name,
          lodestone: sanitizeLodestoneCardState(roundTrip.character.lodestone, createDefaultLodestoneCardState()),
          imageSettings: roundTrip.character.imageSettings,
        }
      : null,
    failures,
    pass: failures.length === 0,
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify(report, null, 2))

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main()
