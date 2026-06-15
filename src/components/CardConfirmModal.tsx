import { useCallback, useEffect } from 'react'
import './CardConfirmModal.css'

export type CardConfirmModalPhase = 'generating' | 'ready' | 'error'

type CardConfirmModalProps = {
  phase: CardConfirmModalPhase
  previewUrl: string | null
  errorMessage: string | null
  isSaving: boolean
  saveErrorMessage: string | null
  onClose: () => void
  onRetry: () => void
  onSave: () => void
  onPostX: () => void
}

export function CardConfirmModal({
  phase,
  previewUrl,
  errorMessage,
  isSaving,
  saveErrorMessage,
  onClose,
  onRetry,
  onSave,
  onPostX,
}: CardConfirmModalProps) {
  const isGenerating = phase === 'generating'

  const handleClose = useCallback(() => {
    if (isGenerating) {
      return
    }

    onClose()
  }, [isGenerating, onClose])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleClose])

  return (
    <div
      className="cardConfirmModalBackdrop"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="cardConfirmModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardConfirmModalTitle"
        aria-busy={isGenerating}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cardConfirmModalHeader">
          <h2 id="cardConfirmModalTitle">完成イメージ</h2>
          <button
            className="cardConfirmModalClose"
            type="button"
            aria-label="閉じる"
            onClick={handleClose}
            disabled={isGenerating}
          >
            ×
          </button>
        </div>

        <div className="cardConfirmModalBody">
          {phase === 'generating' && (
            <div className="cardConfirmModalGenerating">
              <div className="cardConfirmModalSpinner" aria-hidden="true" />
              <p>完成イメージを生成中…</p>
            </div>
          )}

          {phase === 'ready' && previewUrl && (
            <div className="cardConfirmModalPreview">
              <img src={previewUrl} alt="完成イメージ" />
            </div>
          )}

          {phase === 'error' && (
            <div className="cardConfirmModalError">
              <p>{errorMessage ?? '生成に失敗しました。もう一度お試しください。'}</p>
              <button type="button" onClick={onRetry}>
                再試行
              </button>
            </div>
          )}

          {saveErrorMessage && phase === 'ready' && (
            <p className="cardConfirmModalSaveError" role="alert">{saveErrorMessage}</p>
          )}
        </div>

        <div className="cardConfirmModalActions">
          {phase === 'ready' && (
            <div className="cardConfirmModalPrimaryActions">
              <button
                className="cardExportButton"
                type="button"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? '保存中…' : '画像を保存'}
              </button>
              <button
                className="cardXPostButton"
                type="button"
                onClick={onPostX}
              >
                Xで投稿
              </button>
            </div>
          )}

          {!isGenerating && (
            <button
              className="cardConfirmModalDismiss"
              type="button"
              onClick={handleClose}
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
