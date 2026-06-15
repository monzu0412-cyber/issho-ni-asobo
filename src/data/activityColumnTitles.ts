export const activityColumnMainTitles = {
  want: 'いっしょにあ・そ・ぼ？',
  help: 'いっしょにあ・そ・ぼ！',
} as const

export const activityColumnSubtitleOptions = {
  want: [
    '誘われると嬉しいこと',
    '一緒にやりたいこと',
    '声かけてほしいこと',
    '拉致歓迎！',
  ],
  help: [
    '一緒にできること',
    '誘われたら行けること',
    '参加できます！',
    '手伝えます！',
  ],
} as const

export type ActivityColumnKey = keyof typeof activityColumnMainTitles

export type WantSectionSubtitle = typeof activityColumnSubtitleOptions.want[number]
export type HelpSectionSubtitle = typeof activityColumnSubtitleOptions.help[number]

export const defaultActivitySectionTitles = {
  want: activityColumnSubtitleOptions.want[0],
  help: activityColumnSubtitleOptions.help[0],
} as const

const legacyWantSubtitleByStoredTitle: Record<string, WantSectionSubtitle> = {
  '誘って！': '声かけてほしいこと',
  '手伝って！': '一緒にやりたいこと',
  '連れてって！': '一緒にやりたいこと',
  '拉致歓迎！': '拉致歓迎！',
  'asobo-invite': '誘われると嬉しいこと',
  'さそってくれたらいいなぁ': '誘われると嬉しいこと',
}

const legacyHelpSubtitleByStoredTitle: Record<string, HelpSectionSubtitle> = {
  '手伝える！': '手伝えます！',
  'いける！': '一緒にできること',
  'ついていきます。': '参加できます！',
  '護衛可能': '手伝えます！',
  'asobo-join': '一緒にできること',
  'いけること': '一緒にできること',
}

export function normalizeWantSectionTitle(
  value: unknown,
  fallback: WantSectionSubtitle = defaultActivitySectionTitles.want,
): WantSectionSubtitle {
  if (typeof value === 'string') {
    if ((activityColumnSubtitleOptions.want as readonly string[]).includes(value)) {
      return value as WantSectionSubtitle
    }

    const legacy = legacyWantSubtitleByStoredTitle[value]
    if (legacy) {
      return legacy
    }
  }

  return fallback
}

export function normalizeHelpSectionTitle(
  value: unknown,
  fallback: HelpSectionSubtitle = defaultActivitySectionTitles.help,
): HelpSectionSubtitle {
  if (typeof value === 'string') {
    if ((activityColumnSubtitleOptions.help as readonly string[]).includes(value)) {
      return value as HelpSectionSubtitle
    }

    const legacy = legacyHelpSubtitleByStoredTitle[value]
    if (legacy) {
      return legacy
    }
  }

  return fallback
}
