/**
 * Help slides in `src/assets/help/` (`help_01.webp`, `help_05.jpg`, …).
 *
 * Display order is defined by platform playlists below — not by filename sort.
 * Set `HELP_IMAGES_PLACEHOLDER` to `false` once real images are ready.
 */
export const HELP_IMAGES_PLACEHOLDER = false

export type HelpSlideContent = {
  title: string
  description: string
}

export type HelpSlide = HelpSlideContent & {
  number: string
  imageUrl: string
}

export const HELP_DESKTOP_SLIDE_IDS = ['01', '02', '03', '04'] as const
export const HELP_MOBILE_SLIDE_IDS = ['05', '02', '06', '07'] as const

const HELP_INPUT_INTRO_SLIDE: HelpSlideContent = {
  title: 'まずは入力してみよう！',
  description: [
    '黄色の項目は編集できます。',
    '',
    '▼ が付いている項目は',
    '選択できます。',
    '',
    '✎ が付いている項目は',
    '入力できます。',
    '',
    'キャラクター情報や',
    '今やりたいこと、',
    '欲しいものなどを入力してみましょう。',
    '',
    '入力した内容は',
    'カードにすぐ反映されます。',
  ].join('\n'),
}

/** Slide copy keyed by zero-padded number (`01`, `02`, …). Edit here to update modal text. */
export const HELP_SLIDE_CONTENT: Record<string, HelpSlideContent> = {
  '01': HELP_INPUT_INTRO_SLIDE,
  '02': {
    title: '欲しいものを登録しよう！',
    description: [
      '欲しいものは検索で！',
      '部分一致でもでます。',
      '',
      '名前がわからないときは',
      '「条件から探す」を押すと',
      '',
      '① 分類',
      '② コンテンツ',
      '③ 詳細',
      '',
      'の順に選択できます。',
      '',
      '辞書にないものは',
      '「未対応アイテム」を選び、',
      '',
      'アピールコメントや',
      '一言コメントに',
      'アイテム名を書いてね！',
    ].join('\n'),
  },
  '03': {
    title: 'PCで確認しよう！',
    description: [
      '入力が終わったら',
      '「プレビューモード」を押して',
      '完成カードを確認しましょう。',
      '',
      '内容を直したいときは',
      '「編集モード」に戻って',
      '変更できます。',
      '',
      '完成したら',
      '「PNG保存」を押してください。',
    ].join('\n'),
  },
  '04': {
    title: '保存して投稿しよう！',
    description: [
      '「Xで投稿」を押すと',
      '投稿画面が開きます。',
      '',
      '保存した画像を添付して',
      '投稿してください。',
      '',
      '#FF14',
      '#いっしょにあそぼ！',
    ].join('\n'),
  },
  '05': HELP_INPUT_INTRO_SLIDE,
  '06': {
    title: 'スマホで確認しよう！',
    description: [
      '入力が終わったら',
      '「確認」を押して',
      '完成イメージを表示しましょう。',
      '',
      '内容を直したいときは',
      '閉じるを押して',
      '編集画面に戻れます。',
      '',
      '完成したら',
      '「画像を保存」を押してください。',
    ].join('\n'),
  },
  '07': {
    title: '保存して投稿しよう！',
    description: [
      '「画像を保存」で保存したら',
      '「Xで投稿」を押すと',
      '投稿画面が開きます。',
      '',
      '保存した画像を添付して',
      '投稿してください。',
      '',
      '#FF14',
      '#いっしょにあそぼ！',
    ].join('\n'),
  },
}

const PLACEHOLDER_SLIDE_CONTENT: HelpSlideContent = {
  title: '仮タイトル',
  description: '仮の説明文です。',
}

const HELP_IMAGE_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg'] as const

const helpImageModules = import.meta.glob<string>(
  '../assets/help/help_*.{webp,png,jpg,jpeg}',
  {
    eager: true,
    import: 'default',
  },
)

function findImageUrl(number: string): string {
  for (const extension of HELP_IMAGE_EXTENSIONS) {
    const suffix = `help_${number}.${extension}`
    const entry = Object.entries(helpImageModules).find(([path]) => path.endsWith(suffix))

    if (entry?.[1]) {
      return entry[1]
    }
  }

  return ''
}

function getSlideContent(number: string): HelpSlideContent {
  return HELP_SLIDE_CONTENT[number] ?? PLACEHOLDER_SLIDE_CONTENT
}

function buildSlide(number: string): HelpSlide {
  const content = getSlideContent(number)

  return {
    number,
    imageUrl: findImageUrl(number),
    title: content.title,
    description: content.description,
  }
}

export function getHelpSlides(isMobile: boolean): HelpSlide[] {
  const slideIds = isMobile ? HELP_MOBILE_SLIDE_IDS : HELP_DESKTOP_SLIDE_IDS
  return slideIds.map((number) => buildSlide(number))
}

/** @deprecated Use `getHelpSlides(isMobile)` instead. */
export const HELP_SLIDES = getHelpSlides(false)

/** @deprecated Use `getHelpSlides(isMobile)` instead. */
export const HELP_IMAGES = HELP_SLIDES.map((slide) => slide.imageUrl).filter(Boolean)
