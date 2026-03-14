'use client'

import { Suspense, useEffect, useRef } from 'react'
import Clarity from '@microsoft/clarity'
import { useAnalyticsIdentify } from '@/hooks/use-analytics-identify'
import { useCookieConsent } from '@/hooks/use-cookie-consent'

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

/**
 * Composant interne qui execute les hooks de tracking
 * Separe pour respecter les regles des hooks React
 * (ne peut pas appeler de hooks conditionnellement)
 */
function AnalyticsTracker() {
  useAnalyticsIdentify()
  return null
}

/**
 * Provider pour les analytics Microsoft Clarity
 *
 * Fonctionnalites:
 * 1. Initialise Clarity avec consentement GDPR (ConsentV2)
 * 2. Identifie les utilisateurs par role et subscription (segmentation)
 * 3. Respecte le consentement cookies RGPD (obligatoire EEA/Belgique)
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
  const { consentState } = useCookieConsent()
  const clarityInitialized = useRef(false)

  // Initialize Clarity when analytics consent is granted
  useEffect(() => {
    if (!CLARITY_PROJECT_ID || clarityInitialized.current) return
    if (!consentState.preferences.analytics) return

    Clarity.init(CLARITY_PROJECT_ID)
    clarityInitialized.current = true

    // GDPR ConsentV2 — required for EEA/UK/Switzerland since Oct 2025
    Clarity.consentV2({
      ad_Storage: 'denied',
      analytics_Storage: 'granted',
    })
  }, [consentState.preferences.analytics])

  return (
    <>
      {/* Ne tracker que si l'utilisateur a consenti aux analytics */}
      {consentState.preferences.analytics && CLARITY_PROJECT_ID && (
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
      )}
      {children}
    </>
  )
}
