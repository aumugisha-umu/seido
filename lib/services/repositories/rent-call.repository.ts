/**
 * Rent Call Repository
 * Handles all database operations for rent calls (appels de loyer)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import type {
  RentCallRow,
  RentCallInsert,
  RentCallStatus,
  RentCallFilters,
  RentCallPaginatedResult,
} from '@/lib/types/bank.types'

const LOG_PREFIX = '[RENT-CALL-REPO]'
const DEFAULT_PAGE_SIZE = 20

/**
 * Calculate rent call status based on amounts and due date
 */
export function calculateRentCallStatus(
  totalReceived: number,
  totalExpected: number,
  dueDate: string,
): RentCallStatus {
  if (totalReceived >= totalExpected) return 'paid'
  if (totalReceived > 0) return 'partial'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  if (due < today) return 'overdue'
  return 'pending'
}

export class RentCallRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Get paginated rent calls for a team with filters
   */
  async getRentCallsByTeam(
    teamId: string,
    filters: RentCallFilters = {},
  ): Promise<{ success: true; data: RentCallPaginatedResult } | { success: false; error: string }> {
    try {
      const {
        status,
        contractId,
        lotId,
        dateFrom,
        dateTo,
        page = 1,
        pageSize = DEFAULT_PAGE_SIZE,
      } = filters

      let query = this.supabase
        .from('rent_calls')
        .select('*', { count: 'exact' })
        .eq('team_id', teamId)

      if (status) query = query.eq('status', status)
      if (contractId) query = query.eq('contract_id', contractId)
      if (lotId) query = query.eq('lot_id', lotId)
      if (dateFrom) query = query.gte('due_date', dateFrom)
      if (dateTo) query = query.lte('due_date', dateTo)

      const offset = (page - 1) * pageSize
      query = query
        .order('due_date', { ascending: false })
        .range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        logger.error({ error, teamId }, `${LOG_PREFIX} getRentCallsByTeam error`)
        return { success: false, error: error.message }
      }

      return {
        success: true,
        data: {
          data: (data || []) as RentCallRow[],
          total: count || 0,
        },
      }
    } catch (error) {
      logger.error({ error, teamId }, `${LOG_PREFIX} getRentCallsByTeam unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Get a single rent call by ID
   */
  async getRentCallById(
    id: string,
  ): Promise<{ success: true; data: RentCallRow } | { success: false; error: string }> {
    try {
      const { data, error } = await this.supabase
        .from('rent_calls')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        logger.error({ error, id }, `${LOG_PREFIX} getRentCallById error`)
        return { success: false, error: error.message }
      }

      return { success: true, data: data as RentCallRow }
    } catch (error) {
      logger.error({ error, id }, `${LOG_PREFIX} getRentCallById unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Create a single rent call, handling UNIQUE constraint gracefully
   */
  async createRentCall(
    data: RentCallInsert,
  ): Promise<{ success: true; data: RentCallRow } | { success: false; error: string; isDuplicate?: boolean }> {
    try {
      const { data: result, error } = await this.supabase
        .from('rent_calls')
        .insert(data)
        .select()
        .single()

      if (error) {
        // UNIQUE constraint violation (contract_id, due_date)
        if (error.code === '23505') {
          logger.debug(
            { contractId: data.contract_id, dueDate: data.due_date },
            `${LOG_PREFIX} Duplicate rent call skipped`,
          )
          return { success: false, error: 'Duplicate rent call', isDuplicate: true }
        }
        logger.error({ error, data }, `${LOG_PREFIX} createRentCall error`)
        return { success: false, error: error.message }
      }

      return { success: true, data: result as RentCallRow }
    } catch (error) {
      logger.error({ error }, `${LOG_PREFIX} createRentCall unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Batch create rent calls with idempotent upsert (ignore duplicates)
   */
  async batchCreateRentCalls(
    calls: RentCallInsert[],
  ): Promise<{ success: true; data: { inserted: number } } | { success: false; error: string }> {
    if (calls.length === 0) {
      return { success: true, data: { inserted: 0 } }
    }

    try {
      const { data, error } = await this.supabase
        .from('rent_calls')
        .upsert(calls, {
          onConflict: 'contract_id,due_date',
          ignoreDuplicates: true,
        })
        .select('id')

      if (error) {
        logger.error({ error, count: calls.length }, `${LOG_PREFIX} batchCreateRentCalls error`)
        return { success: false, error: error.message }
      }

      const inserted = data?.length || 0
      logger.info(
        { inserted, attempted: calls.length },
        `${LOG_PREFIX} batchCreateRentCalls completed`,
      )

      return { success: true, data: { inserted } }
    } catch (error) {
      logger.error({ error }, `${LOG_PREFIX} batchCreateRentCalls unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Update payment status based on total_received vs total_expected
   */
  async updatePaymentStatus(
    id: string,
    totalReceived: number,
  ): Promise<{ success: true; data: RentCallRow } | { success: false; error: string }> {
    try {
      // Fetch current rent call to get total_expected and due_date
      const current = await this.getRentCallById(id)
      if (!current.success) return current

      const newStatus = calculateRentCallStatus(
        totalReceived,
        current.data.total_expected,
        current.data.due_date,
      )

      const { data, error } = await this.supabase
        .from('rent_calls')
        .update({
          total_received: totalReceived,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error({ error, id }, `${LOG_PREFIX} updatePaymentStatus error`)
        return { success: false, error: error.message }
      }

      logger.info(
        { id, totalReceived, newStatus },
        `${LOG_PREFIX} Payment status updated`,
      )

      return { success: true, data: data as RentCallRow }
    } catch (error) {
      logger.error({ error, id }, `${LOG_PREFIX} updatePaymentStatus unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Get overdue rent calls (pending and past due by 2+ days)
   */
  async getOverdueRentCalls(
    teamId: string,
  ): Promise<{ success: true; data: RentCallRow[] } | { success: false; error: string }> {
    try {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const cutoffDate = twoDaysAgo.toISOString().split('T')[0]

      const { data, error } = await this.supabase
        .from('rent_calls')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .lt('due_date', cutoffDate)
        .order('due_date', { ascending: true })

      if (error) {
        logger.error({ error, teamId }, `${LOG_PREFIX} getOverdueRentCalls error`)
        return { success: false, error: error.message }
      }

      return { success: true, data: (data || []) as RentCallRow[] }
    } catch (error) {
      logger.error({ error, teamId }, `${LOG_PREFIX} getOverdueRentCalls unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Get unpaid rent calls (pending + overdue) grouped by team for batch notification
   */
  async getUnpaidRentCallsForNotification(
    teamId: string,
  ): Promise<{ success: true; data: RentCallRow[] } | { success: false; error: string }> {
    try {
      const { data, error } = await this.supabase
        .from('rent_calls')
        .select('*')
        .eq('team_id', teamId)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true })

      if (error) {
        logger.error({ error, teamId }, `${LOG_PREFIX} getUnpaidRentCallsForNotification error`)
        return { success: false, error: error.message }
      }

      return { success: true, data: (data || []) as RentCallRow[] }
    } catch (error) {
      logger.error({ error, teamId }, `${LOG_PREFIX} getUnpaidRentCallsForNotification unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Cancel a rent call
   */
  async cancelRentCall(
    id: string,
  ): Promise<{ success: true; data: RentCallRow } | { success: false; error: string }> {
    try {
      const { data, error } = await this.supabase
        .from('rent_calls')
        .update({
          status: 'cancelled' as RentCallStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error({ error, id }, `${LOG_PREFIX} cancelRentCall error`)
        return { success: false, error: error.message }
      }

      logger.info({ id }, `${LOG_PREFIX} Rent call cancelled`)
      return { success: true, data: data as RentCallRow }
    } catch (error) {
      logger.error({ error, id }, `${LOG_PREFIX} cancelRentCall unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Get total revenue received for a given month
   */
  async getMonthlyRevenue(
    teamId: string,
    month: number,
    year: number,
  ): Promise<{ success: true; data: number } | { success: false; error: string }> {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

      const { data, error } = await this.supabase
        .from('rent_calls')
        .select('total_received')
        .eq('team_id', teamId)
        .gte('due_date', startDate)
        .lt('due_date', endDate)
        .neq('status', 'cancelled')

      if (error) {
        logger.error({ error, teamId, month, year }, `${LOG_PREFIX} getMonthlyRevenue error`)
        return { success: false, error: error.message }
      }

      const total = (data || []).reduce(
        (sum, row) => sum + (Number(row.total_received) || 0),
        0,
      )

      return { success: true, data: total }
    } catch (error) {
      logger.error({ error, teamId }, `${LOG_PREFIX} getMonthlyRevenue unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Get collection rate (percentage of expected rent received) for a given month
   */
  async getCollectionRate(
    teamId: string,
    month: number,
    year: number,
  ): Promise<{ success: true; data: number } | { success: false; error: string }> {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

      const { data, error } = await this.supabase
        .from('rent_calls')
        .select('total_received, total_expected')
        .eq('team_id', teamId)
        .gte('due_date', startDate)
        .lt('due_date', endDate)
        .neq('status', 'cancelled')

      if (error) {
        logger.error({ error, teamId, month, year }, `${LOG_PREFIX} getCollectionRate error`)
        return { success: false, error: error.message }
      }

      const rows = data || []
      const totalReceived = rows.reduce(
        (sum, row) => sum + (Number(row.total_received) || 0),
        0,
      )
      const totalExpected = rows.reduce(
        (sum, row) => sum + (Number(row.total_expected) || 0),
        0,
      )

      const rate = totalExpected > 0
        ? Math.round((totalReceived / totalExpected) * 10000) / 100
        : 0

      return { success: true, data: rate }
    } catch (error) {
      logger.error({ error, teamId }, `${LOG_PREFIX} getCollectionRate unexpected error`)
      return { success: false, error: (error as Error).message }
    }
  }
}
