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
  type ReactNode
} from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

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
          logger.info(`[REALTIME] Channel status: ${status}`, { error: err })

          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setConnectionStatus('connected')
            logger.info(`[REALTIME] ✅ Connected to channel seido:${userId}`)
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false)
            setConnectionStatus('error')
            logger.error('[REALTIME] ❌ Channel error', { error: err })

            // Retry avec backoff exponentiel (max 30s)
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              logger.info('[REALTIME] 🔄 Attempting reconnection...')
              setupChannel()
            }, 5000)
          } else if (status === 'CLOSED') {
            setIsConnected(false)
            setConnectionStatus('disconnected')
            logger.info('[REALTIME] Channel closed')
          } else if (status === 'TIMED_OUT') {
            setIsConnected(false)
            setConnectionStatus('error')
            logger.warn('[REALTIME] Channel timed out, attempting reconnection...')
            reconnectTimeoutRef.current = setTimeout(setupChannel, 3000)
          }
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
  return (
    <RealtimeContext.Provider value={{ isConnected, connectionStatus, subscribe, unsubscribe }}>
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
