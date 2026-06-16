import type { ChangeEvent, RefObject } from 'react'
import type { ImageSettings } from '../../types/card'
import {
  getImageCrossOrigin,
  IMAGE_ROTATION_MAX,
  IMAGE_ROTATION_MIN,
  IMAGE_SCALE_MAX,
  IMAGE_SCALE_MIN,
} from '../../utils/cardDisplayUtils'

type ProfileImageColumnProps = {
  imageUrl: string
  imageSettings: ImageSettings
  isMobileViewport: boolean
  isDesktopImageAdjustUi: boolean
  isImageAdjustOpen: boolean
  effectivePreviewMode: boolean
  restoredFromDraft: boolean
  showImageAdjustPanel: boolean
  showImageAdjustReopen: boolean
  imageMoveRange: number
  showMobileHorizontalImageHint: boolean
  profileImageInputRef: RefObject<HTMLInputElement | null>
  onProfileImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  openImageAdjustPanel: () => void
  updateImageSetting: (field: keyof ImageSettings, value: number) => void
  resetImageRotation: () => void
  setIsImageAdjustOpen: (open: boolean) => void
}

export function ProfileImageColumn({
  imageUrl,
  imageSettings,
  isMobileViewport,
  isDesktopImageAdjustUi,
  isImageAdjustOpen,
  effectivePreviewMode,
  restoredFromDraft,
  showImageAdjustPanel,
  showImageAdjustReopen,
  imageMoveRange,
  showMobileHorizontalImageHint,
  profileImageInputRef,
  onProfileImageFileChange,
  openImageAdjustPanel,
  updateImageSetting,
  resetImageRotation,
  setIsImageAdjustOpen,
}: ProfileImageColumnProps) {
  const rotationSliderValue = Math.min(
    IMAGE_ROTATION_MAX,
    Math.max(IMAGE_ROTATION_MIN, imageSettings.rotation),
  )

  return (
    <div
      className={`profileImageColumn${
        isDesktopImageAdjustUi && isImageAdjustOpen ? ' profileImageColumn--adjustOpen' : ''
      }${isMobileViewport ? ' profileImageColumn--mobileStack' : ''}`}
    >
      <input
        ref={profileImageInputRef}
        className="profileImageFileInput"
        id="profile-image-file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onProfileImageFileChange}
      />

      {imageUrl ? (
        isMobileViewport ? (
          <label className="profileImage profileImage--hasPhoto" htmlFor="profile-image-file">
            <div
              className="profilePhotoViewport"
              style={{
                transform: `translate(${imageSettings.x}px, ${imageSettings.y}px)`,
              }}
            >
              <div
                className="profilePhotoScaleWrap"
                style={{
                  transform: `scale(${imageSettings.scale}) rotate(${imageSettings.rotation}deg)`,
                }}
              >
                <img
                  className="profilePhoto"
                  src={imageUrl}
                  alt="キャラクター画像"
                  crossOrigin={getImageCrossOrigin(imageUrl)}
                />
              </div>
            </div>
          </label>
        ) : (
          <div className="profileImage profileImage--hasPhoto">
            <div
              className="profilePhotoViewport"
              style={{
                transform: `translate(${imageSettings.x}px, ${imageSettings.y}px)`,
              }}
            >
              <div
                className="profilePhotoScaleWrap"
                style={{
                  transform: `scale(${imageSettings.scale}) rotate(${imageSettings.rotation}deg)`,
                }}
              >
                <img
                  className="profilePhoto"
                  src={imageUrl}
                  alt="キャラクター画像"
                  crossOrigin={getImageCrossOrigin(imageUrl)}
                />
              </div>
            </div>
          </div>
        )
      ) : (
        <label className="profileImage" htmlFor="profile-image-file">
          <span>画像</span>
        </label>
      )}

      {!effectivePreviewMode && restoredFromDraft && !imageUrl && (
        <p className="profileImageNotice" role="status">
          画像は保存されません。再アップロードしてください。
        </p>
      )}

      {showMobileHorizontalImageHint && (
        <p className="profileImageMobileHorizontalHint" role="note">
          ※完成画像は横表示になります。この枠の向き・切り取りでPNGに反映されます。
        </p>
      )}

      {showImageAdjustReopen && (
        <button
          className="imageAdjustReopen"
          type="button"
          onClick={openImageAdjustPanel}
        >
          再編集
        </button>
      )}

      {showImageAdjustPanel && (
        <div className="imageAdjustForm">
          <label>
            拡大率
            <input
              type="range"
              min={IMAGE_SCALE_MIN}
              max={IMAGE_SCALE_MAX}
              step="0.01"
              value={imageSettings.scale}
              onChange={(event) => updateImageSetting('scale', Number(event.target.value))}
            />
          </label>

          <label>
            横位置
            <input
              type="range"
              min={-imageMoveRange}
              max={imageMoveRange}
              step="1"
              value={imageSettings.x}
              onChange={(event) => updateImageSetting('x', Number(event.target.value))}
            />
          </label>

          <label>
            縦位置
            <input
              type="range"
              min={-imageMoveRange}
              max={imageMoveRange}
              step="1"
              value={imageSettings.y}
              onChange={(event) => updateImageSetting('y', Number(event.target.value))}
            />
          </label>

          <label>
            回転（{rotationSliderValue}°）
            <input
              type="range"
              min={IMAGE_ROTATION_MIN}
              max={IMAGE_ROTATION_MAX}
              step="1"
              value={rotationSliderValue}
              onChange={(event) => updateImageSetting('rotation', Number(event.target.value))}
            />
          </label>

          <button
            className="imageRotationReset"
            type="button"
            onClick={resetImageRotation}
          >
            回転リセット
          </button>

          {isDesktopImageAdjustUi && (
            <button
              className="imageAdjustChangeImage"
              type="button"
              onClick={() => profileImageInputRef.current?.click()}
            >
              画像を変更
            </button>
          )}

          {isDesktopImageAdjustUi && (
            <button
              className="imageAdjustDone"
              type="button"
              onClick={() => setIsImageAdjustOpen(false)}
            >
              編集完了
            </button>
          )}
        </div>
      )}
    </div>
  )
}
