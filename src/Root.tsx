import { useEffect, useState } from 'react'
import App from './App'
import { PRIVACY_PAGE_HASH, PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { TERMS_PAGE_HASH, TermsOfServicePage } from './pages/TermsOfServicePage'

function Root() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const syncHash = () => {
      setHash(window.location.hash)
    }

    window.addEventListener('hashchange', syncHash)

    return () => {
      window.removeEventListener('hashchange', syncHash)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [hash])

  if (hash === TERMS_PAGE_HASH) {
    return <TermsOfServicePage />
  }

  if (hash === PRIVACY_PAGE_HASH) {
    return <PrivacyPolicyPage />
  }

  return <App />
}

export default Root
