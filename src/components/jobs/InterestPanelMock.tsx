import type { ActivityCategory, InterestItem } from '../../types/card'
import { getInterestIconUrl } from '../../utils/cardDisplayUtils'
import { Stars } from '../card/Stars'

const LAB_INTEREST_NAMES: ActivityCategory[] = [
  '戦闘',
  '収集',
  '釣り',
  '地図',
  'クラフター',
  'ギャザラー',
  'SS',
  'ハウジング',
  'ミラプリ',
  '演奏',
  'PvP',
  '交流',
  'RP',
  '金策',
  'モブハント',
]

const LAB_INTEREST_LEVELS = [5, 4, 3, 2, 4, 3, 2, 1, 5, 2, 1, 4, 3, 2, 4]

const labInterests: InterestItem[] = LAB_INTEREST_NAMES.map((name, index) => ({
  name,
  level: LAB_INTEREST_LEVELS[index] ?? 1,
}))

type InterestPanelMockProps = {
  readOnly?: boolean
}

export function InterestPanelMock({ readOnly = true }: InterestPanelMockProps) {
  return (
    <>
      <div className="sectionTitle">好きなこと！興味あるもの！</div>
      <div className="interestGrid">
        {labInterests.map((interest) => (
          <div className="interestItem" key={interest.name}>
            <div className="interestName">
              <span
                aria-hidden="true"
                className="interestIconImage"
                style={{ backgroundImage: `url("${getInterestIconUrl(interest)}")` }}
              />
              <strong>{interest.name}</strong>
            </div>
            <Stars level={interest.level} isEditable={!readOnly} onChange={() => undefined} />
          </div>
        ))}
      </div>
    </>
  )
}
