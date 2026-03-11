'use server'

/**
 * Supplier Contract Server Actions
 *
 * Server-side operations for supplier contract management.
 * Handles bulk creation and optional reminder interventions.
 */

import { createServerActionSupplierContractService } from '@/lib/services/domain/supplier-contract.service'
import { createServiceRoleSupabaseClient } from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { after } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import { createInterventionNotification } from './notification-actions'

// ============================================================================
// TYPES
// ============================================================================

interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const supplierContractSchema = z.object({
  reference: z.string().min(1, 'Référence requise'),
  supplierId: z.string().min(1, 'Fournisseur requis'),
  cost: z.number().nullable(),
  costFrequency: z.string(),
  endDate: z.string(),
  noticePeriodValue: z.number().nullable(),
  noticePeriodUnit: z.enum(['jours', 'semaines', 'mois']),
  description: z.string(),
})

const createSupplierContractsSchema = z.object({
  buildingId: z.string().nullable(),
  lotId: z.string().nullable(),
  teamId: z.string().min(1),
  contracts: z.array(supplierContractSchema).min(1, 'Au moins un contrat requis'),
  reminders: z.record(z.string(), z.object({
    enabled: z.boolean(),
    assignedUsers: z.array(z.object({
      userId: z.string(),
      role: z.string(),
    })),
  })).optional(),
})

type CreateSupplierContractsInput = z.infer<typeof createSupplierContractsSchema>

// ============================================================================
// HELPER: Calculate notice date from end_date and notice_period
// ============================================================================

function calculateNoticeDate(
  endDate: string,
  noticePeriodValue: number | null,
  noticePeriodUnit: 'jours' | 'semaines' | 'mois'
): string | null {
  if (!endDate || !noticePeriodValue || noticePeriodValue <= 0) return null

  const [year, month, day] = endDate.split('-').map(Number)
  const end = new Date(year, month - 1, day)

  switch (noticePeriodUnit) {
    case 'mois':
      end.setMonth(end.getMonth() - noticePeriodValue)
      break
    case 'semaines':
      end.setDate(end.getDate() - noticePeriodValue * 7)
      break
    case 'jours':
      end.setDate(end.getDate() - noticePeriodValue)
      break
  }

  return formatDate(end)
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ============================================================================
// MAIN ACTION: Create supplier contracts (bulk)
// ============================================================================

export async function createSupplierContractsAction(
  input: CreateSupplierContractsInput
): Promise<ActionResult<{ contractIds: string[]; count: number }>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    if (!authContext) {
      return { success: false, error: 'Authentication required' }
    }
    const userId = authContext.profile.id

    // Validate input
    const parsed = createSupplierContractsSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Validation failed' }
    }
    const { buildingId, lotId, teamId, contracts, reminders } = parsed.data

    // XOR check
    if ((!buildingId && !lotId) || (buildingId && lotId)) {
      return { success: false, error: 'Un immeuble OU un lot doit être sélectionné' }
    }

    logger.info({
      teamId,
      buildingId,
      lotId,
      contractCount: contracts.length,
    }, 'Creating supplier contracts')

    // Build insert rows
    const insertRows = contracts.map((c) => ({
      team_id: teamId,
      building_id: buildingId || null,
      lot_id: lotId || null,
      supplier_id: c.supplierId || null,
      reference: c.reference,
      cost: c.cost,
      cost_frequency: c.costFrequency || null,
      end_date: c.endDate || null,
      notice_period: c.noticePeriodValue ? `${c.noticePeriodValue} ${c.noticePeriodUnit}` : null,
      notice_date: c.endDate
        ? (c.noticePeriodValue && c.noticePeriodValue > 0
            ? calculateNoticeDate(c.endDate, c.noticePeriodValue, c.noticePeriodUnit)
            : c.endDate)
        : null,
      description: c.description || null,
      status: 'actif',
      created_by: userId,
    }))

    // Bulk insert
    const service = await createServerActionSupplierContractService()
    const createdContracts = await service.createBulk(insertRows)

    if (!createdContracts || createdContracts.length === 0) {
      return { success: false, error: 'Échec de la création des contrats fournisseurs' }
    }

    const contractIds = createdContracts.map(c => c.id)

    // Create reminder interventions if enabled
    if (reminders) {
      await createReminderInterventions(
        createdContracts,
        contracts,
        reminders,
        teamId,
        buildingId,
        lotId,
        userId
      )
    }

    logger.info({
      contractIds,
      count: createdContracts.length,
    }, 'Supplier contracts created successfully')

    return {
      success: true,
      data: { contractIds, count: createdContracts.length }
    }
  } catch (error) {
    logger.error({ error }, 'Unexpected error in createSupplierContractsAction')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue'
    }
  }
}

// ============================================================================
// HELPER: Create reminder interventions for supplier contracts
// ============================================================================

async function createReminderInterventions(
  createdContracts: Array<{ id: string; notice_date: string | null; reference: string }>,
  formContracts: Array<{ reference: string }>,
  reminders: Record<string, { enabled: boolean; assignedUsers: Array<{ userId: string; role: string }> }>,
  teamId: string,
  buildingId: string | null,
  lotId: string | null,
  userId: string
): Promise<void> {
  try {
    // Match created contracts to form contracts by index (same order)
    const reminderEntries = Object.entries(reminders).filter(([, config]) => config.enabled)

    if (reminderEntries.length === 0) return

    const supabase = createServiceRoleSupabaseClient()

    // Build intervention rows for contracts with enabled reminders and a valid notice_date
    const interventionRows: Array<{
      title: string
      description: string
      type: Database['public']['Enums']['intervention_type']
      urgency: Database['public']['Enums']['intervention_urgency']
      status: Database['public']['Enums']['intervention_status']
      lot_id: string | null
      building_id: string | null
      team_id: string
      created_by: string
      scheduled_date: string
      scheduling_method: string
    }> = []

    // Build reference → reminderConfig lookup (order-independent matching)
    // Reminders are keyed by tempId; formContracts carry the reference for each tempId
    // We match created DB contracts to reminders via reference (safe regardless of insert order)
    const refToReminder = new Map<string, { enabled: boolean; assignedUsers: Array<{ userId: string; role: string }> }>()
    const allTempIds = Object.keys(reminders)
    for (let i = 0; i < formContracts.length; i++) {
      const tempId = allTempIds[i]
      if (tempId && reminders[tempId]?.enabled) {
        refToReminder.set(formContracts[i].reference, reminders[tempId])
      }
    }

    // Track reminder configs in same order as interventionRows for assignment matching
    const matchedReminderConfigs: Array<{ enabled: boolean; assignedUsers: Array<{ userId: string; role: string }> }> = []

    for (const contract of createdContracts) {
      if (!contract.notice_date) continue

      const reminderConfig = refToReminder.get(contract.reference)
      if (!reminderConfig?.enabled) continue

      matchedReminderConfigs.push(reminderConfig)
      interventionRows.push({
        title: `Rappel échéance — ${contract.reference}`,
        description: `Le contrat fournisseur "${contract.reference}" arrive à échéance. Vérifiez si vous souhaitez le renouveler.`,
        type: 'autre_technique' as Database['public']['Enums']['intervention_type'],
        urgency: 'normale' as Database['public']['Enums']['intervention_urgency'],
        status: 'planifiee' as Database['public']['Enums']['intervention_status'],
        lot_id: lotId,
        building_id: buildingId,
        team_id: teamId,
        created_by: userId,
        scheduled_date: contract.notice_date + 'T09:00:00.000Z',
        scheduling_method: 'direct',
      })
    }

    if (interventionRows.length === 0) return

    const { data: interventions, error: insertError } = await supabase
      .from('interventions')
      .insert(interventionRows)
      .select('id, scheduled_date')

    if (insertError || !interventions) {
      logger.error({ error: insertError }, 'Failed to create supplier contract reminder interventions')
      return
    }

    // Create time slots
    const timeSlotRows = interventions.map(i => ({
      intervention_id: i.id,
      slot_date: i.scheduled_date?.split('T')[0] || '',
      start_time: '09:00',
      end_time: '10:00',
      is_selected: true,
      status: 'selected' as Database['public']['Enums']['time_slot_status'],
      proposed_by: userId,
      selected_by_manager: true,
    }))

    const { data: timeSlots, error: slotError } = await supabase
      .from('intervention_time_slots')
      .insert(timeSlotRows)
      .select('id, intervention_id')

    if (!slotError && timeSlots && timeSlots.length > 0) {
      await Promise.all(
        timeSlots.map(slot =>
          supabase
            .from('interventions')
            .update({ selected_slot_id: slot.id })
            .eq('id', slot.intervention_id)
        )
      )
    }

    // Bulk insert all assignments in a single call
    const VALID_ROLES = ['gestionnaire', 'prestataire', 'locataire'] as const
    const allAssignmentRows: Array<{ intervention_id: string; user_id: string; role: string; assigned_by: string }> = []
    for (let i = 0; i < interventions.length; i++) {
      const reminderConfig = matchedReminderConfigs[i]
      if (!reminderConfig?.assignedUsers?.length) continue

      for (const a of reminderConfig.assignedUsers) {
        if ((VALID_ROLES as readonly string[]).includes(a.role)) {
          allAssignmentRows.push({
            intervention_id: interventions[i].id,
            user_id: a.userId,
            role: a.role,
            assigned_by: userId,
          })
        }
      }
    }
    if (allAssignmentRows.length > 0) {
      await supabase.from('intervention_assignments').insert(allAssignmentRows)
    }

    // Deferred notifications
    after(async () => {
      const results = await Promise.allSettled(
        interventions.map(i => createInterventionNotification(i.id))
      )
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          logger.warn({ error: result.reason, interventionId: interventions[i].id },
            'Supplier contract reminder notification failed (non-blocking)')
        }
      })
    })

    logger.info({
      count: interventions.length,
    }, 'Supplier contract reminder interventions created')
  } catch (error) {
    logger.error({ error }, 'Failed to create reminder interventions (non-blocking)')
  }
}
