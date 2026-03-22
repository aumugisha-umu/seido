/**
 * Bank Transaction Repository
 * Handles all database operations for bank transactions.
 * Uses standalone class pattern (no BaseRepository) to match bank-connection.repository.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BankTransactionRow,
  TransactionFilters,
  TransactionReconciliationStatus,
  TinkTransaction,
} from '@/lib/types/bank.types'
import { parseTinkAmount } from '@/lib/types/bank.types'
import { logger } from '@/lib/logger'
import { sanitizeSearch } from '@/lib/utils/sanitize-search'

const DEFAULT_PAGE_SIZE = 50

interface PaginatedTransactions {
  data: BankTransactionRow[]
  total: number
}

/**
 * Maps a TinkTransaction to the database row shape for upsert.
 */
function mapTinkTransactionToRow(
  tx: TinkTransaction,
  teamId: string,
  connectionId: string
): Omit<BankTransactionRow, 'id' | 'created_at' | 'updated_at' | 'reconciled_at' | 'reconciled_by' | 'ignored_at' | 'ignored_by'> {
  return {
    team_id: teamId,
    bank_connection_id: connectionId,
    tink_transaction_id: tx.id,
    transaction_date: tx.dates.booked,
    value_date: tx.dates.value || null,
    amount: parseTinkAmount(tx.amount.value),
    currency: tx.amount.currencyCode,
    description_original: tx.descriptions.original,
    description_display: tx.descriptions.display || null,
    description_detailed: tx.descriptions.detailed?.unstructured || null,
    payer_name: tx.counterparties?.payer?.name || null,
    payer_account_number:
      tx.counterparties?.payer?.identifiers?.financialInstitution?.accountNumber || null,
    payee_name: tx.counterparties?.payee?.name || null,
    payee_account_number:
      tx.counterparties?.payee?.identifiers?.financialInstitution?.accountNumber || null,
    reference: tx.reference || null,
    tink_status: tx.status,
    merchant_name: tx.merchantInformation?.merchantName || null,
    merchant_category_code: tx.merchantInformation?.merchantCategoryCode || null,
    provider_transaction_id: tx.identifiers?.providerTransactionId || null,
    status: 'to_reconcile' as const,
  }
}

export { mapTinkTransactionToRow }

export class BankTransactionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Get transactions for a team with filters and pagination.
   * Returns paginated result with total count.
   */
  async getTransactionsByTeam(
    teamId: string,
    filters: TransactionFilters = {}
  ): Promise<PaginatedTransactions> {
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
    const page = filters.page ?? 1
    const offset = (page - 1) * pageSize

    let query = this.supabase
      .from('bank_transactions')
      .select('*', { count: 'exact' })
      .eq('team_id', teamId)
      .order('transaction_date', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.bankConnectionId) {
      query = query.eq('bank_connection_id', filters.bankConnectionId)
    }

    if (filters.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('transaction_date', filters.dateTo)
    }

    if (filters.amountMin !== undefined) {
      query = query.gte('amount', filters.amountMin)
    }

    if (filters.amountMax !== undefined) {
      query = query.lte('amount', filters.amountMax)
    }

    if (filters.search) {
      const sanitized = sanitizeSearch(filters.search)
      if (sanitized) {
        query = query.or(
          `description_original.ilike.%${sanitized}%,payer_name.ilike.%${sanitized}%,payee_name.ilike.%${sanitized}%,reference.ilike.%${sanitized}%`
        )
      }
    }

    query = query.range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      logger.error('Failed to fetch transactions', { error, teamId, filters })
      throw error
    }

    return {
      data: (data as BankTransactionRow[]) || [],
      total: count ?? 0,
    }
  }

  /**
   * Upsert transactions from Tink into the database.
   * Uses tink_transaction_id as conflict key with ignoreDuplicates for idempotency.
   */
  async upsertTransactions(
    teamId: string,
    connectionId: string,
    transactions: TinkTransaction[]
  ): Promise<number> {
    if (transactions.length === 0) return 0

    const rows = transactions.map((tx) => mapTinkTransactionToRow(tx, teamId, connectionId))

    const { data, error } = await this.supabase
      .from('bank_transactions')
      .upsert(rows, { onConflict: 'tink_transaction_id', ignoreDuplicates: true })
      .select('id')

    if (error) {
      logger.error('Failed to upsert transactions', { error, teamId, connectionId, count: transactions.length })
      throw error
    }

    return data?.length ?? 0
  }

  /**
   * Update transaction reconciliation status.
   * Sets reconciled_at/by or ignored_at/by based on the target status.
   */
  async updateStatus(
    id: string,
    status: TransactionReconciliationStatus,
    userId: string
  ): Promise<BankTransactionRow> {
    const now = new Date().toISOString()

    const updatePayload: Record<string, unknown> = { status }

    if (status === 'reconciled') {
      updatePayload.reconciled_at = now
      updatePayload.reconciled_by = userId
      updatePayload.ignored_at = null
      updatePayload.ignored_by = null
    } else if (status === 'ignored') {
      updatePayload.ignored_at = now
      updatePayload.ignored_by = userId
      updatePayload.reconciled_at = null
      updatePayload.reconciled_by = null
    } else {
      // to_reconcile: clear both
      updatePayload.reconciled_at = null
      updatePayload.reconciled_by = null
      updatePayload.ignored_at = null
      updatePayload.ignored_by = null
    }

    const { data, error } = await this.supabase
      .from('bank_transactions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update transaction status', { error, id, status })
      throw error
    }

    return data as BankTransactionRow
  }

  /**
   * Get a single transaction by ID.
   */
  async getTransactionById(id: string, teamId?: string): Promise<BankTransactionRow | null> {
    let query = this.supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', id)

    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      logger.error('Failed to fetch transaction', { error, id })
      throw error
    }

    return data as BankTransactionRow
  }

  /**
   * Get count of transactions awaiting reconciliation for a team.
   */
  async getToReconcileCount(teamId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('bank_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'to_reconcile')

    if (error) {
      logger.error('Failed to get to_reconcile count', { error, teamId })
      throw error
    }

    return count ?? 0
  }

  /**
   * Get all transactions in a date range for a team (all statuses, for reports).
   */
  async getTransactionsByDateRange(
    teamId: string,
    from: string,
    to: string
  ): Promise<BankTransactionRow[]> {
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .select('*')
      .eq('team_id', teamId)
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('transaction_date', { ascending: false })

    if (error) {
      logger.error('Failed to fetch transactions by date range', { error, teamId, from, to })
      throw error
    }

    return (data as BankTransactionRow[]) || []
  }
}
