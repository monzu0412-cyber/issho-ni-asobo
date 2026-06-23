export type JobRoleId = 'tank' | 'healer' | 'dps' | 'gatherer' | 'crafter'

export type DisplayJobDefinition = {
  jobId: string
  label: string
  roleId: JobRoleId
  /** Same-origin path for card UI and PNG export. */
  iconUrl: string
}

/** Lodestone CDN source used by `scripts/sync-job-icons.mjs`. */
export const JOB_ICON_CDN_SOURCES: Record<string, string> = {
  PLD: 'https://lds-img.finalfantasyxiv.com/h/E/d0Tx-vhnsMYfYpGe9MvslemEfg.png',
  WAR: 'https://lds-img.finalfantasyxiv.com/h/y/A3UhbjZvDeN3tf_6nJ85VP0RY0.png',
  DRK: 'https://lds-img.finalfantasyxiv.com/h/l/5CZEvDOMYMyVn2td9LZigsgw9s.png',
  GNB: 'https://lds-img.finalfantasyxiv.com/h/8/hg8ofSSOKzqng290No55trV4mI.png',
  WHM: 'https://xivapi.com/cj/companion/whitemage.png',
  SCH: 'https://lds-img.finalfantasyxiv.com/h/7/WdFey0jyHn9Nnt1Qnm-J3yTg5s.png',
  AST: 'https://lds-img.finalfantasyxiv.com/h/1/erCgjnMSiab4LiHpWxVc-tXAqk.png',
  SGE: 'https://lds-img.finalfantasyxiv.com/h/g/_oYApASVVReLLmsokuCJGkEpk0.png',
  MNK: 'https://xivapi.com/cj/companion/monk.png',
  DRG: 'https://xivapi.com/cj/companion/dragoon.png',
  RPR: 'https://lds-img.finalfantasyxiv.com/h/7/cLlXUaeMPJDM2nBhIeM-uDmPzM.png',
  NIN: 'https://xivapi.com/cj/companion/ninja.png',
  SAM: 'https://lds-img.finalfantasyxiv.com/h/m/KndG72XtCFwaq1I1iqwcmO_0zc.png',
  VPR: 'https://lds-img.finalfantasyxiv.com/h/C/WojNTqMJ_Ye1twvkIhw825zc20.png',
  BRD: 'https://xivapi.com/cj/companion/bard.png',
  MCH: 'https://lds-img.finalfantasyxiv.com/h/E/vmtbIlf6Uv8rVp2YFCWA25X0dc.png',
  DNC: 'https://lds-img.finalfantasyxiv.com/h/t/HK0jQ1y7YV9qm30cxGOVev6Cck.png',
  BLM: 'https://xivapi.com/cj/companion/blackmage.png',
  SMN: 'https://xivapi.com/cj/companion/summoner.png',
  RDM: 'https://lds-img.finalfantasyxiv.com/h/q/s3MlLUKmRAHy0pH57PnFStHmIw.png',
  PCT: 'https://lds-img.finalfantasyxiv.com/h/_/kLob-U-yh652LQPX1NHpLlUYQY.png',
  BLU: 'https://lds-img.finalfantasyxiv.com/h/p/jdV3RRKtWzgo226CC09vjen5sk.png',
  MIN: 'https://lds-img.finalfantasyxiv.com/h/A/aM2Dd6Vo4HW_UGasK7tLuZ6fu4.png',
  BTN: 'https://lds-img.finalfantasyxiv.com/h/I/jGRnjIlwWridqM-mIPNew6bhHM.png',
  FSH: 'https://lds-img.finalfantasyxiv.com/h/x/B4Azydbn7Prubxt7OL9p1LZXZ0.png',
  CRP: 'https://lds-img.finalfantasyxiv.com/h/v/YCN6F-xiXf03Ts3pXoBihh2OBk.png',
  BSM: 'https://lds-img.finalfantasyxiv.com/h/5/EEHVV5cIPkOZ6v5ALaoN5XSVRU.png',
  ARM: 'https://lds-img.finalfantasyxiv.com/h/G/Rq5wcK3IPEaAB8N-T9l6tBPxCY.png',
  GSM: 'https://lds-img.finalfantasyxiv.com/h/L/LbEjgw0cwO_2gQSmhta9z03pjM.png',
  LTW: 'https://lds-img.finalfantasyxiv.com/h/b/ACAcQe3hWFxbWRVPqxKj_MzDiY.png',
  WVR: 'https://lds-img.finalfantasyxiv.com/h/X/E69jrsOMGFvFpCX87F5wqgT_Vo.png',
  ALC: 'https://lds-img.finalfantasyxiv.com/h/C/bBVQ9IFeXqjEdpuIxmKvSkqalE.png',
  CUL: 'https://lds-img.finalfantasyxiv.com/h/m/1kMI2v_KEVgo30RFvdFCyySkFo.png',
}

const JOB_ICON_ENTRIES: Array<{ jobId: string; label: string; roleId: JobRoleId }> = [
  { jobId: 'PLD', label: 'ナイト', roleId: 'tank' },
  { jobId: 'WAR', label: '戦士', roleId: 'tank' },
  { jobId: 'DRK', label: '暗黒騎士', roleId: 'tank' },
  { jobId: 'GNB', label: 'ガンブレイカー', roleId: 'tank' },
  { jobId: 'WHM', label: '白魔道士', roleId: 'healer' },
  { jobId: 'SCH', label: '学者', roleId: 'healer' },
  { jobId: 'AST', label: '占星術師', roleId: 'healer' },
  { jobId: 'SGE', label: '賢者', roleId: 'healer' },
  { jobId: 'MNK', label: 'モンク', roleId: 'dps' },
  { jobId: 'DRG', label: '竜騎士', roleId: 'dps' },
  { jobId: 'RPR', label: 'リーパー', roleId: 'dps' },
  { jobId: 'NIN', label: '忍者', roleId: 'dps' },
  { jobId: 'SAM', label: '侍', roleId: 'dps' },
  { jobId: 'VPR', label: 'ヴァイパー', roleId: 'dps' },
  { jobId: 'BRD', label: '吟遊詩人', roleId: 'dps' },
  { jobId: 'MCH', label: '機工士', roleId: 'dps' },
  { jobId: 'DNC', label: '踊り子', roleId: 'dps' },
  { jobId: 'BLM', label: '黒魔道士', roleId: 'dps' },
  { jobId: 'SMN', label: '召喚士', roleId: 'dps' },
  { jobId: 'RDM', label: '赤魔道士', roleId: 'dps' },
  { jobId: 'PCT', label: 'ピクトマンサー', roleId: 'dps' },
  { jobId: 'BLU', label: '青魔道士', roleId: 'dps' },
  { jobId: 'MIN', label: '採掘師', roleId: 'gatherer' },
  { jobId: 'BTN', label: '園芸師', roleId: 'gatherer' },
  { jobId: 'FSH', label: '漁師', roleId: 'gatherer' },
  { jobId: 'CRP', label: '木工師', roleId: 'crafter' },
  { jobId: 'BSM', label: '鍛冶師', roleId: 'crafter' },
  { jobId: 'ARM', label: '甲冑師', roleId: 'crafter' },
  { jobId: 'GSM', label: '彫金師', roleId: 'crafter' },
  { jobId: 'LTW', label: '革細工師', roleId: 'crafter' },
  { jobId: 'WVR', label: '裁縫師', roleId: 'crafter' },
  { jobId: 'ALC', label: '錬金術師', roleId: 'crafter' },
  { jobId: 'CUL', label: '調理師', roleId: 'crafter' },
]

export const JOB_ROLE_ORDER: JobRoleId[] = ['tank', 'healer', 'dps', 'gatherer', 'crafter']

/** Tank / healer / crafter: 4 columns. */
export const JOBS_PER_ROW = 4

/** DPS block: up to 5 icons per row. */
export const DPS_JOBS_PER_ROW = 5

export const DISPLAY_JOB_CATALOG: DisplayJobDefinition[] = JOB_ICON_ENTRIES.map((entry) => ({
  ...entry,
  iconUrl: `/icons/jobs/${entry.jobId}.png`,
}))

export function getJobIconUrl(jobId: string): string | undefined {
  return DISPLAY_JOB_CATALOG.find((job) => job.jobId === jobId)?.iconUrl
}
