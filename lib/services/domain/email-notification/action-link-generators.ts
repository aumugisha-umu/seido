/**
 * 📧 Email Action Link Generators
 *
 * Functions for generating magic links with embedded actions.
 * These links allow users to perform actions directly from email buttons.
 *
 * @module email-notification/action-link-generators
 */

import { generateMagicLinkWithAction, generateMagicLinksWithActionBatch } from '../magic-link.service'
import type { EmailTimeSlotWithActions, QuickEstimateConfig } from '@/emails/utils/types'

// ══════════════════════════════════════════════════════════════
// Time Slot Actions
// ══════════════════════════════════════════════════════════════

/**
 * Generate slot action links for a recipient
 * Creates accept/refuse magic links for each time slot
 *
 * @param email - Recipient email
 * @param interventionId - Intervention ID
 * @param role - User role (locataire or prestataire)
 * @param slots - Array of time slots with IDs
 * @returns Array of slots with action URLs
 */
export async function generateSlotActionLinks(
  email: string,
  interventionId: string,
  role: 'locataire' | 'prestataire',
  slots: Array<{ id: string; date: Date; startTime: string; endTime: string }>
): Promise<EmailTimeSlotWithActions[]> {
  const redirectTo = `/${role}/interventions/${interventionId}`

  // Generate links for all slots in batch
  const actionRequests = slots.flatMap(slot => [
    {
      email,
      redirectTo,
      action: role === 'locataire' ? 'confirm_slot' : 'accept_time_slot',
      params: { slotId: slot.id }
    },
    {
      email,
      redirectTo,
      action: 'reject_slot',
      params: { slotId: slot.id }
    }
  ])

  const linksMap = await generateMagicLinksWithActionBatch(actionRequests)

  // Map back to slot format
  return slots.map(slot => {
    const acceptKey = `${email}:${role === 'locataire' ? 'confirm_slot' : 'accept_time_slot'}:{"slotId":"${slot.id}"}`
    const refuseKey = `${email}:reject_slot:{"slotId":"${slot.id}"}`

    return {
      slotId: slot.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      acceptUrl: linksMap.get(acceptKey),
      refuseUrl: linksMap.get(refuseKey)
    }
  })
}

// ══════════════════════════════════════════════════════════════
// Validation Actions
// ══════════════════════════════════════════════════════════════

/**
 * Generate validate/contest action links for tenant
 * Used when an intervention is completed and requires tenant validation
 *
 * @param email - Tenant email
 * @param interventionId - Intervention ID
 * @returns Object with validate and contest URLs
 */
export async function generateValidationActionLinks(
  email: string,
  interventionId: string
): Promise<{ validateUrl?: string; contestUrl?: string }> {
  const redirectTo = `/locataire/interventions/${interventionId}`

  const [validateLink, contestLink] = await Promise.all([
    generateMagicLinkWithAction({
      email,
      redirectTo,
      action: 'validate_intervention',
      params: { type: 'approve' }
    }),
    generateMagicLinkWithAction({
      email,
      redirectTo,
      action: 'validate_intervention',
      params: { type: 'contest' }
    })
  ])

  return {
    validateUrl: validateLink || undefined,
    contestUrl: contestLink || undefined
  }
}

// ══════════════════════════════════════════════════════════════
// Quote Actions
// ══════════════════════════════════════════════════════════════

/**
 * Generate quick estimate action links for prestataire
 * Allows provider to submit preset quote amounts directly from email
 *
 * @param email - Provider email
 * @param interventionId - Intervention ID
 * @param quoteId - Quote ID
 * @param amounts - Array of preset amounts (default: [150, 300, 500])
 * @returns Array of quick estimate configurations with URLs
 */
export async function generateQuickEstimateLinks(
  email: string,
  interventionId: string,
  quoteId: string,
  amounts: number[] = [150, 300, 500]
): Promise<QuickEstimateConfig[]> {
  const redirectTo = `/prestataire/interventions/${interventionId}`

  const links = await Promise.all(
    amounts.map(async (amount) => {
      const link = await generateMagicLinkWithAction({
        email,
        redirectTo,
        action: 'submit_quick_estimate',
        params: { amount: amount.toString(), quoteId }
      })

      return {
        amount,
        label: `${amount}€`,
        url: link || redirectTo // Fallback to direct URL
      }
    })
  )

  return links
}
