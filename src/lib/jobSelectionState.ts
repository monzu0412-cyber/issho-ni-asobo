import type { JobUserSelection } from '../types/lodestone'

export type JobVisualState = 'gray' | 'faded' | 'normal' | 'gold'

export function cycleJobSelection(input: {
  current: JobUserSelection
  lodestoneLinked: boolean
  lodestoneCapped: boolean
}): JobUserSelection {
  void input.lodestoneLinked
  void input.lodestoneCapped

  if (input.current === 'baseline') {
    return 'playable'
  }

  if (input.current === 'playable') {
    return 'main'
  }

  return 'baseline'
}

export function getJobVisualState(input: {
  selection: JobUserSelection
  lodestoneLinked: boolean
  lodestoneCapped: boolean
}): JobVisualState {
  if (input.selection === 'playable') {
    return 'normal'
  }

  if (input.selection === 'main') {
    return 'gold'
  }

  if (input.lodestoneLinked && input.lodestoneCapped) {
    return 'faded'
  }

  return 'gray'
}

export function getJobVisualStateLabel(state: JobVisualState): string {
  switch (state) {
    case 'gray':
      return '未カンスト'
    case 'faded':
      return 'カンスト（ロードストーン）'
    case 'normal':
      return '出せるジョブ'
    case 'gold':
      return 'メインジョブ'
  }
}
