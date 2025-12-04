'use client'

import { useEffect, useRef } from 'react'
import Clarity from '@microsoft/clarity'
import { useAuth } from '@/hooks/use-auth'
import { useCookieConsent } from '@/hooks/use-cookie-consent'
import { logger } from '@/lib/logger'

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

/**
 * ClarityProvider - Microsoft Clarity Analytics Integration
 *
 * Fonctionnalités:
 * - Initialisation de Clarity avec le Project ID
 * - Respect du consentement RGPD (analytics cookies)
 * - Identification automatique des utilisateurs connectés
 * - Tags par rôle utilisateur (admin, gestionnaire, etc.)
 *
 * IMPORTANT: Ce provider doit être un enfant de CookieConsentProvider
 * pour accéder au contexte de consentement.
 *
 * @see https://clarity.microsoft.com
 */
export function ClarityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { consentState, isConsentGiven } = useCookieConsent()
  const clarityInitialized = useRef(false)
  const previousUserId = useRef<string | null>(null)
  const consentSent = useRef(false)

  // Initialisation de Clarity uniquement si le consentement analytics est donné
  useEffect(() => {
    if (!CLARITY_PROJECT_ID) {
      logger.warn('[Clarity] NEXT_PUBLIC_CLARITY_PROJECT_ID is not set - analytics disabled')
      return
    }

    // Attendre que le consentement soit donné
    if (!isConsentGiven) {
      logger.debug('[Clarity] Waiting for cookie consent...')
      return
    }

    // Initialiser Clarity une seule fois
    if (!clarityInitialized.current) {
      try {
        Clarity.init(CLARITY_PROJECT_ID)
        clarityInitialized.current = true
        logger.info('[Clarity] Initialized successfully')
      } catch (error) {
        logger.error('[Clarity] Failed to initialize:', error)
        return
      }
    }

    // Envoyer le signal de consentement à Clarity
    if (!consentSent.current) {
      try {
        if (consentState.preferences.analytics) {
          Clarity.consentV2({
            ad_Storage: consentState.preferences.advertising ? 'granted' : 'denied',
            analytics_Storage: 'granted'
          })
          logger.info('[Clarity] Consent granted for analytics')
        } else {
          Clarity.consentV2({
            ad_Storage: 'denied',
            analytics_Storage: 'denied'
          })
          logger.info('[Clarity] Consent denied for analytics')
        }
        consentSent.current = true
      } catch (error) {
        logger.error('[Clarity] Failed to set consent:', error)
      }
    }
  }, [isConsentGiven, consentState.preferences.analytics, consentState.preferences.advertising])

  // Réagir aux changements de préférences (si l'utilisateur modifie son consentement)
  useEffect(() => {
    if (!clarityInitialized.current || !isConsentGiven) return

    // Si les préférences changent après l'init, mettre à jour le consentement
    try {
      Clarity.consentV2({
        ad_Storage: consentState.preferences.advertising ? 'granted' : 'denied',
        analytics_Storage: consentState.preferences.analytics ? 'granted' : 'denied'
      })
      logger.info('[Clarity] Consent updated:', {
        analytics: consentState.preferences.analytics,
        advertising: consentState.preferences.advertising
      })
    } catch (error) {
      logger.error('[Clarity] Failed to update consent:', error)
    }
  }, [consentState.preferences.analytics, consentState.preferences.advertising, isConsentGiven])

  // Identification des utilisateurs connectés (seulement si analytics accepté)
  useEffect(() => {
    if (!clarityInitialized.current || !CLARITY_PROJECT_ID) return
    if (!consentState.preferences.analytics) return

    if (user && user.id !== previousUserId.current) {
      try {
        // Identifier l'utilisateur avec son ID (hashé côté Clarity)
        // Format: identify(customId, customSessionId?, customPageId?, friendlyName?)
        Clarity.identify(user.id, undefined, undefined, user.name || undefined)

        // Tag par rôle pour filtrer les sessions dans le dashboard Clarity
        Clarity.setTag('user_role', user.role)

        previousUserId.current = user.id
        logger.info('[Clarity] User identified:', { role: user.role })
      } catch (error) {
        logger.error('[Clarity] Failed to identify user:', error)
      }
    } else if (!user && previousUserId.current) {
      // User déconnecté - reset du tracking
      previousUserId.current = null
      logger.info('[Clarity] User signed out - reset tracking')
    }
  }, [user, consentState.preferences.analytics])

  return <>{children}</>
}

/**
 * Hook utilitaire pour envoyer des événements custom à Clarity
 *
 * Note: Les événements ne sont envoyés que si le consentement analytics est donné.
 *
 * @example
 * ```tsx
 * const { trackEvent, setTag } = useClarityTracking()
 *
 * trackEvent('intervention_created')
 * setTag('plan_type', 'premium')
 * ```
 */
export function useClarityTracking() {
  const { consentState, isConsentGiven } = useCookieConsent()

  const trackEvent = (eventName: string) => {
    if (!isConsentGiven || !consentState.preferences.analytics) {
      logger.debug('[Clarity] Event not tracked (no consent):', eventName)
      return
    }

    try {
      Clarity.event(eventName)
      logger.debug('[Clarity] Event tracked:', eventName)
    } catch (error) {
      logger.error('[Clarity] Failed to track event:', error)
    }
  }

  const setTag = (key: string, value: string | string[]) => {
    if (!isConsentGiven || !consentState.preferences.analytics) {
      logger.debug('[Clarity] Tag not set (no consent):', { key, value })
      return
    }

    try {
      Clarity.setTag(key, value)
      logger.debug('[Clarity] Tag set:', { key, value })
    } catch (error) {
      logger.error('[Clarity] Failed to set tag:', error)
    }
  }

  const upgradeSession = (reason: string) => {
    if (!isConsentGiven || !consentState.preferences.analytics) {
      logger.debug('[Clarity] Session not upgraded (no consent):', reason)
      return
    }

    try {
      Clarity.upgrade(reason)
      logger.debug('[Clarity] Session upgraded:', reason)
    } catch (error) {
      logger.error('[Clarity] Failed to upgrade session:', error)
    }
  }

  return { trackEvent, setTag, upgradeSession }
}
