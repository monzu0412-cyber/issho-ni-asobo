/**
 * Help slides in `src/assets/help/` (`help_01.webp`, `help_02.webp`, …).
 * Drop new files such as `help_05.webp` into the folder; they are included automatically.
 *
 * Set `HELP_IMAGES_PLACEHOLDER` to `false` once real images are ready.
 */
export const HELP_IMAGES_PLACEHOLDER = true

const helpImageModules = import.meta.glob<string>('../assets/help/help_*.webp', {
  eager: true,
  import: 'default',
})

export const HELP_IMAGES = Object.entries(helpImageModules)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
  .map(([, url]) => url)
