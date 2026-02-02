'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './use-auth'
import { pushManager } from '@/lib/push-notification-manager'
import { logger } from '@/lib/logger'
import { checkUserPushSubscription } from '@/app/actions/push-subscription-actions'

/**
 * Hook pour gérer l'affichage de la modale de permission notifications
 *
 * Affiche la modale si :
 * - L'app est en mode PWA (standalone)
 * - L'utilisateur est authentifié
 * - Les notifications ne sont pas encore accordées (permission !== 'granted')
 *
 * Détecte automatiquement les changements de permission (ex: utilisateur
 * modifie dans les paramètres système puis revient sur l'app)
 */

export type NotificationPromptState = 'idle' | 'showing' | 'subscribing' | 'success' | 'error'

export interface UseNotificationPromptReturn {
  /** Indique si la modale doit être affichée */
  shouldShowModal: boolean
  /** État actuel du prompt */
  state: NotificationPromptState
  /** Permission actuelle du navigateur */
  permission: NotificationPermission
  /** Indique si on est en mode PWA */
  isPWAMode: boolean
  /** Indique si les notifications sont supportées */
  isSupported: boolean
  /** Indique si le Service Worker est prêt (false en mode dev) */
  isServiceWorkerReady: boolean
  /** Message d'erreur si state === 'error' */
  error: string | null
  /** Fermer la modale (temporairement pour cette session) */
  dismissModal: () => void
  /** Tenter d'activer les notifications */
  enableNotifications: () => Promise<boolean>
  /** Rafraîchir l'état (après retour des paramètres système) */
  refreshPermissionState: () => void
}

export function useNotificationPrompt(): UseNotificationPromptReturn {
  const { user, loading: authLoading } = useAuth()

  const [state, setState] = useState<NotificationPromptState>('idle')
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isPWAMode, setIsPWAMode] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previousPermissionRef = useRef<NotificationPermission>('default')
  const hasInitialized = useRef(false)

  // Initialisation : vérifier support, mode PWA, permission
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initialize = async () => {
      // Vérifier si on est en mode PWA (standalone)
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      // Alternative iOS Safari
      const iosStandalone = (window.navigator as any).standalone === true
      const isPWA = standalone || iosStandalone
      setIsPWAMode(isPWA)

      // Vérifier support des notifications
      const supported = pushManager.isSupported()
      setIsSupported(supported)

      if (!supported) {
        logger.info('🔔 [NotificationPrompt] Push not supported on this device')
        return
      }

      // Vérifier si le service worker est enregistré (peut être désactivé en dev)
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        if (registrations.length === 0) {
          logger.warn('🔔 [NotificationPrompt] No service worker registered. Push notifications require production build.')
          setIsServiceWorkerReady(false)
          return
        }
      } catch {
        setIsServiceWorkerReady(false)
        return
      }

      // Vérifier permission actuelle
      const currentPermission = pushManager.getPermissionStatus()
      setPermission(currentPermission)
      previousPermissionRef.current = currentPermission

      // Vérifier si déjà abonné - DOUBLE CHECK: browser + database
      // Le browser peut penser avoir une subscription qui n'est pas en DB
      const browserSubscribed = await pushManager.isSubscribed()

      // Vérifier aussi côté serveur (source de vérité)
      const { hasSubscription: dbSubscribed } = await checkUserPushSubscription()

      // On considère comme "subscribed" seulement si les deux sont vrais
      // Si browser=true mais DB=false, c'est une incohérence à corriger
      const isActuallySubscribed = browserSubscribed && dbSubscribed
      setIsSubscribed(isActuallySubscribed)

      logger.info('🔔 [NotificationPrompt] Initialized', {
        isPWA,
        supported,
        permission: currentPermission,
        browserSubscribed,
        dbSubscribed,
        isActuallySubscribed
      })
    }

    initialize()
  }, [])

  // Écouter les changements au focus de la fenêtre
  // (quand l'utilisateur revient après avoir modifié les paramètres système)
  useEffect(() => {
    if (!isSupported) return

    const handleFocus = async () => {
      const currentPermission = pushManager.getPermissionStatus()

      if (currentPermission !== previousPermissionRef.current) {
        logger.info('🔔 [NotificationPrompt] Permission changed on focus', {
          from: previousPermissionRef.current,
          to: currentPermission
        })

        setPermission(currentPermission)

        // Si permission accordée après avoir été autre chose, auto-subscribe
        if (currentPermission === 'granted' && user?.id) {
          // D'abord vérifier si on a déjà une subscription en DB
          const { hasSubscription: dbSubscribed } = await checkUserPushSubscription()
          if (dbSubscribed) {
            setIsSubscribed(true)
            setState('success')
            logger.info('🔔 [NotificationPrompt] Already subscribed in database')
          } else {
            // Pas encore de subscription, en créer une
            try {
              setState('subscribing')
              await pushManager.subscribe(user.id)
              setIsSubscribed(true)
              setState('success')
              logger.info('🔔 [NotificationPrompt] Auto-subscribed after permission granted in settings')
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

    // Vérifier au focus
    window.addEventListener('focus', handleFocus)

    // Vérifier aussi périodiquement (backup)
    const interval = setInterval(handleFocus, 10000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [isSupported, user?.id])

  // Déterminer si la modale doit être affichée
  // Ne pas afficher si le SW n'est pas prêt (mode dev)
  const shouldShowModal =
    isPWAMode &&
    isSupported &&
    isServiceWorkerReady &&
    !authLoading &&
    !!user &&
    permission !== 'granted' &&
    !isSubscribed &&
    !isDismissed &&
    state !== 'subscribing' &&
    state !== 'success'

  // Fermer la modale (temporairement)
  const dismissModal = useCallback(() => {
    logger.info('🔔 [NotificationPrompt] Modal dismissed by user')
    setIsDismissed(true)
    setState('idle')
  }, [])

  // Activer les notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('Utilisateur non connecté')
      return false
    }

    setError(null)
    setState('subscribing')

    try {
      // Tenter de s'abonner (va demander la permission si nécessaire)
      await pushManager.subscribe(user.id)

      // Vérifier que la subscription a bien été créée en DB
      const { hasSubscription: dbSubscribed } = await checkUserPushSubscription()

      // Mettre à jour l'état
      const newPermission = pushManager.getPermissionStatus()
      setPermission(newPermission)
      previousPermissionRef.current = newPermission
      setIsSubscribed(dbSubscribed) // Utiliser la valeur DB comme source de vérité
      setState(dbSubscribed ? 'success' : 'error')

      if (!dbSubscribed) {
        setError('La subscription n\'a pas été enregistrée. Veuillez réessayer.')
        logger.error('🔔 [NotificationPrompt] Subscription created locally but not in DB')
        return false
      }

      logger.info('🔔 [NotificationPrompt] Notifications enabled successfully and verified in DB')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'

      // Vérifier si c'est un refus de permission
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

  // Rafraîchir manuellement l'état de permission
  const refreshPermissionState = useCallback(() => {
    const currentPermission = pushManager.getPermissionStatus()
    setPermission(currentPermission)
    previousPermissionRef.current = currentPermission

    // Réinitialiser le dismiss si la permission a changé
    if (currentPermission === 'granted') {
      setIsDismissed(false)
    }
  }, [])

  return {
    shouldShowModal,
    state,
    permission,
    isPWAMode,
    isSupported,
    isServiceWorkerReady,
    error,
    dismissModal,
    enableNotifications,
    refreshPermissionState
  }
}
