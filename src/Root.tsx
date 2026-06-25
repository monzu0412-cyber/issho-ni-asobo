import { useEffect, useState } from 'react'
import App from './App'
import { JOB_DISPLAY_LAB_PAGE_HASH, JobDisplayLab } from './components/jobs/JobDisplayLab'
import { COLLECTIONS_LAB_PAGE_HASH, CollectionsLab } from './components/lodestone/CollectionsLab'
import { LODESTONE_LAB_PAGE_HASH, LodestoneLab } from './components/lodestone/LodestoneLab'
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

  if (hash === LODESTONE_LAB_PAGE_HASH) {
    return <LodestoneLab />
  }

  if (hash === COLLECTIONS_LAB_PAGE_HASH) {
    return <CollectionsLab />
  }

  if (hash === JOB_DISPLAY_LAB_PAGE_HASH) {
    return <JobDisplayLab />
  }

  return <App />
}

export default Root
