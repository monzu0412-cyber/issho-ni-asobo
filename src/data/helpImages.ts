/**
 * Help slides in `src/assets/help/` (`help_01_input.png`, `help_02_forward.webp`, …).
 *
 * Display order is defined by platform playlists below — not by filename sort.
 * Set `HELP_IMAGES_PLACEHOLDER` to `false` once real images are ready.
 */
export const HELP_IMAGES_PLACEHOLDER = false

export type HelpSlideContent = {
  title: string
  description: string
}

export type HelpSlideImage = {
  imageUrl: string
  caption?: string
}

export type HelpSlide = HelpSlideContent & {
  number: string
  images: HelpSlideImage[]
}

export const HELP_DESKTOP_SLIDE_IDS = ['01', '02', '08', '03', '04'] as const
export const HELP_MOBILE_SLIDE_IDS = ['05', '02', '08', '06', '07'] as const

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
    '',
    'ロードストーンから',
    'キャラクター情報を取得できます。',
    '',
    'ただし、ロードストーン上で',
    '情報を公開していない場合は',
    '使えません。',
  ].join('\n'),
}

/** Slide copy keyed by zero-padded number (`01`, `02`, …). Edit here to update modal text. */
export const HELP_SLIDE_CONTENT: Record<string, HelpSlideContent> = {
  '01': HELP_INPUT_INTRO_SLIDE,
  '02': {
    title: '欲しいものを登録しよう！',
    description: [
      '欲しいものは',
      '名前で検索できます。',
      '部分一致でも出ます。',
      '',
      '名前がわからないときは',
      '「条件から探す」で',
      '種類や入手カテゴリから',
      '選べます。',
      '',
      'ロードストーン取得済みの場合、',
      'ミニオン・マウントなど',
      '一部カテゴリでは',
      '「未所持のみ表示」が使えます。',
      '',
      '辞書にないものは',
      '「未対応アイテム」を選び、',
      '',
      'アピールコメントや',
      '一言コメントに',
      'アイテム名を書いてね！',
    ].join('\n'),
  },
  '08': {
    title: 'キャラクター画像を設定しよう！',
    description: [
      '画像をタップすると',
      '',
      '① 拡大・縮小',
      '② 位置調整',
      '③ 回転',
      '',
      'ができます。',
      '',
      '画像は保存されないので',
      '安心して使ってね！',
    ].join('\n'),
  },
  '03': {
    title: '確認しよう！',
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

const HELP_SLIDE_IMAGE_KEYS: Record<string, string[]> = {
  '01': ['01_input', '01_lodestone'],
  '02': ['02_name', '02_forward'],
  '08': ['08'],
  '03': ['03'],
  '04': ['04'],
  '06': ['06'],
  '07': ['07'],
}

/** Mobile-only slide images (single image per slide). PC uses `HELP_SLIDE_IMAGE_KEYS`. */
const HELP_MOBILE_SLIDE_IMAGE_KEYS: Record<string, string[]> = {
  '05': ['09'],
  '02': ['10'],
}

const HELP_SLIDE_IMAGE_CAPTIONS: Record<string, string[]> = {
  '01': ['通常入力', 'ロードストーン取得'],
  '02': ['名前検索', '条件から探す'],
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

function findImageUrlByKey(key: string): string {
  for (const extension of HELP_IMAGE_EXTENSIONS) {
    const suffix = `help_${key}.${extension}`
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

function buildSlideImages(number: string, isMobile: boolean): HelpSlideImage[] {
  const imageKeys = isMobile && HELP_MOBILE_SLIDE_IMAGE_KEYS[number]
    ? HELP_MOBILE_SLIDE_IMAGE_KEYS[number]
    : (HELP_SLIDE_IMAGE_KEYS[number] ?? [number])
  const usesMobileSingleImage = isMobile && Boolean(HELP_MOBILE_SLIDE_IMAGE_KEYS[number])
  const captions = usesMobileSingleImage ? [] : (HELP_SLIDE_IMAGE_CAPTIONS[number] ?? [])

  return imageKeys.map((key, index) => ({
    imageUrl: findImageUrlByKey(key),
    caption: captions[index],
  }))
}

function buildSlide(number: string, isMobile: boolean): HelpSlide {
  const content = getSlideContent(number)

  return {
    number,
    images: buildSlideImages(number, isMobile),
    title: content.title,
    description: content.description,
  }
}

export function getHelpSlides(isMobile: boolean): HelpSlide[] {
  const slideIds = isMobile ? HELP_MOBILE_SLIDE_IDS : HELP_DESKTOP_SLIDE_IDS
  return slideIds.map((number) => buildSlide(number, isMobile))
}

/** @deprecated Use `getHelpSlides(isMobile)` instead. */
export const HELP_SLIDES = getHelpSlides(false)

/** @deprecated Use `getHelpSlides(isMobile)` instead. */
export const HELP_IMAGES = HELP_SLIDES.flatMap((slide) => slide.images.map((image) => image.imageUrl)).filter(Boolean)
