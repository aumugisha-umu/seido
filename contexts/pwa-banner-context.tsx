'use client'

/**
 * 📱 PWA BANNER CONTEXT
 * 
 * Ce Context gère l'état du banner d'installation PWA qui apparaît
 * en haut de l'écran (au-dessus du header) à chaque refresh complet de l'app.
 * 
 * Fonctionnalités:
 * - Affiche le banner si l'app n'est pas installée
 * - Masque le banner pendant la navigation SPA quand l'utilisateur le ferme
 * - Réapparaît à chaque refresh complet de la page (F5, reload)
 * - Fournit `isBannerVisible` pour que le header ajuste son positionnement
 * 
 * Usage:
 * ```tsx
 * // Dans un layout
 * <PWABannerProvider>
 *   <PWAInstallBanner />
 *   <DashboardHeader />
 *   {children}
 * </PWABannerProvider>
 * 
 * // Dans le header
 * const { isBannerVisible } = usePWABanner()
 * <header className={isBannerVisible ? 'top-[44px]' : 'top-0'}>
 * ```
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode
} from 'react'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'

// ============================================================================
// Constants
// ============================================================================

/** Hauteur du banner en pixels */
export const PWA_BANNER_HEIGHT = 44

// ============================================================================
// Types
// ============================================================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWABannerContextType {
  /** Indique si le banner est actuellement visible */
  isBannerVisible: boolean
  /** Indique si la PWA peut être installée (prompt disponible) */
  canInstall: boolean
  /** Référence au prompt d'installation pour déclencher l'installation */
  installPrompt: BeforeInstallPromptEvent | null
  /** Masquer le banner pour cette session */
  dismissBanner: () => void
  /** Déclencher l'installation de la PWA */
  triggerInstall: () => Promise<boolean>
}

// ============================================================================
// Context
// ============================================================================

const PWABannerContext = createContext<PWABannerContextType | null>(null)

// ============================================================================
// Provider
// ============================================================================

interface PWABannerProviderProps {
  children: ReactNode
}

export function PWABannerProvider({ children }: PWABannerProviderProps) {
  const { user } = useAuth()
  const [isBannerVisible, setIsBannerVisible] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  
  // Ref pour tracker si l'utilisateur a fermé le banner pendant cette "visite"
  // Se réinitialise à chaque refresh complet de la page
  const wasDismissedRef = useRef(false)

  // ──────────────────────────────────────────────────────────────────────────
  // Initialisation et détection du prompt d'installation
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Vérifier si déjà installé (mode standalone)
    const checkIfInstalled = () => {
      if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
        logger.info('📱 [PWA-BANNER] App already installed (standalone mode)')
        setIsInstalled(true)
        return true
      }
      return false
    }

    if (checkIfInstalled()) return

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      logger.info('📱 [PWA-BANNER] beforeinstallprompt event captured')
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    // Écouter si l'app est installée
    const handleAppInstalled = () => {
      logger.info('📱 [PWA-BANNER] App installed successfully')
      setIsInstalled(true)
      setIsBannerVisible(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Afficher le banner quand l'utilisateur est connecté et peut installer
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setIsBannerVisible(false)
      return
    }

    if (isInstalled) {
      setIsBannerVisible(false)
      return
    }

    // Ne pas réafficher si l'utilisateur l'a fermé pendant cette visite
    if (wasDismissedRef.current) {
      setIsBannerVisible(false)
      return
    }

    // Afficher le banner si on peut installer
    if (canInstall) {
      logger.info('📱 [PWA-BANNER] Showing banner - user authenticated and can install')
      setIsBannerVisible(true)
    }
  }, [user, canInstall, isInstalled])

  // ──────────────────────────────────────────────────────────────────────────
  // Masquer le banner pour cette visite (réapparaît après refresh complet)
  // ──────────────────────────────────────────────────────────────────────────
  const dismissBanner = useCallback(() => {
    logger.info('📱 [PWA-BANNER] User dismissed banner (will reappear after page refresh)')
    wasDismissedRef.current = true
    setIsBannerVisible(false)
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Déclencher l'installation
  // ──────────────────────────────────────────────────────────────────────────
  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      logger.warn('📱 [PWA-BANNER] No install prompt available')
      return false
    }

    try {
      logger.info('📱 [PWA-BANNER] Triggering install prompt')
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      logger.info(`📱 [PWA-BANNER] User choice: ${outcome}`)

      if (outcome === 'accepted') {
        setIsBannerVisible(false)
        setInstallPrompt(null)
        return true
      }
      return false
    } catch (error) {
      logger.error('📱 [PWA-BANNER] Install error:', error)
      return false
    }
  }, [installPrompt])

  // ⚡ Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo<PWABannerContextType>(
    () => ({
      isBannerVisible,
      canInstall,
      installPrompt,
      dismissBanner,
      triggerInstall
    }),
    [isBannerVisible, canInstall, installPrompt, dismissBanner, triggerInstall]
  )

  return (
    <PWABannerContext.Provider value={contextValue}>
      {children}
    </PWABannerContext.Provider>
  )
}

// ============================================================================
// Hook Consumer
// ============================================================================

/**
 * Hook pour accéder au contexte PWA Banner.
 * Doit être utilisé à l'intérieur d'un PWABannerProvider.
 */
export function usePWABanner(): PWABannerContextType {
  const context = useContext(PWABannerContext)

  if (!context) {
    throw new Error(
      'usePWABanner must be used within a PWABannerProvider. ' +
      'Make sure to wrap your component tree with <PWABannerProvider>.'
    )
  }

  return context
}

/**
 * Hook optionnel qui ne throw pas si le Provider n'est pas présent.
 * Retourne des valeurs par défaut si le contexte n'est pas disponible.
 */
export function usePWABannerOptional(): PWABannerContextType {
  const context = useContext(PWABannerContext)

  // Valeurs par défaut si pas de contexte
  return context ?? {
    isBannerVisible: false,
    canInstall: false,
    installPrompt: null,
    dismissBanner: () => {},
    triggerInstall: async () => false
  }
}

