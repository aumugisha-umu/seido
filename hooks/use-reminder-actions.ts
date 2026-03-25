'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeOptional } from '@/contexts/realtime-context'
import { startReminderAction, completeReminderAction, cancelReminderAction } from '@/app/actions/reminder-actions'
import { toast } from 'sonner'

/**
 * Shared reminder action handlers (start, complete, cancel).
 * Handles server action call, toast feedback, realtime broadcast, and router refresh.
 */
export function useReminderActions() {
  const router = useRouter()
  const realtime = useRealtimeOptional()

  const handleStartReminder = useCallback(async (id: string) => {
    const result = await startReminderAction(id)
    if (result.success) {
      toast.success('Rappel demarre')
      realtime?.broadcastInvalidation(['reminders'])
      router.refresh()
    } else {
      toast.error(result.error || 'Erreur')
    }
  }, [realtime, router])

  const handleCompleteReminder = useCallback(async (id: string) => {
    const result = await completeReminderAction(id)
    if (result.success) {
      toast.success('Rappel termine')
      realtime?.broadcastInvalidation(['reminders'])
      router.refresh()
    } else {
      toast.error(result.error || 'Erreur')
    }
  }, [realtime, router])

  const handleCancelReminder = useCallback(async (id: string) => {
    const result = await cancelReminderAction(id)
    if (result.success) {
      toast.success('Rappel annule')
      realtime?.broadcastInvalidation(['reminders'])
      router.refresh()
    } else {
      toast.error(result.error || 'Erreur')
    }
  }, [realtime, router])

  return { handleStartReminder, handleCompleteReminder, handleCancelReminder }
}
