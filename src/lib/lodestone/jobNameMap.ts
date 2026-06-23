const JOB_NAME_TO_ID: Record<string, string> = {
  剣術士: 'GLA',
  ナイト: 'PLD',
  斧術士: 'MRD',
  戦士: 'WAR',
  暗黒騎士: 'DRK',
  ガンブレイカー: 'GNB',
  幻術士: 'CNJ',
  白魔道士: 'WHM',
  学者: 'SCH',
  占星術師: 'AST',
  賢者: 'SGE',
  格闘士: 'PGL',
  モンク: 'MNK',
  槍術士: 'LNC',
  竜騎士: 'DRG',
  リーパー: 'RPR',
  双剣士: 'ROG',
  忍者: 'NIN',
  侍: 'SAM',
  ヴァイパー: 'VPR',
  弓術士: 'ARC',
  吟遊詩人: 'BRD',
  機工士: 'MCH',
  踊り子: 'DNC',
  呪術士: 'THM',
  黒魔道士: 'BLM',
  巴術士: 'ACN',
  召喚士: 'SMN',
  赤魔道士: 'RDM',
  青魔道士: 'BLU',
  ピクトマンサー: 'PCT',
  木工師: 'CRP',
  鍛冶師: 'BSM',
  甲冑師: 'ARM',
  彫金師: 'GSM',
  革細工師: 'LTW',
  裁縫師: 'WVR',
  錬金術師: 'ALC',
  調理師: 'CUL',
  採掘師: 'MIN',
  園芸師: 'BTN',
  漁師: 'FSH',
}

/**
 * Lodestone tooltips sometimes combine advanced + base class names
 * (e.g. "ナイト / 剣術士"). Prefer the advanced job name before "/".
 */
export function normalizeJobName(jobName: string): string {
  const withoutTag = jobName.replace(/\s*\[[^\]]+\]\s*$/u, '').trim()
  const slashIndex = withoutTag.indexOf(' / ')

  if (slashIndex >= 0) {
    return withoutTag.slice(0, slashIndex).trim()
  }

  return withoutTag
}

export function resolveJobId(jobName: string): string {
  const normalized = normalizeJobName(jobName)
  return JOB_NAME_TO_ID[normalized] ?? normalized
}
