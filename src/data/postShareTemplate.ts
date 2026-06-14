export const CARD_POST_SHARE_TEMPLATE = `いっしょに あ・そ・ぼ！カードを作りました！

#FF14
#いっしょにあそぼ！`

export const X_POST_INTENT_BASE_URL = 'https://twitter.com/intent/tweet'

export function getCardPostShareText(): string {
  return CARD_POST_SHARE_TEMPLATE
}

export function getXPostIntentUrl(text: string = getCardPostShareText()): string {
  return `${X_POST_INTENT_BASE_URL}?text=${encodeURIComponent(text)}`
}
