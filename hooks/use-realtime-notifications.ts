import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'

// ✅ Type propre pour les notifications Supabase
type NotificationRow = Database['public']['Tables']['notifications']['Row']

export interface RealtimeNotificationPayload {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: NotificationRow | null
    old: NotificationRow | null
    schema: string
    table: string
}

interface UseRealtimeNotificationsOptions {
    userId?: string
    teamId?: string
    onInsert?: (notification: NotificationRow) => void
    onUpdate?: (notification: NotificationRow) => void
    onDelete?: (notification: NotificationRow) => void
    enabled?: boolean
}

export const useRealtimeNotifications = (options: UseRealtimeNotificationsOptions) => {
    const {
        userId,
        teamId,
        onInsert,
        onUpdate,
        onDelete,
        enabled = true
    } = options

    const channelRef = useRef<RealtimeChannel | null>(null)
    const supabaseRef = useRef(createBrowserSupabaseClient())

    const setupSubscription = useCallback(() => {
        if (!enabled || !userId || !teamId) {
            logger.info('[REALTIME] Subscription not enabled or missing user/team ID')
            return
        }

        // Clean up existing subscription
        if (channelRef.current) {
            supabaseRef.current.removeChannel(channelRef.current)
        }

        logger.info('[REALTIME] Setting up notifications subscription', { userId, teamId })

        // Create channel with unique name
        const channel = supabaseRef.current
            .channel(`notifications:${userId}:${teamId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    logger.info('[REALTIME] Notification event received', payload)

                    // Cast Supabase payload to typed notification
                    const newNotification = payload.new as NotificationRow | null
                    const oldNotification = payload.old as NotificationRow | null

                    switch (payload.eventType) {
                        case 'INSERT':
                            if (newNotification) onInsert?.(newNotification)
                            break
                        case 'UPDATE':
                            if (newNotification) onUpdate?.(newNotification)
                            break
                        case 'DELETE':
                            if (oldNotification) onDelete?.(oldNotification)
                            break
                    }
                }
            )
            .subscribe((status) => {
                logger.info('[REALTIME] Subscription status:', status)
            })

        channelRef.current = channel
    }, [enabled, userId, teamId, onInsert, onUpdate, onDelete])

    useEffect(() => {
        setupSubscription()

        return () => {
            if (channelRef.current) {
                logger.info('[REALTIME] Cleaning up subscription')
                supabaseRef.current.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [setupSubscription])

    return {
        isSubscribed: !!channelRef.current
    }
}
