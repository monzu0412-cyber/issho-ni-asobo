import { resolveCollectionEntryIconUrl } from '../../lib/wanted/collectionEntryIcon'

type CollectionItemIconProps = {
  itemId: number | null
  sourceDictionaryId?: string
}

export function CollectionItemIcon({ itemId, sourceDictionaryId }: CollectionItemIconProps) {
  const iconUrl = resolveCollectionEntryIconUrl({ itemId, sourceDictionaryId })

  if (!iconUrl) {
    return <span className="collectionsLabItemIcon collectionsLabItemIcon--empty" aria-hidden="true" />
  }

  return <img className="collectionsLabItemIcon" src={iconUrl} alt="" />
}
