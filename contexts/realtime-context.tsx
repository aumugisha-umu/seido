'use client'

/**
 * 🔄 REALTIME PROVIDER - Centralisation des Subscriptions Supabase
 *
 * Ce Provider centralise TOUTES les subscriptions Supabase Realtime en UN SEUL channel.
 * Pattern recommandé par la documentation officielle Supabase pour:
 * - Réduire les connexions WebSocket (de 4-10+ à 1 par user)
 * - Optimiser les ressources serveur Supabase
 * - Réduire l'overhead RLS (1 read par event au lieu de 4-10x)
 * - Centraliser le debugging et la maintenance
 *
 * @see https://supabase.com/docs/guides/realtime/concepts
 * @see https://supabase.com/docs/guides/realtime/postgres-changes
 *
 * Usage:
 * ```tsx
 * // Dans un layout
 * <RealtimeProvider userId={profile.id} teamId={team?.id}>
 *   {children}
 * </RealtimeProvider>
 *
 * // Dans un composant consumer
 * const { subscribe, isConnected } = useRealtime()
 * useEffect(() => {
 *   return subscribe({
 *     table: 'notifications',
 *     event: 'INSERT',
 *     callback: (payload) => { ... }
 *   })
 * }, [subscribe])
 * ```
 *
 * @created 2025-11-28
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
  type ReactNode
} from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

/** Événements Postgres supportés */
type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

/** Tables écoutées par le Provider */
type TableName =
  | 'notifications'
  | 'conversation_messages'
  | 'interventions'
  | 'intervention_quotes'
  | 'intervention_time_slots'
  | 'emails'

/** État de connexion du channel */
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/** Handler enregistré par un consumer */
interface RealtimeHandler<T = unknown> {
  id: string
  table: TableName
  event: RealtimeEvent | '*'
  filter?: string // Filtre additionnel côté client (ex: threadId)
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
}

/** Context exposé aux consumers */
interface RealtimeContextType {
  /** Indique si le channel est connecté */
  isConnected: boolean

  /** État détaillé de la connexion */
  connectionStatus: ConnectionStatus

  /**
   * S'abonner à des événements d'une table.
   * Retourne une fonction de cleanup pour se désabonner.
   */
  subscribe: <T>(handler: Omit<RealtimeHandler<T>, 'id'>) => () => void

  /** Se désabonner manuellement via l'ID du handler */
  unsubscribe: (handlerId: string) => void
}

// ============================================================================
// Context
// ============================================================================

const RealtimeContext = createContext<RealtimeContextType | null>(null)

// ============================================================================
// Provider Props
// ============================================================================

interface RealtimeProviderProps {
  /** ID de l'utilisateur connecté (requis pour les filtres) */
  userId: string
  /** ID de l'équipe (optionnel, pour filtrage avancé) */
  teamId?: string
  children: ReactNode
}

// ============================================================================
// Provider Component
// ============================================================================

export function RealtimeProvider({ userId, teamId, children }: RealtimeProviderProps) {
  // État de connexion
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')

  // Refs pour éviter les re-renders
  const channelRef = useRef<RealtimeChannel | null>(null)
  const handlersRef = useRef<Map<string, RealtimeHandler>>(new Map())
  const supabaseRef = useRef(createBrowserSupabaseClient())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const disconnectedSinceRef = useRef<number | null>(null)
  const warningToastShownRef = useRef(false)
  const warningCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const MAX_RECONNECT_ATTEMPTS = 5
  const DISCONNECTED_WARNING_THRESHOLD_MS = 5000 // 5 seconds

  // ──────────────────────────────────────────────────────────────────────────
  // Event Dispatcher - Route les événements vers les handlers enregistrés
  // ──────────────────────────────────────────────────────────────────────────
  const dispatchEvent = useCallback((
    table: TableName,
    eventType: RealtimeEvent,
    payload: RealtimePostgresChangesPayload<unknown>
  ) => {
    let handlerCount = 0

    handlersRef.current.forEach((handler) => {
      // Vérifier si le handler correspond à la table et l'événement
      if (handler.table === table && (handler.event === '*' || handler.event === eventType)) {
        try {
          handler.callback(payload)
          handlerCount++
        } catch (error) {
          logger.error(`[REALTIME] Handler error for ${table}:${eventType}`, { error })
        }
      }
    })

    if (handlerCount > 0) {
      logger.info(`[REALTIME] Dispatched ${table}:${eventType} to ${handlerCount} handler(s)`)
    }
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Setup Channel - Crée le channel unique avec tous les listeners
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      logger.info('[REALTIME] No userId provided, skipping subscription')
      return
    }

    setConnectionStatus('connecting')
    logger.info(`[REALTIME] Setting up channel for user ${userId}`)

    const setupChannel = () => {
      // Nettoyer l'ancien channel si existant
      if (channelRef.current) {
        logger.info('[REALTIME] Removing existing channel')
        supabaseRef.current.removeChannel(channelRef.current)
      }

      // Créer le channel unique avec TOUS les listeners chaînés
      // Best practice Supabase: chaîner les .on() sur un seul channel
      const channel = supabaseRef.current
        .channel(`seido:${userId}:${teamId || 'global'}`)

        // ──────────────────────────────────────────────────────────────────
        // 🔔 NOTIFICATIONS - Filtrées par user_id
        // ──────────────────────────────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          dispatchEvent('notifications', payload.eventType as RealtimeEvent, payload)
        })

        // ──────────────────────────────────────────────────────────────────
        // 💬 CONVERSATION MESSAGES - Tous les messages (filtrage côté consumer)
        // Note: Le filtrage par thread_id est fait côté consumer
        // ──────────────────────────────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'conversation_messages'
        }, (payload) => {
          dispatchEvent('conversation_messages', payload.eventType as RealtimeEvent, payload)
        })

        // ──────────────────────────────────────────────────────────────────
        // 🔧 INTERVENTIONS - Updates uniquement (créations via Server Actions)
        // ──────────────────────────────────────────────────────────────────
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'interventions'
        }, (payload) => {
          dispatchEvent('interventions', 'UPDATE', payload)
        })

        // ──────────────────────────────────────────────────────────────────
        // 📋 INTERVENTION QUOTES - Devis et réponses prestataires
        // ──────────────────────────────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'intervention_quotes'
        }, (payload) => {
          dispatchEvent('intervention_quotes', payload.eventType as RealtimeEvent, payload)
        })

        // ──────────────────────────────────────────────────────────────────
        // 📅 TIME SLOTS - Créneaux proposés/confirmés
        // ──────────────────────────────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'intervention_time_slots'
        }, (payload) => {
          dispatchEvent('intervention_time_slots', payload.eventType as RealtimeEvent, payload)
        })

        // ──────────────────────────────────────────────────────────────────
        // 📧 EMAILS - Emails reçus/envoyés (filtré par team côté consumer)
        // ──────────────────────────────────────────────────────────────────
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'emails'
        }, (payload) => {
          dispatchEvent('emails', 'INSERT', payload)
        })

        // ──────────────────────────────────────────────────────────────────
        // Subscribe avec gestion des états
        // ──────────────────────────────────────────────────────────────────
        .subscribe((status, err) => {
          // Ne log que si c'est un changement significatif ou une erreur
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setConnectionStatus('connected')
            reconnectAttemptsRef.current = 0 // Reset counter on successful connection
            disconnectedSinceRef.current = null // Reset disconnected timer
            warningToastShownRef.current = false // Reset warning flag
            logger.info(`[REALTIME] ✅ Connected to channel seido:${userId}`)
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false)
            setConnectionStatus('error')
            reconnectAttemptsRef.current++

            // ✅ Track disconnection time for warning toast
            if (!disconnectedSinceRef.current) {
              disconnectedSinceRef.current = Date.now()
            }

            // Log détaillé de l'erreur pour diagnostic
            const errorDetails = {
              message: err?.message || 'Unknown error',
              code: (err as any)?.code,
              reason: (err as any)?.reason,
              attempt: reconnectAttemptsRef.current,
              maxAttempts: MAX_RECONNECT_ATTEMPTS
            }

            // Ne pas spammer la console avec des erreurs vides répétées
            if (err && Object.keys(err).length > 0) {
              logger.error('[REALTIME] ❌ Channel error:', errorDetails)
            } else {
              // Erreur vide = probablement Realtime non activé ou problème réseau
              logger.warn(`[REALTIME] ⚠️ Connection issue (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)
            }

            // ✅ Show warning toast if disconnected for > 5 seconds
            if (!warningToastShownRef.current && disconnectedSinceRef.current) {
              const disconnectedDuration = Date.now() - disconnectedSinceRef.current
              if (disconnectedDuration >= DISCONNECTED_WARNING_THRESHOLD_MS) {
                warningToastShownRef.current = true
                toast.warning('Connexion temps réel interrompue', {
                  description: 'Les mises à jour en temps réel sont temporairement indisponibles. Reconnexion en cours...',
                  duration: 5000
                })
              }
            }

            // Retry avec backoff exponentiel (max 30s) si on n'a pas atteint la limite
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
            }

            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
              // Backoff exponentiel: 1s, 2s, 4s, 8s, 16s, max 30s
              const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000)
              logger.info(`[REALTIME] 🔄 Reconnection scheduled in ${delay/1000}s...`)
              reconnectTimeoutRef.current = setTimeout(setupChannel, delay)
            } else {
              logger.error('[REALTIME] 🛑 Max reconnection attempts reached. Realtime disabled.')
              logger.info('[REALTIME] 💡 Check Supabase Dashboard → Database → Replication to enable Realtime on tables')
              toast.error('Connexion temps réel désactivée', {
                description: 'Les notifications en temps réel sont temporairement indisponibles. Rechargez la page pour réessayer.',
                duration: 10000
              })
            }
          } else if (status === 'CLOSED') {
            setIsConnected(false)
            setConnectionStatus('disconnected')
            logger.info('[REALTIME] Channel closed')
          } else if (status === 'TIMED_OUT') {
            setIsConnected(false)
            setConnectionStatus('error')
            logger.warn('[REALTIME] ⏱ Channel timed out, attempting reconnection...')
            reconnectTimeoutRef.current = setTimeout(setupChannel, 3000)
          }
          // Ignorer les autres statuts (SUBSCRIBING, etc.) pour réduire le bruit
        })

      channelRef.current = channel
    }

    setupChannel()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (channelRef.current) {
        logger.info('[REALTIME] Cleaning up channel')
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, teamId, dispatchEvent])

  // ──────────────────────────────────────────────────────────────────────────
  // Subscribe - Permet aux consumers de s'abonner à des événements
  // ──────────────────────────────────────────────────────────────────────────
  const subscribe = useCallback(<T,>(handler: Omit<RealtimeHandler<T>, 'id'>) => {
    const id = `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    handlersRef.current.set(id, { ...handler, id } as RealtimeHandler)

    logger.info(`[REALTIME] Handler registered: ${handler.table}:${handler.event} (${id})`)

    // Retourner la fonction de cleanup
    return () => {
      handlersRef.current.delete(id)
      logger.info(`[REALTIME] Handler unregistered: ${id}`)
    }
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Unsubscribe - Désabonnement manuel (rarement utilisé)
  // ──────────────────────────────────────────────────────────────────────────
  const unsubscribe = useCallback((handlerId: string) => {
    if (handlersRef.current.delete(handlerId)) {
      logger.info(`[REALTIME] Handler manually unregistered: ${handlerId}`)
    }
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  // ✅ FIX: Memoize context value to prevent unnecessary consumer re-renders
  // Without useMemo, a new object is created on every render, causing all
  // useContext consumers to re-render and re-subscribe in a loop.
  const contextValue = useMemo(
    () => ({ isConnected, connectionStatus, subscribe, unsubscribe }),
    [isConnected, connectionStatus, subscribe, unsubscribe]
  )

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

// ============================================================================
// Hook Consumer
// ============================================================================

/**
 * Hook pour accéder au contexte Realtime.
 * Doit être utilisé à l'intérieur d'un RealtimeProvider.
 *
 * @throws Error si utilisé en dehors d'un RealtimeProvider
 */
export function useRealtime(): RealtimeContextType {
  const context = useContext(RealtimeContext)

  if (!context) {
    throw new Error(
      'useRealtime must be used within a RealtimeProvider. ' +
      'Make sure to wrap your component tree with <RealtimeProvider>.'
    )
  }

  return context
}

/**
 * Hook optionnel qui ne throw pas si le Provider n'est pas présent.
 * Utile pour les composants qui peuvent fonctionner avec ou sans realtime.
 */
export function useRealtimeOptional(): RealtimeContextType | null {
  return useContext(RealtimeContext)
}
