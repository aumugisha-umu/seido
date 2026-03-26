/**
 * Bank Matching Service
 * Suggestion engine for matching bank transactions to domain entities.
 * Phase 1: rent_call matching only.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BankTransactionRow,
  RentCallRow,
  MatchSuggestion,
  ConfidenceLevel,
  TransactionEntityType,
} from '@/lib/types/bank.types'
import { TransactionLinkRepository } from '@/lib/services/repositories/transaction-link.repository'
import { logger } from '@/lib/logger'

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_CONFIDENCE_THRESHOLD = 20
const MAX_SUGGESTIONS = 10
const AMOUNT_TOLERANCE = 0.01
const AMOUNT_APPROX_RATIO = 0.10
const DATE_PROXIMITY_DAYS = 7

// Score weights
const SCORE_STRUCTURED_REF = 40
const SCORE_EXACT_AMOUNT = 25
const SCORE_APPROX_AMOUNT = 15
const SCORE_PAYER_NAME = 15
const SCORE_DATE_PROXIMITY = 5

// ============================================================================
// CONFIDENCE SCORING (exported for testability)
// ============================================================================

/**
 * Calculate match confidence between a bank transaction and a rent call.
 * Returns a score from 0 to 100.
 */
export function calculateMatchConfidence(
  transaction: BankTransactionRow,
  rentCall: RentCallRow,
  tenantLabel?: string
): { confidence: number; details: string[] } {
  let confidence = 0
  const details: string[] = []

  // 1. Structured communication / reference matching (40 points)
  if (transaction.reference) {
    const ref = transaction.reference.toLowerCase()
    if (
      ref.includes(rentCall.id.toLowerCase()) ||
      ref.includes(rentCall.contract_id.toLowerCase()) ||
      ref.includes(rentCall.lot_id.toLowerCase())
    ) {
      confidence += SCORE_STRUCTURED_REF
      details.push('Reference structuree trouvee')
    }
  }

  // 2. Exact amount match (25 points) — within 0.01 tolerance
  const transactionAmount = Math.abs(transaction.amount)
  if (Math.abs(transactionAmount - rentCall.total_expected) <= AMOUNT_TOLERANCE) {
    confidence += SCORE_EXACT_AMOUNT
    details.push('Montant exact')
  }
  // 3. Approximate amount match (15 points) — within 10%
  else if (
    rentCall.total_expected > 0 &&
    Math.abs(transactionAmount - rentCall.total_expected) / rentCall.total_expected <= AMOUNT_APPROX_RATIO
  ) {
    confidence += SCORE_APPROX_AMOUNT
    details.push('Montant approximatif (+/-10%)')
  }

  // 4. Payer name fuzzy match (15 points)
  if (transaction.payer_name && tenantLabel) {
    const payerNormalized = transaction.payer_name.toLowerCase().trim()
    const tenantNormalized = tenantLabel.toLowerCase().trim()
    if (
      payerNormalized.includes(tenantNormalized) ||
      tenantNormalized.includes(payerNormalized)
    ) {
      confidence += SCORE_PAYER_NAME
      details.push('Nom du payeur correspond')
    }
  }

  // 5. Date proximity (5 points) — within 7 days
  const transactionDate = new Date(transaction.transaction_date)
  const dueDate = new Date(rentCall.due_date)
  const daysDiff = Math.abs(
    (transactionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysDiff <= DATE_PROXIMITY_DAYS) {
    confidence += SCORE_DATE_PROXIMITY
    details.push('Date proche de l\'echeance')
  }

  return { confidence, details }
}

/**
 * Map a numeric confidence score to a confidence level.
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 85) return 'high'
  if (confidence >= 50) return 'medium'
  return 'low'
}

// ============================================================================
// SUGGESTION ENGINE
// ============================================================================

/**
 * Get match suggestions for a bank transaction.
 * Phase 1: matches against rent_calls only.
 * Returns suggestions sorted by confidence DESC, filtered above threshold.
 */
export async function getSuggestions(
  transaction: BankTransactionRow,
  supabase: SupabaseClient
): Promise<MatchSuggestion[]> {
  // Fetch pending/partial/overdue rent calls for the team
  const { data: rentCalls, error } = await supabase
    .from('rent_calls')
    .select('*')
    .eq('team_id', transaction.team_id)
    .in('status', ['pending', 'partial', 'overdue'])
    .order('due_date', { ascending: false })

  if (error) {
    logger.error({ error, teamId: transaction.team_id }, 'Failed to fetch rent calls for matching')
    return []
  }

  if (!rentCalls || rentCalls.length === 0) return []

  const suggestions: MatchSuggestion[] = []

  for (const rentCall of rentCalls as RentCallRow[]) {
    // Phase 1 simplicity: no tenant name join, use label-based matching only
    const { confidence, details } = calculateMatchConfidence(transaction, rentCall)

    if (confidence >= MIN_CONFIDENCE_THRESHOLD) {
      suggestions.push({
        entity_type: 'rent_call',
        entity_id: rentCall.id,
        label: `Appel de loyer - ${rentCall.due_date} - ${rentCall.total_expected}EUR`,
        amount: rentCall.total_expected,
        confidence,
        confidence_level: getConfidenceLevel(confidence),
        match_details: details,
      })
    }
  }

  // Sort by confidence DESC and return top N
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_SUGGESTIONS)
}

// ============================================================================
// RECONCILIATION FLOW
// ============================================================================

interface ReconcileParams {
  transactionId: string
  entityType: TransactionEntityType
  entityId: string
  matchMethod: 'manual' | 'auto_rule' | 'suggestion_accepted'
  matchConfidence?: number
  userId: string
  teamId: string
  supabase: SupabaseClient
}

/**
 * Reconcile a bank transaction with a domain entity.
 * Creates the link, updates transaction status, and updates entity payment state.
 */
export async function reconcileTransaction(params: ReconcileParams) {
  const { transactionId, entityType, entityId, matchMethod, matchConfidence, userId, teamId, supabase } = params

  const linkRepo = new TransactionLinkRepository(supabase)

  // Get transaction and verify team ownership (IDOR protection)
  const { data: transaction, error: txError } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('team_id', teamId)
    .single()

  if (txError || !transaction) {
    logger.error({ error: txError, transactionId, teamId }, 'Transaction not found for reconciliation')
    throw new Error(`Transaction ${transactionId} not found`)
  }

  // Build the DTO with the correct entity FK
  const entityFkField = `${entityType}_id` as const
  const dto = {
    team_id: teamId,
    bank_transaction_id: transactionId,
    entity_type: entityType,
    [entityFkField]: entityId,
    match_confidence: matchConfidence,
    match_method: matchMethod,
    linked_by: userId,
  }

  // 1. Create the link
  const link = await linkRepo.createLink(dto)

  // 2. Update transaction status to reconciled
  const { error: statusError } = await supabase
    .from('bank_transactions')
    .update({ status: 'reconciled' })
    .eq('id', transactionId)

  if (statusError) {
    logger.error({ error: statusError, transactionId }, 'Failed to update transaction status')
    throw statusError
  }

  // 3. Entity-specific side effects
  if (entityType === 'rent_call') {
    await updateRentCallPayment(supabase, entityId, Math.abs(transaction.amount))
  }

  return link
}

/**
 * Unlink a transaction from its entity.
 * Soft-unlinks, reverts transaction status, and adjusts entity payment state.
 */
export async function unlinkTransactionFromEntity(
  linkId: string,
  userId: string,
  teamId: string,
  supabase: SupabaseClient
) {
  const linkRepo = new TransactionLinkRepository(supabase)

  // 1. Get the link and verify team ownership (IDOR protection)
  const link = await linkRepo.getLinkById(linkId)
  if (!link || link.team_id !== teamId) {
    throw new Error(`Link ${linkId} not found`)
  }

  // 2. Soft unlink
  await linkRepo.unlinkTransaction(linkId, userId)

  // 3. Revert transaction status to to_reconcile
  const { error: statusError } = await supabase
    .from('bank_transactions')
    .update({ status: 'to_reconcile' })
    .eq('id', link.bank_transaction_id)

  if (statusError) {
    logger.error({ error: statusError, transactionId: link.bank_transaction_id }, 'Failed to revert transaction status')
    throw statusError
  }

  // 4. Entity-specific reversal
  if (link.entity_type === 'rent_call' && link.rent_call_id) {
    // Get transaction amount to subtract
    const { data: transaction } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('id', link.bank_transaction_id)
      .single()

    if (transaction) {
      await updateRentCallPayment(supabase, link.rent_call_id, -Math.abs(transaction.amount))
    }
  }

  return { success: true }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Update rent call total_received by adding the given delta.
 * Uses an atomic RPC to avoid TOCTOU race conditions when concurrent
 * reconciliations target the same rent call.
 */
async function updateRentCallPayment(
  supabase: SupabaseClient,
  rentCallId: string,
  amountDelta: number
) {
  const { error } = await supabase.rpc('increment_rent_call_received', {
    p_rent_call_id: rentCallId,
    p_delta: amountDelta,
  })

  if (error) {
    logger.error({ error, rentCallId, amountDelta }, 'Failed to atomically update rent call payment')
  }
}
