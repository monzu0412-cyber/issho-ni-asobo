import { createLodestoneCollectionOwnershipService } from './lodestoneCollectionService.js'
import { buildFaceAccessoryOwnershipResult } from './parseFaceAccessoryOwnership.js'
import { FACE_ACCESSORY_DICTIONARY_CATEGORY } from './faceAccessoryDictionary.js'

const faceAccessoryService = createLodestoneCollectionOwnershipService({
  listPath: 'faceaccessory',
  category1: FACE_ACCESSORY_DICTIONARY_CATEGORY,
  privatePageMessage: 'フェイスアクセサリーページが非公開に設定されています。',
  parseFailedMessage: 'フェイスアクセサリー一覧のHTMLを解析できませんでした。',
  listNotFoundError: {
    error: 'collection_not_found',
    message: 'フェイスアクセサリーページが見つかりません。',
  },
  listPageConfig: {
    category1: FACE_ACCESSORY_DICTIONARY_CATEGORY,
    listPath: 'faceaccessory',
    totalClassNames: ['faceaccessory__sort__total'],
    tooltipLabelClass: 'faceaccessory__header__label',
  },
  buildOwnership: buildFaceAccessoryOwnershipResult,
})

export const getLodestoneFaceAccessoryOwnership = faceAccessoryService.getOwnership
export const clearLodestoneFaceAccessoryServiceStateForTests = faceAccessoryService.clearStateForTests
export const lodestoneFaceAccessoryServiceConfig = faceAccessoryService.config
