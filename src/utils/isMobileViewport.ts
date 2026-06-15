import { useEffect, useState } from 'react'

export const MOBILE_MAX_WIDTH = 768

export function isMobileViewportWidth(width: number = window.innerWidth): boolean {
  return width <= MOBILE_MAX_WIDTH
}

export function useMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(() => isMobileViewportWidth())

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)

    function handleChange() {
      setIsMobile(mediaQuery.matches)
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isMobile
}
