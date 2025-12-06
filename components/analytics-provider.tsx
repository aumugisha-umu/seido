'use client'

import { Suspense } from 'react'
import { useAnalyticsTracking } from '@/hooks/use-analytics-tracking'
import { useAnalyticsIdentify } from '@/hooks/use-analytics-identify'
import { useCookieConsent } from '@/hooks/use-cookie-consent'

/**
 * Composant interne qui execute les hooks de tracking
 * Separe pour respecter les regles des hooks React
 * (ne peut pas appeler de hooks conditionnellement)
 */
function AnalyticsTracker() {
  useAnalyticsTracking()
  useAnalyticsIdentify()
  return null
}

/**
 * Provider pour les analytics Contentsquare/Clarity/Hotjar
 *
 * Fonctionnalites:
 * 1. Track les changements de page SPA (heatmaps corrects)
 * 2. Identifie les utilisateurs par role (segmentation)
 * 3. Respecte le consentement cookies RGPD
 *
 * Le tracking n'est actif que si l'utilisateur a accepte les cookies analytics.
 *
 * @example
 * ```tsx
 * // Dans app/layout.tsx
 * <CookieConsentProvider>
 *   <AnalyticsProvider>
 *     {children}
 *   </AnalyticsProvider>
 * </CookieConsentProvider>
 * ```
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useCookieConsent()

  return (
    <>
      {/* Ne tracker que si l'utilisateur a consenti aux analytics */}
      {consent?.analytics && (
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
      )}
      {children}
    </>
  )
}
