import type { CSSProperties } from 'react'

type CardBottomRowProps = {
  message: string
  effectivePreviewMode: boolean
  sectionBackgroundStyle: CSSProperties
  updateCharacterMessage: (message: string) => void
}

export function CardBottomRow({
  message,
  effectivePreviewMode,
  sectionBackgroundStyle,
  updateCharacterMessage,
}: CardBottomRowProps) {
  return (
    <section className="bottomRow">
      <section
        className="messageBox"
        style={sectionBackgroundStyle}
      >
        <div className="sectionTitle">ひとこと</div>
        {effectivePreviewMode ? (
          message ? <p>{message}</p> : null
        ) : (
          <div className="editForm messageEditForm">
            <label>
              一言コメント
              <textarea
                rows={4}
                value={message}
                onChange={(event) => updateCharacterMessage(event.target.value)}
              />
            </label>
          </div>
        )}
      </section>
      <footer className="cardCopyright" aria-label="コピーライト">
        <p className="cardCopyrightLine">FINAL FANTASY XIV © SQUARE ENIX</p>
        <p className="cardCopyrightLine">本ツールは非公式のファンメイド作品です</p>
      </footer>
    </section>
  )
}
