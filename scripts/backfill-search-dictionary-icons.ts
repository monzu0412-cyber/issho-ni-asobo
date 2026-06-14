import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type SearchItem = {
  type?: string
  id?: number | null
  iconPath?: string | null
  iconPathHr1?: string | null
  iconUrl?: string | null
  [key: string]: unknown
}

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SEARCH_DICTIONARY_PATH = resolve(
  ROOT_DIR,
  'src/data/reverse-search/generated/search_dictionary.generated.json',
)

function getBaseIconPath(iconPathHr1: string): string {
  return iconPathHr1.replace('_hr1.tex', '.tex')
}

function getIconUrl(iconPathHr1: string): string {
  return `https://v2.xivapi.com/api/asset?path=${iconPathHr1}&format=png`
}

function buildIconPathHr1FromIconId(iconId: number): string {
  const folder = String(Math.floor(iconId / 1000) * 1000).padStart(6, '0')
  const file = String(iconId).padStart(6, '0')

  return `ui/icon/${folder}/${file}_hr1.tex`
}

async function fetchGarlandItemIcon(itemId: number) {
  const response = await fetch(
    `https://garlandtools.org/api/get.php?type=item&version=3&id=${itemId}&lang=en`,
    { signal: AbortSignal.timeout(15000) },
  )

  if (!response.ok) {
    return null
  }

  const payload = await response.json() as { item?: { icon?: number } }
  const iconId = payload.item?.icon

  if (typeof iconId !== 'number') {
    return null
  }

  const iconPathHr1 = buildIconPathHr1FromIconId(iconId)

  return {
    iconPath: getBaseIconPath(iconPathHr1),
    iconPathHr1,
    iconUrl: getIconUrl(iconPathHr1),
  }
}

async function main() {
  const dictionary = JSON.parse(await readFile(SEARCH_DICTIONARY_PATH, 'utf8')) as SearchItem[]
  const metadata = dictionary.find((entry) => entry.type === 'metadata')
  const items = dictionary.filter((entry) => entry.type !== 'metadata')

  const missingItemIds = [...new Set(
    items
      .filter((item) => !item.iconUrl && item.id != null)
      .map((item) => item.id as number),
  )]

  console.log(`Backfilling icons for ${missingItemIds.length} itemIds...`)

  const iconByItemId = new Map<number, NonNullable<Awaited<ReturnType<typeof fetchGarlandItemIcon>>>>()
  let fetched = 0

  for (const itemId of missingItemIds) {
    fetched += 1

    if (fetched % 50 === 0 || fetched === missingItemIds.length) {
      console.log(`Fetched ${fetched}/${missingItemIds.length}`)
    }

    try {
      const icon = await fetchGarlandItemIcon(itemId)

      if (icon) {
        iconByItemId.set(itemId, icon)
      }
    } catch (error) {
      console.warn(`Failed to fetch icon for itemId ${itemId}:`, error)
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25))
  }

  let updatedCount = 0

  const updatedItems = items.map((item) => {
    if (item.iconUrl || item.id == null) {
      return item
    }

    const icon = iconByItemId.get(item.id)

    if (!icon) {
      return item
    }

    updatedCount += 1

    return {
      ...item,
      iconPath: icon.iconPath,
      iconPathHr1: icon.iconPathHr1,
      iconUrl: icon.iconUrl,
    }
  })

  const output = metadata ? [metadata, ...updatedItems] : updatedItems

  await writeFile(SEARCH_DICTIONARY_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(`Updated ${updatedCount} search items with iconUrl.`)
}

await main()
