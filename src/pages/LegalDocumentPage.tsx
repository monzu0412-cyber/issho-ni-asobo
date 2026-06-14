import { renderSimpleMarkdown } from '../utils/renderSimpleMarkdown'
import './TermsOfServicePage.css'

type LegalDocumentPageProps = {
  markdown: string
}

export function LegalDocumentPage({ markdown }: LegalDocumentPageProps) {
  return (
    <div className="termsPage">
      <div className="termsPageInner">
        <a className="termsPageBackLink" href="#">
          ← カード作成に戻る
        </a>

        <article className="termsPageContent">
          {renderSimpleMarkdown(markdown)}
        </article>

        <footer className="termsPageFooter">
          <a href="#">カード作成に戻る</a>
        </footer>
      </div>
    </div>
  )
}
