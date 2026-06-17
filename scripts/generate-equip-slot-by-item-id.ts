import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const EQUIP_SLOTS = ['頭', '胴', '手', '脚', '足'] as const
type EquipSlot = (typeof EQUIP_SLOTS)[number]

type PrototypeCandidate = {
  type?: string
  itemId?: number
  slot?: string
}

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROTOTYPE_DIR = resolve(ROOT_DIR, 'src/data/reverse-search/prototype')
const GENERATED_DIR = resolve(ROOT_DIR, 'src/data/reverse-search/generated')
const OUTPUT_PATH = resolve(GENERATED_DIR, 'equip_slot_by_item_id.generated.json')

const PROTOTYPE_FILES = [
  'head_gear_source_candidates.json',
  'body_gear_source_candidates.json',
  'hands_gear_source_candidates.json',
  'legs_gear_source_candidates.json',
  'feet_gear_source_candidates.json',
] as const

function isEquipSlot(value: string): value is EquipSlot {
  return (EQUIP_SLOTS as readonly string[]).includes(value)
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

async function writeGeneratedJson(path: string, value: unknown) {
  const fileName = basename(path)
  const pathFromGenerated = relative(GENERATED_DIR, path)

  if (isAbsolute(pathFromGenerated) || pathFromGenerated.startsWith('..') || !fileName.endsWith('.generated.json')) {
    throw new Error(`Refusing to write outside generated/*.generated.json: ${path}`)
  }

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function generateEquipSlotByItemId() {
  const slotByItemId: Record<string, EquipSlot> = {}

  for (const fileName of PROTOTYPE_FILES) {
    const candidates = await readJson<PrototypeCandidate[]>(resolve(PROTOTYPE_DIR, fileName))

    for (const entry of candidates) {
      if (entry.type === 'metadata' || typeof entry.itemId !== 'number' || !entry.slot) {
        continue
      }

      if (!isEquipSlot(entry.slot)) {
        throw new Error(`Invalid slot "${entry.slot}" for itemId ${entry.itemId} in ${fileName}`)
      }

      const key = String(entry.itemId)
      const existing = slotByItemId[key]

      if (existing && existing !== entry.slot) {
        throw new Error(`Conflicting slot for itemId ${entry.itemId}: ${existing} vs ${entry.slot}`)
      }

      slotByItemId[key] = entry.slot
    }
  }

  await writeGeneratedJson(OUTPUT_PATH, slotByItemId)

  return {
    outputPath: OUTPUT_PATH,
    entryCount: Object.keys(slotByItemId).length,
  }
}

async function main() {
  const result = await generateEquipSlotByItemId()
  console.log(`Generated ${result.entryCount} equip slot entries -> ${relative(ROOT_DIR, result.outputPath)}`)
}

const isMain = Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)

if (isMain) {
  await main()
}
