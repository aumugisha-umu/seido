'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    _uxa?: Array<[string, ...unknown[]]>
  }
}

/**
 * Hook pour tracker les changements de page dans une SPA
 * Compatible avec Contentsquare/Microsoft Clarity/Hotjar
 *
 * Dans une Single Page Application, les changements de route ne declenchent
 * pas de rechargement de page. Ce hook notifie manuellement Contentsquare
 * de chaque navigation pour que les heatmaps et recordings soient corrects.
 *
 * @see https://help.hotjar.com/hc/en-us/articles/36820006944657-Hotjar-on-Single-Page-Apps
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useAnalyticsTracking()
 *   return <div>...</div>
 * }
 * ```
 */
export function useAnalyticsTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Notifier Contentsquare du changement de page
    if (typeof window !== 'undefined' && window._uxa) {
      const search = searchParams?.toString()
      const url = pathname + (search ? `?${search}` : '')

      // trackPageview indique a Contentsquare qu'une nouvelle "page" est affichee
      window._uxa.push(['trackPageview', url])
    }
  }, [pathname, searchParams])
}
