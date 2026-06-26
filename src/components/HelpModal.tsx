import { useCallback, useEffect, useMemo, useState } from 'react'
import { getHelpSlides, HELP_IMAGES_PLACEHOLDER, type HelpSlide, type HelpSlideImage } from '../data/helpImages'
import { useMobileViewport } from '../utils/isMobileViewport'
import './HelpModal.css'

type HelpModalProps = {
  isOpen: boolean
  onClose: () => void
}

type HelpModalBodyProps = {
  slides: HelpSlide[]
  onClose: () => void
}

function renderSlideImage(image: HelpSlideImage, slideTitle: string) {
  if (image.imageUrl && !HELP_IMAGES_PLACEHOLDER) {
    return (
      <img
        className="helpModalImage"
        src={image.imageUrl}
        alt={image.caption ?? slideTitle}
      />
    )
  }

  return (
    <div className="helpModalPlaceholder">
      <span>準備中</span>
    </div>
  )
}

function HelpModalBody({ slides, onClose }: HelpModalBodyProps) {
  const total = slides.length
  const [currentIndex, setCurrentIndex] = useState(0)

  const goPrev = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1))
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(total - 1, index + 1))
  }, [total])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
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
  }, [goNext, goPrev, handleClose])

  if (total === 0) {
    return null
  }

  const currentSlide = slides[currentIndex]
  const usesMultiImageLayout = currentSlide.images.length > 1

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
          <div
            className={`helpModalImageArea${usesMultiImageLayout ? ' helpModalImageArea--multi' : ''}`}
          >
            {currentSlide.images.map((image, index) => (
              <figure
                key={`${currentSlide.number}-${image.caption ?? index}`}
                className="helpModalImageFrame"
              >
                {renderSlideImage(image, currentSlide.title)}
                {image.caption ? (
                  <figcaption className="helpModalImageCaption">{image.caption}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>

          <div className="helpModalSlideText">
            <h3 className="helpModalSlideTitle">{currentSlide.title}</h3>
            <p className="helpModalSlideDescription">{currentSlide.description}</p>
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

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const isMobileViewport = useMobileViewport()
  const slides = useMemo(() => getHelpSlides(isMobileViewport), [isMobileViewport])
  const platformKey = isMobileViewport ? 'mobile' : 'desktop'

  if (!isOpen) {
    return null
  }

  return <HelpModalBody key={platformKey} slides={slides} onClose={onClose} />
}
