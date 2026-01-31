'use client'

/**
 * 🔔 USE REALTIME NOTIFICATIONS V2 - Consumer Hook
 *
 * Hook consumer pour les notifications utilisant le RealtimeProvider centralisé.
 * Remplace use-realtime-notifications.ts et use-notification-subscription.ts
 *
 * Avantages par rapport aux anciennes versions:
 * - Pas de création de channel individuel (utilise le channel centralisé)
 * - Moins de code (~50 lignes vs ~200+ lignes)
 * - Reconnexion automatique gérée par le Provider
 * - Pas de duplication de subscriptions
 *
 * @see contexts/realtime-context.tsx
 * @created 2025-11-28
 */

import { useEffect, useCallback, useState, useOptimistic, startTransition, useRef } from 'react'
import { useRealtime, useRealtimeOptional } from '@/contexts/realtime-context'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// ============================================================================
// Types
// ============================================================================

type DbNotification = Database['public']['Tables']['notifications']['Row']

/** Options pour personnaliser le comportement du hook */
interface UseRealtimeNotificationsOptions {
  /** Callback appelé lors d'une nouvelle notification */
  onInsert?: (notification: DbNotification) => void
  /** Callback appelé lors de la mise à jour d'une notification */
  onUpdate?: (notification: DbNotification) => void
  /** Callback appelé lors de la suppression d'une notification */
  onDelete?: (notification: DbNotification) => void
  /** Désactiver le hook (utile pour les conditions) */
  enabled?: boolean
}

/** Retour du hook */
interface UseRealtimeNotificationsReturn {
  /** Indique si le channel realtime est connecté */
  isConnected: boolean
}

// ============================================================================
// Hook Principal
// ============================================================================

/**
 * Hook pour écouter les notifications en temps réel.
 *
 * @example
 * ```tsx
 * const { isConnected } = useRealtimeNotificationsV2({
 *   onInsert: (notification) => {
 *     toast.success(notification.title)
 *     setNotifications(prev => [notification, ...prev])
 *   },
 *   onUpdate: (notification) => {
 *     setNotifications(prev =>
 *       prev.map(n => n.id === notification.id ? notification : n)
 *     )
 *   }
 * })
 * ```
 */
export function useRealtimeNotificationsV2(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const { onInsert, onUpdate, onDelete, enabled = true } = options

  // ✅ FIX: Stocker les callbacks dans refs pour éviter les re-subscriptions
  // Pattern officiel React pour les callbacks stables dans les effects
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)

  // Mettre à jour les refs quand les callbacks changent (sans re-trigger l'effect)
  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
  })

  // Utiliser le context Realtime centralisé
  const realtimeContext = useRealtimeOptional()

  useEffect(() => {
    // Ne pas s'abonner si désactivé ou si le provider n'est pas présent
    if (!enabled || !realtimeContext) {
      return
    }

    const { subscribe } = realtimeContext

    // S'abonner aux événements notifications via le channel centralisé
    const unsubscribe = subscribe<DbNotification>({
      table: 'notifications',
      event: '*',
      callback: (payload: RealtimePostgresChangesPayload<DbNotification>) => {
        const { eventType, new: newRecord, old: oldRecord } = payload

        switch (eventType) {
          case 'INSERT':
            if (newRecord && onInsertRef.current) {
              onInsertRef.current(newRecord as DbNotification)
            }
            break

          case 'UPDATE':
            if (newRecord && onUpdateRef.current) {
              onUpdateRef.current(newRecord as DbNotification)
            }
            break

          case 'DELETE':
            // Note: DELETE ne renvoie que l'ancien record (old)
            if (oldRecord && onDeleteRef.current) {
              onDeleteRef.current(oldRecord as DbNotification)
            }
            break
        }
      }
    })

    // Cleanup: se désabonner quand le composant se démonte
    return unsubscribe
  }, [enabled, realtimeContext]) // ✅ Plus de dépendance sur onInsert/onUpdate/onDelete

  return {
    isConnected: realtimeContext?.isConnected ?? false
  }
}

// ============================================================================
// Hook avec State Management Intégré
// ============================================================================

interface UseNotificationsStateOptions {
  /** Liste initiale des notifications */
  initialNotifications?: DbNotification[]
  /** Callback optionnel après insertion */
  onNewNotification?: (notification: DbNotification) => void
}

interface UseNotificationsStateReturn {
  /** Liste des notifications (avec optimistic updates) */
  notifications: DbNotification[]
  /** Nombre de notifications non lues */
  unreadCount: number
  /** Marquer une notification comme lue (optimistic) */
  markAsRead: (notificationId: string) => void
  /** Marquer toutes les notifications comme lues (optimistic) */
  markAllAsRead: () => void
  /** Indique si le channel realtime est connecté */
  isConnected: boolean
}

type NotificationAction =
  | { type: 'INSERT'; notification: DbNotification }
  | { type: 'UPDATE'; notification: DbNotification }
  | { type: 'DELETE'; notification: DbNotification }
  | { type: 'MARK_READ'; notificationId: string }
  | { type: 'MARK_ALL_READ' }

/**
 * Hook avancé avec gestion d'état optimistic intégrée.
 *
 * @example
 * ```tsx
 * const {
 *   notifications,
 *   unreadCount,
 *   markAsRead,
 *   markAllAsRead,
 *   isConnected
 * } = useNotificationsState({
 *   initialNotifications: serverNotifications,
 *   onNewNotification: (n) => playNotificationSound()
 * })
 * ```
 */
export function useNotificationsState(
  options: UseNotificationsStateOptions = {}
): UseNotificationsStateReturn {
  const { initialNotifications = [], onNewNotification } = options

  // State avec optimistic updates via React 19 useOptimistic
  const [notifications, setNotifications] = useState<DbNotification[]>(initialNotifications)

  const [optimisticNotifications, addOptimisticUpdate] = useOptimistic(
    notifications,
    (state: DbNotification[], action: NotificationAction) => {
      switch (action.type) {
        case 'INSERT':
          // Éviter les doublons
          if (state.some(n => n.id === action.notification.id)) {
            return state
          }
          return [action.notification, ...state]

        case 'UPDATE':
          return state.map(n =>
            n.id === action.notification.id ? action.notification : n
          )

        case 'DELETE':
          return state.filter(n => n.id !== action.notification.id)

        case 'MARK_READ':
          return state.map(n =>
            n.id === action.notificationId ? { ...n, read: true } : n
          )

        case 'MARK_ALL_READ':
          return state.map(n => ({ ...n, read: true }))

        default:
          return state
      }
    }
  )

  // ✅ FIX: Stocker les fonctions instables dans refs pour éviter les re-renders
  const addOptimisticUpdateRef = useRef(addOptimisticUpdate)
  const onNewNotificationRef = useRef(onNewNotification)

  useEffect(() => {
    addOptimisticUpdateRef.current = addOptimisticUpdate
    onNewNotificationRef.current = onNewNotification
  })

  // S'abonner aux événements realtime - callbacks maintenant stables grâce aux refs
  const { isConnected } = useRealtimeNotificationsV2({
    onInsert: (notification: DbNotification) => {
      startTransition(() => {
        addOptimisticUpdateRef.current({ type: 'INSERT', notification })
      })
      // Mettre à jour le state réel
      setNotifications(prev => {
        if (prev.some(n => n.id === notification.id)) return prev
        return [notification, ...prev]
      })
      // Callback utilisateur
      onNewNotificationRef.current?.(notification)
    },

    onUpdate: (notification: DbNotification) => {
      startTransition(() => {
        addOptimisticUpdateRef.current({ type: 'UPDATE', notification })
      })
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? notification : n)
      )
    },

    onDelete: (notification: DbNotification) => {
      startTransition(() => {
        addOptimisticUpdateRef.current({ type: 'DELETE', notification })
      })
      setNotifications(prev =>
        prev.filter(n => n.id !== notification.id)
      )
    }
  })

  // Actions utilisateur - stables grâce aux refs
  const markAsRead = useCallback((notificationId: string) => {
    startTransition(() => {
      addOptimisticUpdateRef.current({ type: 'MARK_READ', notificationId })
    })
    // Note: L'appel API pour persister est fait par le composant appelant
    // via markNotificationAsRead server action
  }, [])

  const markAllAsRead = useCallback(() => {
    startTransition(() => {
      addOptimisticUpdateRef.current({ type: 'MARK_ALL_READ' })
    })
  }, [])

  // Calculer le nombre de non lus
  const unreadCount = optimisticNotifications.filter(n => !n.read).length

  return {
    notifications: optimisticNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected
  }
}
