'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './use-auth'
import { pushManager } from '@/lib/push-notification-manager'
import { logger } from '@/lib/logger'
import { checkUserPushSubscription } from '@/app/actions/push-subscription-actions'
import { isDismissedRecently, setDismissed, clearDismissed } from '@/lib/constants/notifications'
import { detectPlatform, type PlatformInfo } from '@/lib/utils/platform-detection'

/**
 * Hook pour gérer l'affichage de la modale de permission notifications
 *
 * Affiche la modale si :
 * - L'utilisateur est authentifié
 * - Pas de subscription en DB
 * - Pas de dismiss récent (24h)
 * - Service Worker prêt (production)
 *
 * Fonctionne sur:
 * - PWA installée → Active notifications directement
 * - Web desktop/Android → Propose installation PWA puis notifications
 * - iOS Safari non-PWA → Guide installation manuelle PWA
 */

export type NotificationPromptState = 'idle' | 'showing' | 'subscribing' | 'installing' | 'success' | 'error'

// Re-export PlatformInfo for consumers
export type { PlatformInfo } from '@/lib/utils/platform-detection'

export interface UseNotificationPromptReturn {
  /** Indique si la modale doit être affichée */
  shouldShowModal: boolean
  /** État actuel du prompt */
  state: NotificationPromptState
  /** Permission actuelle du navigateur */
  permission: NotificationPermission
  /** Informations sur la plateforme */
  platform: PlatformInfo
  /** Indique si les notifications sont supportées */
  isSupported: boolean
  /** Indique si le Service Worker est prêt */
  isServiceWorkerReady: boolean
  /** Indique si une subscription existe en DB */
  hasDBSubscription: boolean
  /** Message d'erreur si state === 'error' */
  error: string | null
  /** Fermer la modale (réapparaît dans 24h) */
  dismissModal: () => void
  /** Tenter d'activer les notifications (pour PWA ou web push direct) */
  enableNotifications: () => Promise<boolean>
  /** Rafraîchir l'état (après retour des paramètres système) */
  refreshPermissionState: () => Promise<void>
}

export function useNotificationPrompt(): UseNotificationPromptReturn {
  const { user, loading: authLoading } = useAuth()

  const [state, setState] = useState<NotificationPromptState>('idle')
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [platform, setPlatform] = useState<PlatformInfo>(() => detectPlatform())
  const [isSupported, setIsSupported] = useState(false)
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false)
  const [hasDBSubscription, setHasDBSubscription] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 🎯 FIX: Prevent modal from showing during initialization
  const [isInitializing, setIsInitializing] = useState(true)

  const previousPermissionRef = useRef<NotificationPermission>('default')
  const hasInitialized = useRef(false)

  // Initialisation : vérifier support, plateforme, permission
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initialize = async () => {
      // Détecter la plateforme
      const detectedPlatform = detectPlatform()
      setPlatform(detectedPlatform)

      // Vérifier support des notifications
      const supported = pushManager.isSupported()
      setIsSupported(supported)

      if (!supported) {
        logger.info('🔔 [NotificationPrompt] Push not supported on this device')
        // 🎯 FIX: Mark initialization complete even when not supported
        setIsInitializing(false)
        return
      }

      // Vérifier si le service worker est enregistré
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        const swReady = registrations.length > 0
        setIsServiceWorkerReady(swReady)

        if (!swReady) {
          logger.warn('🔔 [NotificationPrompt] No service worker registered')
        }
      } catch {
        setIsServiceWorkerReady(false)
      }

      // Vérifier permission actuelle
      const currentPermission = pushManager.getPermissionStatus()
      setPermission(currentPermission)
      previousPermissionRef.current = currentPermission

      // Vérifier si dismiss récent (24h)
      const recentlyDismissed = isDismissedRecently()
      setIsDismissed(recentlyDismissed)

      // Vérifier subscription en DB
      const { hasSubscription } = await checkUserPushSubscription()
      setHasDBSubscription(hasSubscription)

      // 🎯 FIX: Mark initialization complete AFTER all async checks
      setIsInitializing(false)

      // 🎯 Vérifier si la modale n'a pas besoin de s'afficher (flow déjà complet)
      // Conditions qui font que la modale ne s'affichera pas :
      const willNotShowModal =
        hasSubscription ||           // Déjà subscrit
        recentlyDismissed ||         // Dismiss récent
        currentPermission === 'denied' // Permission refusée

      logger.info('🔔 [NotificationPrompt] Initialized', {
        platform: detectedPlatform,
        supported,
        permission: currentPermission,
        hasDBSubscription: hasSubscription,
        recentlyDismissed,
        willShowModal: !willNotShowModal
      })
    }

    initialize()
  }, [])

  // Écouter les changements au focus de la fenêtre
  useEffect(() => {
    if (!isSupported) return

    const handleFocus = async () => {
      const currentPermission = pushManager.getPermissionStatus()

      // Refresh dismiss state on focus
      const recentlyDismissed = isDismissedRecently()
      setIsDismissed(recentlyDismissed)

      if (currentPermission !== previousPermissionRef.current) {
        logger.info('🔔 [NotificationPrompt] Permission changed on focus', {
          from: previousPermissionRef.current,
          to: currentPermission
        })

        setPermission(currentPermission)

        // Si permission accordée après avoir été autre chose, auto-subscribe
        if (currentPermission === 'granted' && user?.id) {
          const { hasSubscription } = await checkUserPushSubscription()
          if (hasSubscription) {
            setHasDBSubscription(true)
            setState('success')
            logger.info('🔔 [NotificationPrompt] Already subscribed in database')
          } else {
            try {
              setState('subscribing')
              await pushManager.subscribe(user.id)
              const { hasSubscription: newSub } = await checkUserPushSubscription()
              setHasDBSubscription(newSub)
              setState(newSub ? 'success' : 'error')
              logger.info('🔔 [NotificationPrompt] Auto-subscribed after permission granted')
            } catch (err) {
              logger.error('🔔 [NotificationPrompt] Auto-subscribe failed', err)
              setState('error')
              setError('Erreur lors de l\'activation des notifications')
            }
          }
        }

        previousPermissionRef.current = currentPermission
      }
    }

    window.addEventListener('focus', handleFocus)
    const interval = setInterval(handleFocus, 10000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [isSupported, user?.id])

  // Déterminer si la modale doit être affichée
  // IMPORTANT: On affiche sur web ET PWA (plus de condition isPWAMode)
  // 🎯 FIX: Don't show modal while initialization is in progress
  const shouldShowModal =
    !isInitializing &&
    isSupported &&
    isServiceWorkerReady &&
    !authLoading &&
    !!user &&
    !hasDBSubscription &&
    !isDismissed &&
    state !== 'subscribing' &&
    state !== 'installing' &&
    state !== 'success'

  // Fermer la modale (réapparaît dans 24h)
  const dismissModal = useCallback(() => {
    logger.info('🔔 [NotificationPrompt] Modal dismissed by user (will reappear in 24h)')
    setDismissed()
    setIsDismissed(true)
    setState('idle')
  }, [])

  // Activer les notifications (pour PWA ou web push direct)
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('Utilisateur non connecté')
      return false
    }

    setError(null)
    setState('subscribing')

    try {
      await pushManager.subscribe(user.id)

      // Vérifier en DB
      const { hasSubscription } = await checkUserPushSubscription()

      const newPermission = pushManager.getPermissionStatus()
      setPermission(newPermission)
      previousPermissionRef.current = newPermission
      setHasDBSubscription(hasSubscription)
      setState(hasSubscription ? 'success' : 'error')

      if (!hasSubscription) {
        setError('La subscription n\'a pas été enregistrée. Veuillez réessayer.')
        logger.error('🔔 [NotificationPrompt] Subscription not saved to DB')
        return false
      }

      // Effacer le dismiss pour ne pas le réafficher
      clearDismissed()

      logger.info('🔔 [NotificationPrompt] Notifications enabled and verified in DB')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'

      const newPermission = pushManager.getPermissionStatus()
      setPermission(newPermission)
      previousPermissionRef.current = newPermission

      if (newPermission === 'denied') {
        logger.info('🔔 [NotificationPrompt] Permission denied by user')
        setError('Permission refusée')
      } else {
        logger.error('🔔 [NotificationPrompt] Enable failed', err)
        setError(errorMessage)
      }

      setState('error')
      return false
    }
  }, [user?.id])

  // Rafraîchir l'état
  const refreshPermissionState = useCallback(async () => {
    const currentPermission = pushManager.getPermissionStatus()
    setPermission(currentPermission)
    previousPermissionRef.current = currentPermission

    const recentlyDismissed = isDismissedRecently()
    setIsDismissed(recentlyDismissed)

    const { hasSubscription } = await checkUserPushSubscription()
    setHasDBSubscription(hasSubscription)

    // Re-detect platform (in case PWA was just installed)
    setPlatform(detectPlatform())
  }, [])

  return {
    shouldShowModal,
    state,
    permission,
    platform,
    isSupported,
    isServiceWorkerReady,
    hasDBSubscription,
    error,
    dismissModal,
    enableNotifications,
    refreshPermissionState,
  }
}
