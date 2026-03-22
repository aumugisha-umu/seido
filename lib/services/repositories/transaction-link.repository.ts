/**
 * Transaction Link Repository
 * Handles all database operations for transaction_links table.
 * Links bank transactions to domain entities (rent_calls, interventions, etc.)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  TransactionLinkRow,
  CreateTransactionLinkDTO,
  TransactionEntityType,
} from '@/lib/types/bank.types'
import { logger } from '@/lib/logger'

// ============================================================================
// REPOSITORY
// ============================================================================

export class TransactionLinkRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Create a transaction link.
   * Sets exactly one entity FK based on entity_type (DB CHECK constraint enforces this).
   */
  async createLink(dto: CreateTransactionLinkDTO): Promise<TransactionLinkRow> {
    const record = {
      team_id: dto.team_id,
      bank_transaction_id: dto.bank_transaction_id,
      entity_type: dto.entity_type,
      rent_call_id: dto.entity_type === 'rent_call' ? (dto.rent_call_id ?? null) : null,
      intervention_id: dto.entity_type === 'intervention' ? (dto.intervention_id ?? null) : null,
      supplier_contract_id: dto.entity_type === 'supplier_contract' ? (dto.supplier_contract_id ?? null) : null,
      property_expense_id: dto.entity_type === 'property_expense' ? (dto.property_expense_id ?? null) : null,
      security_deposit_id: dto.entity_type === 'security_deposit' ? (dto.security_deposit_id ?? null) : null,
      match_confidence: dto.match_confidence ?? null,
      match_method: dto.match_method,
      auto_rule_id: dto.auto_rule_id ?? null,
      linked_by: dto.linked_by,
    }

    const { data, error } = await this.supabase
      .from('transaction_links')
      .insert(record)
      .select()
      .single()

    if (error) {
      logger.error({ error, dto }, 'Failed to create transaction link')
      throw error
    }

    return data as TransactionLinkRow
  }

  /**
   * Soft unlink a transaction link (sets unlinked_at and unlinked_by).
   */
  async unlinkTransaction(linkId: string, userId: string): Promise<TransactionLinkRow> {
    const { data, error } = await this.supabase
      .from('transaction_links')
      .update({
        unlinked_at: new Date().toISOString(),
        unlinked_by: userId,
      })
      .eq('id', linkId)
      .select()
      .single()

    if (error) {
      logger.error({ error, linkId, userId }, 'Failed to unlink transaction')
      throw error
    }

    return data as TransactionLinkRow
  }

  /**
   * Get all active (non-unlinked) links for a given transaction.
   */
  async getLinksForTransaction(transactionId: string): Promise<TransactionLinkRow[]> {
    const { data, error } = await this.supabase
      .from('transaction_links')
      .select('*')
      .eq('bank_transaction_id', transactionId)
      .is('unlinked_at', null)
      .order('linked_at', { ascending: false })

    if (error) {
      logger.error({ error, transactionId }, 'Failed to get links for transaction')
      throw error
    }

    return (data || []) as TransactionLinkRow[]
  }

  /**
   * Get all active links for a team, with optional entity_type filter.
   */
  async getLinksByTeam(
    teamId: string,
    filters?: { entity_type?: TransactionEntityType }
  ): Promise<TransactionLinkRow[]> {
    let query = this.supabase
      .from('transaction_links')
      .select('*')
      .eq('team_id', teamId)
      .is('unlinked_at', null)
      .order('linked_at', { ascending: false })

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    const { data, error } = await query

    if (error) {
      logger.error({ error, teamId, filters }, 'Failed to get links by team')
      throw error
    }

    return (data || []) as TransactionLinkRow[]
  }

  /**
   * Get a single link by ID.
   */
  async getLinkById(linkId: string): Promise<TransactionLinkRow | null> {
    const { data, error } = await this.supabase
      .from('transaction_links')
      .select('*')
      .eq('id', linkId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      logger.error({ error, linkId }, 'Failed to get link by ID')
      throw error
    }

    return data as TransactionLinkRow
  }
}
