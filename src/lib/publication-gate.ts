export const PUBLICATION_GATE_EQUIPMENT_CATEGORY = '装備' as const

export const PILOT_10_SERIES_KEYS = [
  'エデンモーン',
  'アスフォデロース',
  'リンボ',
  'ミダース',
  'プロトミダース',
  'ブレイズ',
  'シャドウレス',
  'キティセオス',
  'ゾーモー',
  'マヌシャ',
] as const

export const WAVE_A_TIER1_SERIES_KEYS = [
  'パーラカ',
  'パーガトリィ',
  'アビュッソス',
] as const

export const WAVE_A_TIER2_SERIES_KEYS = [
  'ヴァンガード',
  'ユウェヤーワータ',
  'トロイアン',
  'マナリス',
] as const

export const WAVE_A_TIER3A_SERIES_KEYS = [
  'エアルーム',
  'アンダーキープ',
] as const

export const EXCHANGE_MOONWARD_SERIES_KEYS = [
  'ムーンワード',
] as const

export const EXCHANGE_RADIANT_SERIES_KEYS = [
  'レディアント',
] as const

export const EXCHANGE_LUNAR_ENVOY_SERIES_KEYS = [
  'ルナエンヴォイ',
] as const

export const EXCHANGE_CREDENDUM_SERIES_KEYS = [
  'クレデンダム',
] as const

export const EXCHANGE_CRYPTLURKER_SERIES_KEYS = [
  'クリプトラーカー',
] as const

export const EXCHANGE_RYUMYAKU_SERIES_KEYS = [
  '龍脈',
] as const

export const EXCHANGE_IDYLLSHIRE_SERIES_KEYS = [
  'イディル',
] as const

export const EXCHANGE_ALA_MHIGAN_SERIES_KEYS = [
  'アラミガン',
] as const

export const EXCHANGE_LOST_ALLAGAN_SERIES_KEYS = [
  'ロストアラガン',
] as const

export const EXCHANGE_HW_SERIES_KEYS = [
  ...EXCHANGE_IDYLLSHIRE_SERIES_KEYS,
] as const

export const EXCHANGE_EW_SERIES_KEYS = [
  ...EXCHANGE_MOONWARD_SERIES_KEYS,
  ...EXCHANGE_RADIANT_SERIES_KEYS,
  ...EXCHANGE_LUNAR_ENVOY_SERIES_KEYS,
  ...EXCHANGE_CREDENDUM_SERIES_KEYS,
] as const

export const EXCHANGE_SB_SERIES_KEYS = [
  ...EXCHANGE_ALA_MHIGAN_SERIES_KEYS,
  ...EXCHANGE_LOST_ALLAGAN_SERIES_KEYS,
  ...EXCHANGE_CRYPTLURKER_SERIES_KEYS,
  ...EXCHANGE_RYUMYAKU_SERIES_KEYS,
] as const

export const EXCHANGE_SERIES_KEYS = [
  ...EXCHANGE_HW_SERIES_KEYS,
  ...EXCHANGE_EW_SERIES_KEYS,
  ...EXCHANGE_SB_SERIES_KEYS,
] as const

export const FORWARD_INDEX_SERIES_KEYS = [
  ...PILOT_10_SERIES_KEYS,
  ...WAVE_A_TIER1_SERIES_KEYS,
  ...WAVE_A_TIER2_SERIES_KEYS,
  ...WAVE_A_TIER3A_SERIES_KEYS,
  ...EXCHANGE_SERIES_KEYS,
] as const

export const CARD_UI_PUBLIC_STATUSES = ['confirmed'] as const

export type PublicationGateSource = {
  category1: string
  status: string
}

export function getGearSeriesPrefix(nameJa: string): string {
  return nameJa.split('・')[0]?.trim() ?? nameJa
}

export function isPilot10SeriesKey(seriesKey: string): boolean {
  return (PILOT_10_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isWaveATier1SeriesKey(seriesKey: string): boolean {
  return (WAVE_A_TIER1_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isWaveATier2SeriesKey(seriesKey: string): boolean {
  return (WAVE_A_TIER2_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isWaveATier3aSeriesKey(seriesKey: string): boolean {
  return (WAVE_A_TIER3A_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeMoonwardSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_MOONWARD_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeRadiantSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_RADIANT_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeLunarEnvoySeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_LUNAR_ENVOY_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeCredendumSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_CREDENDUM_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeCryptlurkerSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_CRYPTLURKER_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeRyumyakuSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_RYUMYAKU_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeIdyllshireSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_IDYLLSHIRE_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeAlaMhiganSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_ALA_MHIGAN_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeLostAllaganSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_LOST_ALLAGAN_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeHwSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_HW_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeSbSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_SB_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isExchangeEwSeriesKey(seriesKey: string): boolean {
  return (EXCHANGE_EW_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isForwardIndexSeriesKey(seriesKey: string): boolean {
  return (FORWARD_INDEX_SERIES_KEYS as readonly string[]).includes(seriesKey)
}

export function isPilot10GearName(nameJa: string): boolean {
  return isPilot10SeriesKey(getGearSeriesPrefix(nameJa))
}

export function isCardUiPublic(category1: string, status: string | null | undefined): boolean {
  if (category1 !== PUBLICATION_GATE_EQUIPMENT_CATEGORY) {
    return true
  }

  return status === 'confirmed'
}

export function isCardUiPublicSource(source: PublicationGateSource | null | undefined): boolean {
  if (!source) {
    return false
  }

  return isCardUiPublic(source.category1, source.status)
}

export function isCardUiPublicSearchItem(
  category1: string | null | undefined,
  source: PublicationGateSource | null | undefined,
): boolean {
  const resolvedCategory1 = category1 ?? source?.category1 ?? ''

  if (!source) {
    return false
  }

  return isCardUiPublic(resolvedCategory1, source.status)
}
