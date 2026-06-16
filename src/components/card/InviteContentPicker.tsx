import { getActivityPurposeItems } from '../../data/invite/activityPurposeDictionary'
import {
  getInviteMajorCategory,
  getInviteMiddleItems,
  inviteMajorGroups,
} from '../../data/invite/inviteContentDictionary'
import type { InviteMajorId } from '../../data/invite/inviteDictionaryTypes'
import type { ContentSelection } from '../../types/card'

function getInviteMiddleOptions(majorId: InviteMajorId) {
  return getInviteMiddleItems(majorId)
}

function getInvitePurposeOptions(selection: Pick<ContentSelection, 'majorId' | 'middleId'>) {
  return getActivityPurposeItems(selection.majorId, selection.middleId)
}

export function InviteContentPicker({
  selection,
  onSelectionChange,
  onAdd,
}: {
  selection: ContentSelection
  onSelectionChange: (field: keyof ContentSelection, value: string) => void
  onAdd: () => void
}) {
  return (
    <div className="contentPicker editForm">
      <label>
        大項目
        <select
          value={selection.majorId}
          onChange={(event) => onSelectionChange('majorId', event.target.value)}
        >
          {inviteMajorGroups.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.majorIds.map((majorId) => {
                const category = getInviteMajorCategory(majorId)

                return (
                  <option key={category.id} value={category.id}>{category.label}</option>
                )
              })}
            </optgroup>
          ))}
        </select>
      </label>

      <label>
        中項目
        <select
          value={selection.middleId}
          onChange={(event) => onSelectionChange('middleId', event.target.value)}
        >
          {getInviteMiddleOptions(selection.majorId).map((group) => (
            <option key={group.id} value={group.id}>{group.label}</option>
          ))}
        </select>
      </label>

      <label>
        小項目
        <select
          value={selection.purposeId}
          onChange={(event) => onSelectionChange('purposeId', event.target.value)}
        >
          {getInvitePurposeOptions(selection).map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>

      <button type="button" onClick={onAdd}>
        追加
      </button>
    </div>
  )
}
