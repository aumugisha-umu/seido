/**
 * Rent Call Service
 * Handles rent call generation logic based on contract payment schedules
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { RentCallRepository } from '../repositories/rent-call.repository'
import type { RentCallInsert, RentCallGenerationSummary } from '@/lib/types/bank.types'

const LOG_PREFIX = '[RENT-CALL-SERVICE]'

/** Number of months ahead to generate rent calls */
const GENERATION_HORIZON_MONTHS = 3

type PaymentFrequency = 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'

/** Map payment frequency to month interval */
const FREQUENCY_MONTHS: Record<PaymentFrequency, number> = {
  mensuel: 1,
  trimestriel: 3,
  semestriel: 6,
  annuel: 12,
}

interface ContractForGeneration {
  id: string
  team_id: string
  lot_id: string
  rent_amount: number
  charges_amount: number | null
  payment_frequency: PaymentFrequency
  payment_frequency_value: number
  start_date: string
  end_date: string | null
  auto_rent_calls: boolean
}

/**
 * Get the last day of a given month
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Calculate due dates and periods for a contract over the generation horizon.
 * Exported for testing.
 */
export function calculateDueDates(
  contract: ContractForGeneration,
  referenceDate: Date = new Date(),
): Array<{ dueDate: string; periodStart: string; periodEnd: string }> {
  const results: Array<{ dueDate: string; periodStart: string; periodEnd: string }> = []

  const frequency = contract.payment_frequency
  const monthInterval = FREQUENCY_MONTHS[frequency]
  const dayOfMonth = contract.payment_frequency_value || 1

  const contractStart = new Date(contract.start_date)
  contractStart.setHours(0, 0, 0, 0)

  const contractEnd = contract.end_date ? new Date(contract.end_date) : null
  if (contractEnd) contractEnd.setHours(0, 0, 0, 0)

  // Generate from today up to GENERATION_HORIZON_MONTHS ahead
  const horizonEnd = new Date(referenceDate)
  horizonEnd.setMonth(horizonEnd.getMonth() + GENERATION_HORIZON_MONTHS)

  // Start from the contract start date, step by monthInterval
  // Find the first due date >= contract start
  let currentYear = contractStart.getFullYear()
  let currentMonth = contractStart.getMonth() // 0-indexed

  // Align to the contract's payment frequency start
  // For trimestriel: align to nearest quarter from contract start
  // For simplicity, step from contract start month by monthInterval
  while (true) {
    const maxDay = getLastDayOfMonth(currentYear, currentMonth + 1)
    const actualDay = Math.min(dayOfMonth, maxDay)

    const dueDate = new Date(currentYear, currentMonth, actualDay)

    // Stop if past the horizon
    if (dueDate > horizonEnd) break

    // Skip if before today (we only generate future rent calls)
    if (dueDate >= referenceDate) {
      // Skip if before contract start
      if (dueDate >= contractStart) {
        // Skip if after contract end
        if (!contractEnd || dueDate <= contractEnd) {
          // Calculate period based on frequency
          const periodStart = getPeriodStart(currentYear, currentMonth, monthInterval)
          const periodEnd = getPeriodEnd(currentYear, currentMonth, monthInterval)

          results.push({
            dueDate: formatDate(dueDate),
            periodStart,
            periodEnd,
          })
        }
      }
    }

    // Advance by the month interval
    currentMonth += monthInterval
    if (currentMonth >= 12) {
      currentYear += Math.floor(currentMonth / 12)
      currentMonth = currentMonth % 12
    }
  }

  return results
}

/**
 * Get period start date string (1st of the period's first month)
 */
function getPeriodStart(year: number, month: number, _monthInterval: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

/**
 * Get period end date string (last day of the period's last month)
 */
function getPeriodEnd(year: number, month: number, monthInterval: number): string {
  // Period covers `monthInterval` months starting from `month`
  let endMonth = month + monthInterval - 1
  let endYear = year
  if (endMonth >= 12) {
    endYear += Math.floor(endMonth / 12)
    endMonth = endMonth % 12
  }
  const lastDay = getLastDayOfMonth(endYear, endMonth + 1)
  return `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

/**
 * Format a Date to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Generate rent calls for a single contract.
 * Returns the count of newly created rent calls.
 */
export async function generateRentCallsForContract(
  contractId: string,
  supabase: SupabaseClient,
): Promise<number> {
  const repo = new RentCallRepository(supabase)

  // Fetch contract details
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, team_id, lot_id, rent_amount, charges_amount, payment_frequency, payment_frequency_value, start_date, end_date, auto_rent_calls')
    .eq('id', contractId)
    .single()

  if (error || !contract) {
    logger.error({ error, contractId }, `${LOG_PREFIX} Failed to fetch contract`)
    return 0
  }

  // Skip if auto generation is disabled
  if (contract.auto_rent_calls === false) {
    logger.debug({ contractId }, `${LOG_PREFIX} auto_rent_calls disabled, skipping`)
    return 0
  }

  // Fetch lot to get building_id
  const { data: lot } = await supabase
    .from('lots')
    .select('building_id')
    .eq('id', contract.lot_id)
    .single()

  const dueDates = calculateDueDates(contract as ContractForGeneration)

  if (dueDates.length === 0) {
    logger.debug({ contractId }, `${LOG_PREFIX} No due dates to generate`)
    return 0
  }

  const rentCalls: RentCallInsert[] = dueDates.map(({ dueDate, periodStart, periodEnd }) => ({
    team_id: contract.team_id,
    contract_id: contract.id,
    lot_id: contract.lot_id,
    building_id: lot?.building_id || null,
    due_date: dueDate,
    period_start: periodStart,
    period_end: periodEnd,
    rent_amount: contract.rent_amount,
    charges_amount: contract.charges_amount || 0,
    status: 'pending' as const,
    total_received: 0,
    is_auto_generated: true,
    last_reminder_sent_at: null,
    reminder_count: 0,
  }))

  const result = await repo.batchCreateRentCalls(rentCalls)

  if (!result.success) {
    logger.error({ contractId, error: result.error }, `${LOG_PREFIX} Failed to batch create rent calls`)
    return 0
  }

  logger.info(
    { contractId, generated: result.data.inserted, attempted: rentCalls.length },
    `${LOG_PREFIX} Rent calls generated for contract`,
  )

  return result.data.inserted
}

/**
 * Generate rent calls for ALL active contracts with auto_rent_calls enabled.
 * Uses Promise.allSettled for resilience.
 */
export async function generateAllRentCalls(
  supabase: SupabaseClient,
): Promise<RentCallGenerationSummary> {
  // Fetch all active contracts with auto_rent_calls enabled
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id')
    .eq('status', 'actif')
    .eq('auto_rent_calls', true)
    .is('deleted_at', null)

  if (error) {
    logger.error({ error }, `${LOG_PREFIX} Failed to fetch active contracts`)
    return { total: 0, created: 0, errors: 1 }
  }

  if (!contracts || contracts.length === 0) {
    logger.info({}, `${LOG_PREFIX} No active contracts with auto_rent_calls`)
    return { total: 0, created: 0, errors: 0 }
  }

  logger.info(
    { contractCount: contracts.length },
    `${LOG_PREFIX} Generating rent calls for active contracts`,
  )

  const results = await Promise.allSettled(
    contracts.map((contract) => generateRentCallsForContract(contract.id, supabase)),
  )

  let totalCreated = 0
  let errorCount = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      totalCreated += result.value
    } else {
      errorCount++
      logger.error({ reason: result.reason }, `${LOG_PREFIX} Contract generation failed`)
    }
  }

  const summary: RentCallGenerationSummary = {
    total: contracts.length,
    created: totalCreated,
    errors: errorCount,
  }

  logger.info(summary, `${LOG_PREFIX} Generation complete`)
  return summary
}
