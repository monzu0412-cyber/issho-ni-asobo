import { useCallback, useEffect, useState } from 'react'
import { HELP_IMAGES, HELP_IMAGES_PLACEHOLDER } from '../data/helpImages'
import './HelpModal.css'

type HelpModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const total = HELP_IMAGES.length

  const goPrev = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1))
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(total - 1, index + 1))
  }, [total])

  const handleClose = useCallback(() => {
    setCurrentIndex(0)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose()
      }

      if (event.key === 'ArrowLeft') {
        goPrev()
      }

      if (event.key === 'ArrowRight') {
        goNext()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [goNext, goPrev, handleClose, isOpen])

  if (!isOpen || total === 0) {
    return null
  }

  const currentImage = HELP_IMAGES[currentIndex]

  return (
    <div className="helpModalBackdrop" onClick={handleClose} role="presentation">
      <div
        className="helpModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="helpModalTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="helpModalHeader">
          <h2 id="helpModalTitle">つかいかた</h2>
          <button
            className="helpModalClose"
            type="button"
            aria-label="閉じる"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div className="helpModalBody">
          <div className="helpModalImageFrame">
            {HELP_IMAGES_PLACEHOLDER ? (
              <div className="helpModalPlaceholder">
                <span>準備中</span>
              </div>
            ) : (
              <img
                className="helpModalImage"
                src={currentImage}
                alt={`使い方 ${currentIndex + 1}`}
              />
            )}
          </div>

          <nav className="helpModalNav" aria-label="使い方ナビゲーション">
            <button
              className="helpModalNavButton"
              type="button"
              disabled={currentIndex === 0}
              onClick={goPrev}
            >
              ＜ 前へ
            </button>
            <span className="helpModalNavCounter">
              {currentIndex + 1} / {total}
            </span>
            <button
              className="helpModalNavButton"
              type="button"
              disabled={currentIndex === total - 1}
              onClick={goNext}
            >
              次へ ＞
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
