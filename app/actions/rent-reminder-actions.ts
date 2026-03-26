'use server'

/**
 * Rent Reminder Server Actions
 * Server-side operations for sending rent payment reminders.
 *
 * Phase 1: Updates reminder metadata (last_reminder_sent_at, reminder_count).
 * Future: Will dispatch push/email/in-app notifications.
 */

import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { RentCallRepository } from '@/lib/services/repositories/rent-call.repository'
import { broadcastInvalidationServer } from '@/lib/data-invalidation-server'
import { logger } from '@/lib/logger'

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours

// ---------------------------------------------------------------------------
// sendRentReminderAction
// ---------------------------------------------------------------------------

export async function sendRentReminderAction(rentCallId: string) {
  const context = await getServerActionAuthContextOrNull('gestionnaire')
  if (!context) {
    return { success: false, error: 'Authentication required' }
  }

  const { supabase, team } = context

  try {
    const repo = new RentCallRepository(supabase)
    const result = await repo.getRentCallById(rentCallId)

    if (!result.success) {
      return { success: false, error: 'Appel de loyer introuvable' }
    }

    const rentCall = result.data

    // Check 24h cooldown
    if (rentCall.last_reminder_sent_at) {
      const lastSent = new Date(rentCall.last_reminder_sent_at).getTime()
      const elapsed = Date.now() - lastSent

      if (elapsed < REMINDER_COOLDOWN_MS) {
        const hoursRemaining = Math.ceil((REMINDER_COOLDOWN_MS - elapsed) / (60 * 60 * 1000))
        return {
          success: false,
          error: `Veuillez attendre encore ${hoursRemaining}h avant d'envoyer une nouvelle relance`
        }
      }
    }

    // Phase 1: Update reminder metadata
    // Future: dispatch push/email/in-app notification here
    const now = new Date().toISOString()
    const newCount = (rentCall.reminder_count ?? 0) + 1

    const { error: updateError } = await supabase
      .from('rent_calls')
      .update({
        last_reminder_sent_at: now,
        reminder_count: newCount
      })
      .eq('id', rentCallId)

    if (updateError) {
      throw updateError
    }

    await broadcastInvalidationServer(supabase, team.id, ['rent_calls'])

    return { success: true }
  } catch (error) {
    logger.error('[RENT-REMINDER] sendRentReminderAction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la relance'
    }
  }
}
