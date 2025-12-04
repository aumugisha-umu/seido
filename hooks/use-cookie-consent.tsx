'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { logger } from '@/lib/logger'

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_KEY = 'seido-cookie-consent'
const CONSENT_VERSION = 1  // Incrémenter si la politique de cookies change
const EXPIRY_DAYS = 365    // Durée de validité du consentement (1 an)

// ============================================================================
// TYPES
// ============================================================================

/**
 * Préférences de cookies granulaires
 */
export interface CookiePreferences {
  /** Microsoft Clarity, Google Analytics */
  analytics: boolean
  /** LinkedIn, Facebook pixels (futur) */
  advertising: boolean
  /** Chat, géolocalisation (futur) */
  functional: boolean
}

/**
 * État complet du consentement
 */
export interface CookieConsentState {
  status: 'pending' | 'accepted' | 'declined' | 'custom'
  preferences: CookiePreferences
  timestamp: number
  version: number
  expiresAt: number
}

/**
 * Données stockées en localStorage
 */
interface StoredConsent {
  version: number
  status: 'accepted' | 'declined' | 'custom'
  preferences: CookiePreferences
  timestamp: number
  expiresAt: number
}

/**
 * Interface du contexte de consentement
 */
interface CookieConsentContextType {
  /** État actuel du consentement */
  consentState: CookieConsentState
  /** Le consentement a-t-il été donné (accepté, refusé ou personnalisé) */
  isConsentGiven: boolean
  /** La bannière doit-elle être affichée */
  showBanner: boolean
  /** Accepter tous les cookies */
  acceptAll: () => void
  /** Refuser tous les cookies non-essentiels */
  declineAll: () => void
  /** Enregistrer des préférences personnalisées */
  savePreferences: (preferences: CookiePreferences) => void
  /** Réinitialiser le consentement (pour page légale) */
  resetConsent: () => void
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_PREFERENCES: CookiePreferences = {
  analytics: false,
  advertising: false,
  functional: true, // Les cookies fonctionnels sont généralement acceptés par défaut
}

const DEFAULT_STATE: CookieConsentState = {
  status: 'pending',
  preferences: DEFAULT_PREFERENCES,
  timestamp: 0,
  version: CONSENT_VERSION,
  expiresAt: 0,
}

// ============================================================================
// CONTEXT
// ============================================================================

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined)

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Vérifie si le consentement stocké est valide
 */
function isConsentValid(stored: StoredConsent | null): boolean {
  if (!stored) return false

  // Vérifier la version
  if (stored.version !== CONSENT_VERSION) {
    logger.info('[CookieConsent] Consent version mismatch, requiring new consent')
    return false
  }

  // Vérifier l'expiration
  if (Date.now() > stored.expiresAt) {
    logger.info('[CookieConsent] Consent expired, requiring new consent')
    return false
  }

  return true
}

/**
 * Charge le consentement depuis localStorage
 */
function loadStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored) as StoredConsent
    return parsed
  } catch (error) {
    logger.error('[CookieConsent] Error loading stored consent:', error)
    return null
  }
}

/**
 * Sauvegarde le consentement en localStorage
 */
function saveConsent(consent: StoredConsent): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
    logger.info('[CookieConsent] Consent saved:', consent.status)
  } catch (error) {
    logger.error('[CookieConsent] Error saving consent:', error)
  }
}

/**
 * Supprime le consentement du localStorage
 */
function clearStoredConsent(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
    logger.info('[CookieConsent] Consent cleared')
  } catch (error) {
    logger.error('[CookieConsent] Error clearing consent:', error)
  }
}

/**
 * Calcule la date d'expiration
 */
function getExpiryDate(): number {
  return Date.now() + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)
}

// ============================================================================
// PROVIDER
// ============================================================================

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consentState, setConsentState] = useState<CookieConsentState>(DEFAULT_STATE)
  const [isHydrated, setIsHydrated] = useState(false)

  // Charger le consentement au mount (côté client uniquement)
  useEffect(() => {
    const stored = loadStoredConsent()

    if (stored && isConsentValid(stored)) {
      setConsentState({
        status: stored.status,
        preferences: stored.preferences,
        timestamp: stored.timestamp,
        version: stored.version,
        expiresAt: stored.expiresAt,
      })
      logger.info('[CookieConsent] Loaded existing consent:', stored.status)
    } else {
      // Pas de consentement valide, rester en pending
      logger.info('[CookieConsent] No valid consent found, showing banner')
    }

    setIsHydrated(true)
  }, [])

  // Accepter tous les cookies
  const acceptAll = useCallback(() => {
    const now = Date.now()
    const expiresAt = getExpiryDate()

    const newState: CookieConsentState = {
      status: 'accepted',
      preferences: {
        analytics: true,
        advertising: true,
        functional: true,
      },
      timestamp: now,
      version: CONSENT_VERSION,
      expiresAt,
    }

    setConsentState(newState)
    saveConsent({
      version: CONSENT_VERSION,
      status: 'accepted',
      preferences: newState.preferences,
      timestamp: now,
      expiresAt,
    })

    logger.info('[CookieConsent] All cookies accepted')
  }, [])

  // Refuser tous les cookies non-essentiels
  const declineAll = useCallback(() => {
    const now = Date.now()
    const expiresAt = getExpiryDate()

    const newState: CookieConsentState = {
      status: 'declined',
      preferences: {
        analytics: false,
        advertising: false,
        functional: true, // Les fonctionnels restent actifs
      },
      timestamp: now,
      version: CONSENT_VERSION,
      expiresAt,
    }

    setConsentState(newState)
    saveConsent({
      version: CONSENT_VERSION,
      status: 'declined',
      preferences: newState.preferences,
      timestamp: now,
      expiresAt,
    })

    logger.info('[CookieConsent] Non-essential cookies declined')
  }, [])

  // Enregistrer des préférences personnalisées
  const savePreferences = useCallback((preferences: CookiePreferences) => {
    const now = Date.now()
    const expiresAt = getExpiryDate()

    const newState: CookieConsentState = {
      status: 'custom',
      preferences: {
        ...preferences,
        functional: true, // Toujours forcer functional à true
      },
      timestamp: now,
      version: CONSENT_VERSION,
      expiresAt,
    }

    setConsentState(newState)
    saveConsent({
      version: CONSENT_VERSION,
      status: 'custom',
      preferences: newState.preferences,
      timestamp: now,
      expiresAt,
    })

    logger.info('[CookieConsent] Custom preferences saved:', preferences)
  }, [])

  // Réinitialiser le consentement
  const resetConsent = useCallback(() => {
    clearStoredConsent()
    setConsentState(DEFAULT_STATE)
    logger.info('[CookieConsent] Consent reset, showing banner')
  }, [])

  // Calculer les valeurs dérivées
  const isConsentGiven = consentState.status !== 'pending'
  const showBanner = isHydrated && consentState.status === 'pending'

  const value = useMemo(() => ({
    consentState,
    isConsentGiven,
    showBanner,
    acceptAll,
    declineAll,
    savePreferences,
    resetConsent,
  }), [consentState, isConsentGiven, showBanner, acceptAll, declineAll, savePreferences, resetConsent])

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook pour accéder au contexte de consentement cookies
 *
 * @example
 * ```tsx
 * const { showBanner, acceptAll, declineAll } = useCookieConsent()
 *
 * if (showBanner) {
 *   return <CookieBanner onAccept={acceptAll} onDecline={declineAll} />
 * }
 * ```
 */
export function useCookieConsent(): CookieConsentContextType {
  const context = useContext(CookieConsentContext)

  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider')
  }

  return context
}

// ============================================================================
// UTILITY HOOK - Pour vérifier si un type de cookie est autorisé
// ============================================================================

/**
 * Hook utilitaire pour vérifier rapidement si un type de cookie est autorisé
 *
 * @example
 * ```tsx
 * const canUseAnalytics = useCookiePreference('analytics')
 *
 * useEffect(() => {
 *   if (canUseAnalytics) {
 *     initializeAnalytics()
 *   }
 * }, [canUseAnalytics])
 * ```
 */
export function useCookiePreference(type: keyof CookiePreferences): boolean {
  const { consentState, isConsentGiven } = useCookieConsent()

  // Si le consentement n'est pas donné, on refuse tout sauf functional
  if (!isConsentGiven) {
    return type === 'functional'
  }

  return consentState.preferences[type]
}
