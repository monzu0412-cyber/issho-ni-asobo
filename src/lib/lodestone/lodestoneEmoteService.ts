import { createLodestoneInlineCollectionOwnershipService } from './lodestoneCollectionService.js'
import { buildEmoteOwnershipResult, parseEmoteListPage } from './parseEmoteOwnership.js'

const emoteService = createLodestoneInlineCollectionOwnershipService({
  listPath: 'emote',
  category1: 'エモート',
  privatePageMessage: 'エモートページが非公開に設定されています。',
  parseFailedMessage: 'エモート一覧のHTMLを解析できませんでした。',
  parseListPage: parseEmoteListPage,
  buildOwnershipResult: (characterId, totalOnLodestone, items) =>
    buildEmoteOwnershipResult(characterId, totalOnLodestone, items),
})

export const getLodestoneEmoteOwnership = emoteService.getOwnership
export const clearLodestoneEmoteServiceStateForTests = emoteService.clearStateForTests
export const lodestoneEmoteServiceConfig = emoteService.config
