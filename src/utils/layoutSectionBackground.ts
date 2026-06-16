import type { CardSectionName, LayoutMode } from '../types/card'

export type LayoutPanelSlot =
  | 'character'
  | 'wantRank1'
  | 'wantRank2'
  | 'wantRank3'

export function resolveLayoutSectionBackground(
  layoutMode: LayoutMode,
  slot: LayoutPanelSlot,
): CardSectionName {
  if (layoutMode === 'character' || layoutMode === 'asobo') {
    switch (slot) {
      case 'character':
      case 'wantRank1':
        return 'row2_left'
      case 'wantRank2':
        return 'row2_center'
      case 'wantRank3':
        return 'row2_right'
    }
  }

  switch (slot) {
    case 'character':
      return 'row2_left'
    case 'wantRank2':
      return 'row2_center'
    case 'wantRank3':
      return 'row2_right'
    default:
      return 'row2_left'
  }
}
