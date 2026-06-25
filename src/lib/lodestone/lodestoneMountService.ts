import { createLodestoneCollectionOwnershipService } from './lodestoneCollectionService.js'

const mountService = createLodestoneCollectionOwnershipService({
  listPath: 'mount',
  category1: 'マウント',
  privatePageMessage: 'マウントページが非公開に設定されています。',
  parseFailedMessage: 'マウント一覧のHTMLを解析できませんでした。',
  listPageConfig: {
    category1: 'マウント',
    listPath: 'mount',
    totalClassNames: ['mount__sort__total', 'minion__sort__total'],
    tooltipLabelClass: 'mount__header__label',
  },
})

export const getLodestoneMountOwnership = mountService.getOwnership
export const clearLodestoneMountServiceStateForTests = mountService.clearStateForTests
export const lodestoneMountServiceConfig = mountService.config
