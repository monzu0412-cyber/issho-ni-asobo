import privacyMarkdown from '../content/privacyPolicy.md?raw'
import { LegalDocumentPage } from './LegalDocumentPage'

export const PRIVACY_PAGE_HASH = '#/privacy'

export function PrivacyPolicyPage() {
  return <LegalDocumentPage markdown={privacyMarkdown} />
}
