import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

export interface RealtimeNotificationPayload {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: any
    old: any
    schema: string
    table: string
}

interface UseRealtimeNotificationsOptions {
    userId?: string
    teamId?: string
    onInsert?: (payload: any) => void
    onUpdate?: (payload: any) => void
    onDelete?: (payload: any) => void
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

                    switch (payload.eventType) {
                        case 'INSERT':
                            onInsert?.(payload.new)
                            break
                        case 'UPDATE':
                            onUpdate?.(payload.new)
                            break
                        case 'DELETE':
                            onDelete?.(payload.old)
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
