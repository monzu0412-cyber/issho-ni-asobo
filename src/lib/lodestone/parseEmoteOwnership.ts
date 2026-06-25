import {
  buildCollectionOwnershipResult,
  type ResolvedLodestoneCollectionItem,
} from './parseCollectionOwnership.js'
import type {
  LodestoneEmoteOwnershipResult,
  LodestoneEmoteUnmatchedEntry,
} from '../../types/lodestoneEmote.js'

const CATEGORY = 'エモート'

export const EMOTE_LODESTONE_CATEGORY_LABELS: Record<string, string> = {
  '1': '全般',
  '2': 'スペシャル',
  '3': '表情',
}

export type ParsedEmoteListItem = {
  lodestoneName: string
  tooltipHref?: string
  category?: string
}

export function parseEmoteListPage(html: string): {
  totalOnLodestone: number
  items: ParsedEmoteListItem[]
} {
  const listMatch = html.match(/<ul class="emote__list[^"]*"[^>]*>([\s\S]*?)<\/ul>/)
  const listHtml = listMatch?.[1] ?? ''

  const items: ParsedEmoteListItem[] = []

  for (const match of listHtml.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi)) {
    const attrs = match[1]
    const content = match[2]
    const lodestoneName = content.match(/<p>([^<]+)<\/p>/)?.[1]?.trim()

    if (!lodestoneName) {
      continue
    }

    const category = attrs.match(/data-category="(\d+)"/)?.[1]
    const tooltipHref = attrs.match(/data-tooltip_href="([^"]+)"/)?.[1]

    items.push({
      lodestoneName,
      category,
      tooltipHref,
    })
  }

  return {
    totalOnLodestone: items.length,
    items,
  }
}

export function buildEmoteOwnershipResult(
  characterId: string,
  totalOnLodestone: number,
  lodestoneEmotes: ParsedEmoteListItem[],
  unmatchedFromFetch: LodestoneEmoteUnmatchedEntry[] = [],
): LodestoneEmoteOwnershipResult {
  const resolvedItems: ResolvedLodestoneCollectionItem[] = lodestoneEmotes.map((item) => ({
    lodestoneName: item.lodestoneName,
    tooltipHref: item.tooltipHref,
    lodestoneCategory: item.category
      ? EMOTE_LODESTONE_CATEGORY_LABELS[item.category] ?? item.category
      : undefined,
  }))

  return buildCollectionOwnershipResult(
    CATEGORY,
    characterId,
    totalOnLodestone,
    resolvedItems,
    unmatchedFromFetch,
  )
}
