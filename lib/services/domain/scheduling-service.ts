/**
 * Scheduling Service — Centralized scheduling logic for interventions
 *
 * Extracts the scheduling logic from the creation flow (create-manager-intervention/route.ts)
 * into reusable functions. Both the creation flow and the planning modal
 * (programInterventionAction) use these functions to ensure identical DB state.
 *
 * Reference: app/api/create-manager-intervention/route.ts lines 307-1017
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'

type InterventionStatus = Database['public']['Enums']['intervention_status']
type SchedulingType = Database['public']['Enums']['intervention_scheduling_type']

// ─────────────────────────────────────────────
// Status Determination
// ─────────────────────────────────────────────

/**
 * Determine intervention status based on scheduling parameters.
 * Replicates creation flow 3-case logic (route.ts lines 319-353).
 *
 * Case 1: Quote required → 'planification'
 * Case 2: Fixed date + date + time + no confirmation → 'planifiee'
 * Case 3: Everything else → 'planification'
 */
export function determineInterventionStatus(
  option: 'direct' | 'propose' | 'organize',
  directSchedule?: { date: string; startTime: string },
  requiresConfirmation?: boolean,
  requireQuote?: boolean
): InterventionStatus {
  if (requireQuote) {
    return 'planification'
  }

  if (
    option === 'direct' &&
    directSchedule?.date &&
    directSchedule?.startTime &&
    !requiresConfirmation
  ) {
    return 'planifiee'
  }

  return 'planification'
}

/**
 * Map planning option to scheduling_type DB enum.
 */
export function mapOptionToSchedulingType(
  option: 'direct' | 'propose' | 'organize'
): SchedulingType {
  switch (option) {
    case 'direct': return 'fixed'
    case 'propose': return 'slots'
    case 'organize': return 'flexible'
  }
}

// ─────────────────────────────────────────────
// Scheduled Date
// ─────────────────────────────────────────────

/**
 * Compute scheduled_date ISO string for fixed mode.
 * Replicates creation flow (route.ts lines 309-311).
 */
export function computeScheduledDate(date: string, time: string): string {
  return `${date}T${time}:00.000Z`
}

// ─────────────────────────────────────────────
// Time Slot Creation
// ─────────────────────────────────────────────

/**
 * Create a single fixed-date slot with correct status and linking.
 * Replicates creation flow (route.ts lines 940-1017).
 *
 * - Uses service role client to bypass RLS timing issues
 * - Sets status='selected' + selected_by_manager=true when no confirmation
 * - Sets status='pending' when confirmation is required
 * - Links slot to intervention via selected_slot_id
 * - Cleans up auto-generated pending time_slot_responses when no confirmation
 */
export async function createFixedSlot(
  supabase: SupabaseClient<Database>,
  interventionId: string,
  date: string,
  startTime: string,
  endTime: string | undefined,
  userId: string,
  requiresConfirmation: boolean
): Promise<{ slotId: string | null; error: string | null }> {
  // Calculate end_time: use provided or add 1 hour (route.ts lines 943-946)
  let calculatedEndTime = endTime
  if (!calculatedEndTime || calculatedEndTime === startTime) {
    const [hours, minutes] = startTime.split(':').map(Number)
    const endHours = (hours + 1) % 24
    calculatedEndTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Delete existing slots first (re-scheduling scenario)
  await supabase
    .from('intervention_time_slots')
    .delete()
    .eq('intervention_id', interventionId)

  // Use service role to bypass RLS (route.ts line 957)
  const serviceClient = createServiceRoleSupabaseClient()
  const { data: fixedSlot, error: slotError } = await serviceClient
    .from('intervention_time_slots')
    .insert({
      intervention_id: interventionId,
      slot_date: date,
      start_time: startTime,
      end_time: calculatedEndTime,
      status: requiresConfirmation ? 'pending' : 'selected',       // route.ts line 966
      selected_by_manager: !requiresConfirmation,                    // route.ts line 967
      proposed_by: userId,                                           // route.ts line 968
    })
    .select('id')
    .single()

  if (slotError) {
    logger.error({ error: slotError }, '[scheduling-service] Error creating fixed slot')
    return { slotId: null, error: slotError.message }
  }

  // Link slot to intervention via selected_slot_id (route.ts lines 984-993)
  if (fixedSlot?.id) {
    const { error: linkError } = await supabase
      .from('interventions')
      .update({ selected_slot_id: fixedSlot.id })
      .eq('id', interventionId)

    if (linkError) {
      logger.warn({ error: linkError, slotId: fixedSlot.id }, '[scheduling-service] Failed to set selected_slot_id')
    }
  }

  // Clean up auto-generated pending responses when no confirmation (route.ts lines 1001-1014)
  if (!requiresConfirmation && fixedSlot?.id) {
    const { error: cleanupError } = await serviceClient
      .from('time_slot_responses')
      .delete()
      .eq('time_slot_id', fixedSlot.id)
      .eq('response', 'pending')

    if (cleanupError) {
      logger.warn({ error: cleanupError, slotId: fixedSlot.id }, '[scheduling-service] Failed to cleanup pending responses')
    }
  }

  return { slotId: fixedSlot?.id || null, error: null }
}

/**
 * Create proposed time slots for 'propose' mode.
 * Replicates creation flow (route.ts lines 907-938).
 * All slots created with status='pending'.
 */
export async function createProposedSlots(
  supabase: SupabaseClient<Database>,
  interventionId: string,
  slots: Array<{ date: string; startTime: string; endTime: string }>,
  userId: string
): Promise<{ error: string | null }> {
  // Delete existing slots first (re-scheduling scenario)
  await supabase
    .from('intervention_time_slots')
    .delete()
    .eq('intervention_id', interventionId)

  // Use service role to bypass RLS (route.ts line 924)
  const serviceClient = createServiceRoleSupabaseClient()
  const timeSlotsToInsert = slots.map(slot => ({
    intervention_id: interventionId,
    slot_date: slot.date,
    start_time: slot.startTime,
    end_time: slot.endTime,
    status: 'pending' as const,    // route.ts line 917
    proposed_by: userId,            // route.ts line 918
  }))

  const { error: insertError } = await serviceClient
    .from('intervention_time_slots')
    .insert(timeSlotsToInsert)

  if (insertError) {
    logger.error({ error: insertError }, '[scheduling-service] Error creating proposed slots')
    return { error: insertError.message }
  }

  return { error: null }
}

/**
 * Delete all existing time slots for an intervention (flexible/organize mode).
 */
export async function clearTimeSlots(
  supabase: SupabaseClient<Database>,
  interventionId: string
): Promise<void> {
  const { error } = await supabase
    .from('intervention_time_slots')
    .delete()
    .eq('intervention_id', interventionId)

  if (error) {
    logger.warn({ error }, '[scheduling-service] Error deleting time slots for flexible mode')
  }
}

// ─────────────────────────────────────────────
// Confirmation Requirements
// ─────────────────────────────────────────────

/**
 * Update confirmation requirements on intervention and assignments.
 * Replicates creation flow (route.ts lines 727-768).
 *
 * For re-scheduling: resets all assignments first, then sets selected.
 */
export async function updateConfirmationRequirements(
  supabase: SupabaseClient<Database>,
  interventionId: string,
  confirmationUserIds: string[],
  requiresConfirmation: boolean
): Promise<void> {
  // Set flag on intervention
  if (requiresConfirmation && confirmationUserIds.length > 0) {
    const { error: flagError } = await supabase
      .from('interventions')
      .update({ requires_participant_confirmation: true })
      .eq('id', interventionId)

    if (flagError) {
      logger.error({ error: flagError }, '[scheduling-service] Failed to update confirmation flag')
    }

    // Reset all assignments (re-scheduling scenario — creation flow doesn't need this)
    await supabase
      .from('intervention_assignments')
      .update({ requires_confirmation: false })
      .eq('intervention_id', interventionId)

    // Set requires_confirmation + pending for selected users (route.ts lines 750-757)
    const { error: assignError } = await supabase
      .from('intervention_assignments')
      .update({
        requires_confirmation: true,
        confirmation_status: 'pending'
      })
      .eq('intervention_id', interventionId)
      .in('user_id', confirmationUserIds)

    if (assignError) {
      logger.error({ error: assignError }, '[scheduling-service] Failed to update assignment confirmation')
    }
  } else if (!requiresConfirmation) {
    // Disable confirmation: reset flag and all assignments
    await supabase
      .from('interventions')
      .update({ requires_participant_confirmation: false })
      .eq('id', interventionId)

    await supabase
      .from('intervention_assignments')
      .update({ requires_confirmation: false })
      .eq('intervention_id', interventionId)
  }
}

// ─────────────────────────────────────────────
// Provider Instructions
// ─────────────────────────────────────────────

/**
 * Store provider guidelines on intervention.
 * Uses provider_guidelines column (route.ts line 1164).
 */
export async function storeProviderGuidelines(
  supabase: SupabaseClient<Database>,
  interventionId: string,
  instructions: string
): Promise<void> {
  if (!instructions?.trim()) return

  const { error } = await supabase
    .from('interventions')
    .update({ provider_guidelines: instructions.trim() })
    .eq('id', interventionId)

  if (error) {
    logger.error({ error }, '[scheduling-service] Failed to store provider guidelines')
  }
}

/**
 * Store per-provider instructions on their assignments.
 * Replicates creation flow (route.ts line 674).
 */
export async function storePerProviderInstructions(
  supabase: SupabaseClient<Database>,
  interventionId: string,
  providerInstructions: Record<string, string>
): Promise<void> {
  if (!providerInstructions || Object.keys(providerInstructions).length === 0) return

  for (const [providerId, instruction] of Object.entries(providerInstructions)) {
    if (instruction) {
      await supabase
        .from('intervention_assignments')
        .update({ provider_instructions: instruction })
        .eq('intervention_id', interventionId)
        .eq('user_id', providerId)
        .eq('role', 'prestataire')
    }
  }
}
