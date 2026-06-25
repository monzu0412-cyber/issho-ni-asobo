import type { TargetItem } from '../../types/card'
import { getWantTitleSizeClass } from '../../utils/cardDisplayUtils'
import { TargetDetails } from '../target/TargetDetails'

type AppliedWantPreviewProps = {
  target: TargetItem
  resolutionLabel: string
  note?: string
}

export function AppliedWantPreview({ target, resolutionLabel, note }: AppliedWantPreviewProps) {
  return (
    <section className="collectionsLabAppliedWant">
      <h3>ほしいもの反映プレビュー（カード表示と同じ形式）</h3>
      <p className="collectionsLabAppliedWantMeta">{resolutionLabel}</p>
      <p className="collectionsLabAppliedWantMeta">
        <a href="#">カード編集画面</a>でも同じ内容がほしいもの１位に表示されます。
      </p>
      {note && <p className="collectionsLabCategoryMessage collectionsLabCategoryMessage--info">{note}</p>}

      <div className="collectionsLabAppliedWantCard">
        <div className="mainWantLabel">👑 ほしいもの１位！</div>
        <div className={`mainWantTitle ${getWantTitleSizeClass(target.title)}`}>
          {target.iconUrl ? (
            <img className="mainWantIcon" src={target.iconUrl} alt="" />
          ) : target.icon ? (
            <span className="mainWantIconFallback" aria-hidden="true">{target.icon}</span>
          ) : null}
          {target.title ? <h2>{target.title}</h2> : null}
        </div>
        <div className="categoryBadge">{target.category} / {target.subcategory}</div>
        {target.title ? <TargetDetails target={target} isCompact showEquipmentMetadata={false} showCurrencyEarn={false} /> : null}
      </div>
    </section>
  )
}
