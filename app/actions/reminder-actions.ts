'use server'

/**
 * Reminder Server Actions
 * Server-side operations for reminder (rappel) management
 *
 * Uses getServerActionAuthContextOrNull() for auth (returns error instead of redirect)
 * Uses after() for deferred activity logging
 */

import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import {
  createServerActionReminderService,
  createServerActionSupabaseClient,
  createServerActionRecurrenceRuleRepository,
  createServerActionRecurrenceOccurrenceRepository,
} from '@/lib/services'
import { after } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// ============================================================================
// TYPES
// ============================================================================

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ReminderCreateSchema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(255),
  description: z.string().optional().nullable(),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  priority: z.enum(['basse', 'normale', 'haute'] as const).optional().default('normale'),
  assigned_to: z.string().uuid().optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  lot_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable(),
  rrule: z.string().optional().nullable(),
  recurrence_auto_create: z.string().optional().nullable(),
})

const ReminderUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  priority: z.enum(['basse', 'normale', 'haute'] as const).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  lot_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable(),
})

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Validate XOR constraint: at most one of building_id, lot_id, contact_id, contract_id
 */
function validateLinkedEntity(data: {
  building_id?: string | null
  lot_id?: string | null
  contact_id?: string | null
  contract_id?: string | null
}): string | null {
  const linked = [data.building_id, data.lot_id, data.contact_id, data.contract_id]
    .filter(Boolean)
  if (linked.length > 1) {
    return 'Un rappel ne peut être lié qu\'à une seule entité (immeuble, lot, contact ou contrat)'
  }
  return null
}

/**
 * Log activity for reminder actions (deferred via after())
 * Uses entity_type='intervention' with metadata.reminder_id since
 * activity_entity_type enum does not include 'reminder' yet
 */
function deferActivityLog(params: {
  userId: string
  teamId: string
  actionType: 'create' | 'update' | 'delete' | 'status_change'
  description: string
  reminderId: string
  metadata?: Record<string, unknown>
}) {
  after(async () => {
    try {
      const supabase = await createServerActionSupabaseClient()
      await supabase.from('activity_logs').insert({
        user_id: params.userId,
        team_id: params.teamId,
        action_type: params.actionType,
        entity_type: 'intervention' as const, // closest available; metadata distinguishes
        entity_id: params.reminderId,
        description: params.description,
        metadata: {
          reminder_id: params.reminderId,
          source: 'reminder',
          ...params.metadata,
        },
      })
    } catch (err) {
      logger.error({ err }, 'Failed to log reminder activity')
    }
  })
}

/**
 * Parse FormData into a plain object for Zod validation
 */
function formDataToObject(formData: FormData): Record<string, string | null> {
  const obj: Record<string, string | null> = {}
  for (const [key, value] of formData.entries()) {
    const strValue = String(value).trim()
    obj[key] = strValue === '' ? null : strValue
  }
  return obj
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Create a new reminder
 */
export async function createReminderAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const authContext = await getServerActionAuthContextOrNull('gestionnaire')
  if (!authContext) {
    return { success: false, error: 'Authentification requise' }
  }
  const { profile, team } = authContext

  // Parse and validate
  const raw = formDataToObject(formData)
  const parsed = ReminderCreateSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message || 'Données invalides'
    return { success: false, error: firstError }
  }

  const validated = parsed.data

  // XOR constraint
  const xorError = validateLinkedEntity(validated)
  if (xorError) {
    return { success: false, error: xorError }
  }

  try {
    const reminderService = await createServerActionReminderService()
    const result = await reminderService.create({
      title: validated.title,
      description: validated.description ?? null,
      due_date: validated.due_date ?? null,
      priority: validated.priority,
      assigned_to: validated.assigned_to ?? null,
      building_id: validated.building_id ?? null,
      lot_id: validated.lot_id ?? null,
      contact_id: validated.contact_id ?? null,
      contract_id: validated.contract_id ?? null,
      team_id: team.id,
      created_by: profile.id,
    })

    // Handle recurrence rule creation if rrule is provided
    if (validated.rrule) {
      try {
        const ruleRepo = await createServerActionRecurrenceRuleRepository()
        const occRepo = await createServerActionRecurrenceOccurrenceRepository()

        const autoCreate = validated.recurrence_auto_create === 'true'
        const dtstart = validated.due_date || new Date().toISOString()

        const rule = await ruleRepo.create({
          team_id: team.id,
          created_by: profile.id,
          rrule: validated.rrule,
          dtstart,
          source_type: 'reminder',
          source_template: {
            title: validated.title,
            description: validated.description || null,
            priority: validated.priority,
            assigned_to: validated.assigned_to || null,
            building_id: validated.building_id || null,
            lot_id: validated.lot_id || null,
          },
          auto_create: autoCreate,
          notify_days_before: 1,
          is_active: true,
        })

        // Link the rule to the reminder
        await reminderService.update(result.id, { recurrence_rule_id: rule.id })

        // Generate first batch of occurrences (next 10) using rrule.js server-side
        try {
          const { RRule: RRuleLib } = await import('rrule')
          const dtstartClean = dtstart.replace(/[-:]/g, '').split('.')[0] + 'Z'
          const rruleObj = RRuleLib.fromString(
            `DTSTART:${dtstartClean}\nRRULE:${validated.rrule}`
          )
          const nextDates = rruleObj.all((_date: Date, i: number) => i < 10)

          if (nextDates.length > 0) {
            await occRepo.createBatch(
              nextDates.map((date) => ({
                rule_id: rule.id,
                team_id: team.id,
                occurrence_date: date.toISOString().split('T')[0],
                status: 'pending',
              }))
            )
          }
        } catch (rruleErr) {
          // rrule.js may not be installed yet — skip occurrence generation
          logger.warn({ err: rruleErr }, 'rrule.js not available, skipping occurrence generation')
        }
      } catch (recurrenceErr) {
        // Don't fail the entire reminder creation if recurrence setup fails
        logger.error({ err: recurrenceErr }, 'Failed to create recurrence rule for reminder')
      }
    }

    deferActivityLog({
      userId: profile.id,
      teamId: team.id,
      actionType: 'create',
      description: `Rappel "${validated.title}" cree`,
      reminderId: result.id,
      metadata: {
        title: validated.title,
        priority: validated.priority,
        has_recurrence: !!validated.rrule,
      },
    })

    return { success: true, data: { id: result.id } }
  } catch (err) {
    logger.error({ err }, 'Failed to create reminder')
    return { success: false, error: 'Erreur lors de la creation du rappel' }
  }
}

/**
 * Update an existing reminder
 */
export async function updateReminderAction(
  id: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const authContext = await getServerActionAuthContextOrNull('gestionnaire')
  if (!authContext) {
    return { success: false, error: 'Authentification requise' }
  }
  const { profile, team } = authContext

  if (!id || !z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'ID de rappel invalide' }
  }

  // Parse and validate
  const raw = formDataToObject(formData)
  const parsed = ReminderUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message || 'Données invalides'
    return { success: false, error: firstError }
  }

  const validated = parsed.data

  // XOR constraint (only if any linked entity is being set)
  const xorError = validateLinkedEntity(validated)
  if (xorError) {
    return { success: false, error: xorError }
  }

  try {
    const reminderService = await createServerActionReminderService()
    await reminderService.update(id, validated)

    deferActivityLog({
      userId: profile.id,
      teamId: team.id,
      actionType: 'update',
      description: `Rappel mis a jour`,
      reminderId: id,
      metadata: { updated_fields: Object.keys(validated) },
    })

    return { success: true, data: undefined }
  } catch (err) {
    logger.error({ err }, 'Failed to update reminder')
    return { success: false, error: 'Erreur lors de la mise a jour du rappel' }
  }
}

/**
 * Start working on a reminder (en_attente -> en_cours)
 */
export async function startReminderAction(
  id: string
): Promise<ActionResult<void>> {
  const authContext = await getServerActionAuthContextOrNull('gestionnaire')
  if (!authContext) {
    return { success: false, error: 'Authentification requise' }
  }
  const { profile, team } = authContext

  if (!id || !z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'ID de rappel invalide' }
  }

  try {
    const reminderService = await createServerActionReminderService()
    await reminderService.start(id)

    deferActivityLog({
      userId: profile.id,
      teamId: team.id,
      actionType: 'status_change',
      description: 'Rappel demarre',
      reminderId: id,
      metadata: { new_status: 'en_cours' },
    })

    return { success: true, data: undefined }
  } catch (err) {
    logger.error({ err }, 'Failed to start reminder')
    return { success: false, error: 'Erreur lors du demarrage du rappel' }
  }
}

/**
 * Complete a reminder (-> termine)
 */
export async function completeReminderAction(
  id: string
): Promise<ActionResult<void>> {
  const authContext = await getServerActionAuthContextOrNull('gestionnaire')
  if (!authContext) {
    return { success: false, error: 'Authentification requise' }
  }
  const { profile, team } = authContext

  if (!id || !z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'ID de rappel invalide' }
  }

  try {
    const reminderService = await createServerActionReminderService()
    await reminderService.complete(id)

    deferActivityLog({
      userId: profile.id,
      teamId: team.id,
      actionType: 'status_change',
      description: 'Rappel termine',
      reminderId: id,
      metadata: { new_status: 'termine' },
    })

    return { success: true, data: undefined }
  } catch (err) {
    logger.error({ err }, 'Failed to complete reminder')
    return { success: false, error: 'Erreur lors de la completion du rappel' }
  }
}

/**
 * Cancel a reminder (-> annule)
 */
export async function cancelReminderAction(
  id: string
): Promise<ActionResult<void>> {
  const authContext = await getServerActionAuthContextOrNull('gestionnaire')
  if (!authContext) {
    return { success: false, error: 'Authentification requise' }
  }
  const { profile, team } = authContext

  if (!id || !z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'ID de rappel invalide' }
  }

  try {
    const reminderService = await createServerActionReminderService()
    await reminderService.cancel(id)

    deferActivityLog({
      userId: profile.id,
      teamId: team.id,
      actionType: 'status_change',
      description: 'Rappel annule',
      reminderId: id,
      metadata: { new_status: 'annule' },
    })

    return { success: true, data: undefined }
  } catch (err) {
    logger.error({ err }, 'Failed to cancel reminder')
    return { success: false, error: "Erreur lors de l'annulation du rappel" }
  }
}

/**
 * Soft delete a reminder
 */
export async function deleteReminderAction(
  id: string
): Promise<ActionResult<void>> {
  const authContext = await getServerActionAuthContextOrNull('gestionnaire')
  if (!authContext) {
    return { success: false, error: 'Authentification requise' }
  }

  if (!id || !z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'ID de rappel invalide' }
  }

  try {
    const reminderService = await createServerActionReminderService()
    await reminderService.delete(id)

    return { success: true, data: undefined }
  } catch (err) {
    logger.error({ err }, 'Failed to delete reminder')
    return { success: false, error: 'Erreur lors de la suppression du rappel' }
  }
}

/**
 * Get reminder stats for dashboard
 */
export async function getReminderStatsAction(
  teamId: string
): Promise<ActionResult<{
  total: number
  en_attente: number
  en_cours: number
  termine: number
  annule: number
  overdue: number
  due_today: number
}>> {
  const authContext = await getServerActionAuthContextOrNull('gestionnaire')
  if (!authContext) {
    return { success: false, error: 'Authentification requise' }
  }

  if (!teamId || !z.string().uuid().safeParse(teamId).success) {
    return { success: false, error: 'ID equipe invalide' }
  }

  try {
    const reminderService = await createServerActionReminderService()
    const stats = await reminderService.getStats(teamId)

    return { success: true, data: stats }
  } catch (err) {
    logger.error({ err }, 'Failed to get reminder stats')
    return { success: false, error: 'Erreur lors de la recuperation des statistiques' }
  }
}
