'use server'

/**
 * Supplier Contract Server Actions
 *
 * Server-side operations for supplier contract management.
 * Handles bulk creation and optional reminder interventions.
 */

import { createServerActionSupplierContractService } from '@/lib/services/domain/supplier-contract.service'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { z } from 'zod'
import { logger } from '@/lib/logger'

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
    rrule: z.string().optional(),
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
  reminders: Record<string, { enabled: boolean; assignedUsers: Array<{ userId: string; role: string }>; rrule?: string }>,
  teamId: string,
  buildingId: string | null,
  lotId: string | null,
  userId: string
): Promise<void> {
  try {
    const reminderEntries = Object.entries(reminders).filter(([, config]) => config.enabled)
    if (reminderEntries.length === 0) return

    const refToReminder = new Map<string, { enabled: boolean; assignedUsers: Array<{ userId: string; role: string }>; rrule?: string }>()
    const allTempIds = Object.keys(reminders)
    for (let i = 0; i < formContracts.length; i++) {
      const tempId = allTempIds[i]
      if (tempId && reminders[tempId]?.enabled) {
        refToReminder.set(formContracts[i].reference, reminders[tempId])
      }
    }

    const reminderInputs: Array<{
      title: string; description: string; due_date: string
      contract_id: string; assigned_to: string | null
      lot_id: string | null; building_id: string | null
      rrule?: string
      assignments?: Array<{ userId: string; role: string }>
    }> = []

    for (const contract of createdContracts) {
      if (!contract.notice_date) continue
      const reminderConfig = refToReminder.get(contract.reference)
      if (!reminderConfig?.enabled) continue

      reminderInputs.push({
        title: `Rappel échéance — ${contract.reference}`,
        description: `Le contrat fournisseur "${contract.reference}" arrive à échéance. Vérifiez si vous souhaitez le renouveler.`,
        due_date: contract.notice_date + 'T09:00:00.000Z',
        contract_id: contract.id,
        assigned_to: reminderConfig.assignedUsers?.[0]?.userId ?? null,
        lot_id: lotId,
        building_id: buildingId,
        rrule: reminderConfig.rrule,
        assignments: reminderConfig.assignedUsers.filter(a => a.role === 'gestionnaire'),
      })
    }

    if (reminderInputs.length === 0) return

    // Use createWizardRemindersAction for RRULE support (recurrence rules + occurrences)
    const { createWizardRemindersAction } = await import('@/app/actions/reminder-actions')
    const result = await createWizardRemindersAction(
      reminderInputs.map(input => ({
        title: input.title,
        description: input.description,
        due_date: input.due_date,
        contract_id: input.contract_id,
        lot_id: input.lot_id ?? undefined,
        building_id: input.building_id ?? undefined,
        rrule: input.rrule,
        assignments: input.assignments,
      })),
      { team_id: teamId }
    )

    if (result.success && result.data) {
      logger.info({ ...result.data }, 'Supplier contract reminders created')
    } else {
      logger.warn({ error: result.error }, 'Supplier contract reminders creation failed')
    }
  } catch (error) {
    logger.error({ error }, 'Failed to create supplier contract reminders (non-blocking)')
  }
}
