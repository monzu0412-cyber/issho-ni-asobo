/**
 * Help slides in `src/assets/help/` (`help_01.webp`, `help_02.webp`, …).
 * Drop new files such as `help_05.webp` into the folder; they are included automatically.
 *
 * Titles and descriptions are keyed by slide number in `HELP_SLIDE_CONTENT`.
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

/** Slide copy keyed by zero-padded number (`01`, `02`, …). Edit here to update modal text. */
export const HELP_SLIDE_CONTENT: Record<string, HelpSlideContent> = {
  '01': {
    title: 'まずは入力してみよう！',
    description: [
      '黄色になっている項目は',
      '自由に変更できます。',
      '',
      'キャラクター情報や',
      '今やりたいこと、',
      '欲しいものなどを入力してみましょう。',
      '',
      '入力した内容は',
      'カードに反映されます。',
    ].join('\n'),
  },
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
    ].join('\n'),
  },
  '03': {
    title: 'プレビューを確認しよう！',
    description: [
      '入力が終わったら',
      '「プレビュー」に切り替えて',
      '完成カードを確認しましょう。',
      '',
      '内容を直したいときは',
      '「編集」に戻って変更できます。',
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
}

const PLACEHOLDER_SLIDE_CONTENT: HelpSlideContent = {
  title: '仮タイトル',
  description: '仮の説明文です。',
}

const helpImageModules = import.meta.glob<string>('../assets/help/help_*.webp', {
  eager: true,
  import: 'default',
})

function extractHelpNumber(path: string): string | null {
  const match = path.match(/help_(\d+)\.webp$/)
  return match?.[1] ?? null
}

function findImageUrl(number: string): string {
  const suffix = `help_${number}.webp`
  const entry = Object.entries(helpImageModules).find(([path]) => path.endsWith(suffix))
  return entry?.[1] ?? ''
}

function getSlideContent(number: string): HelpSlideContent {
  return HELP_SLIDE_CONTENT[number] ?? PLACEHOLDER_SLIDE_CONTENT
}

function getRegisteredSlideNumbers(): string[] {
  const fromImages = Object.keys(helpImageModules)
    .map(extractHelpNumber)
    .filter((number): number is string => !!number)
  const fromContent = Object.keys(HELP_SLIDE_CONTENT)

  return [...new Set([...fromImages, ...fromContent])].sort(
    (left, right) => Number(left) - Number(right),
  )
}

export const HELP_SLIDES: HelpSlide[] = getRegisteredSlideNumbers().map((number) => {
  const content = getSlideContent(number)

  return {
    number,
    imageUrl: findImageUrl(number),
    title: content.title,
    description: content.description,
  }
})

/** @deprecated Use `HELP_SLIDES` instead. */
export const HELP_IMAGES = HELP_SLIDES.map((slide) => slide.imageUrl).filter(Boolean)
