import termsMarkdown from '../content/termsOfService.md?raw'
import { LegalDocumentPage } from './LegalDocumentPage'

export const TERMS_PAGE_HASH = '#/terms'

export function TermsOfServicePage() {
  return <LegalDocumentPage markdown={termsMarkdown} />
}
