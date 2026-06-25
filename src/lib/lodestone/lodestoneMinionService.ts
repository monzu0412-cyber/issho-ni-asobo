import { createLodestoneCollectionOwnershipService } from './lodestoneCollectionService.js'

const minionService = createLodestoneCollectionOwnershipService({
  listPath: 'minion',
  category1: 'ミニオン',
  privatePageMessage: 'ミニオンページが非公開に設定されています。',
  parseFailedMessage: 'ミニオン一覧のHTMLを解析できませんでした。',
  listPageConfig: {
    category1: 'ミニオン',
    listPath: 'minion',
    totalClassNames: ['minion__sort__total'],
    tooltipLabelClass: 'minion__header__label',
  },
})

export const getLodestoneMinionOwnership = minionService.getOwnership
export const clearLodestoneMinionServiceStateForTests = minionService.clearStateForTests
export const lodestoneMinionServiceConfig = minionService.config
