'use client'

import { useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Email } from '@/lib/types/email-integration'
import { toast } from 'sonner'
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js'

interface UseRealtimeEmailsProps {
    teamId?: string
    onNewEmail: (email: Email) => void
}

export function useRealtimeEmails({ teamId, onNewEmail }: UseRealtimeEmailsProps) {
    const supabase = createBrowserSupabaseClient()

    useEffect(() => {
        if (!teamId) return

        console.log('Setting up realtime subscription for emails, team:', teamId)

        const channel = supabase
            .channel('emails-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'emails',
                    filter: `team_id=eq.${teamId}`
                },
                (payload: RealtimePostgresInsertPayload<Email>) => {
                    console.log('New email received via realtime:', payload)
                    const newEmail = payload.new as Email

                    // Only notify for received emails
                    if (newEmail.direction === 'received') {
                        toast.info(`New email from ${newEmail.from_address}: ${newEmail.subject}`)
                        onNewEmail(newEmail)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [teamId, supabase, onNewEmail])
}
