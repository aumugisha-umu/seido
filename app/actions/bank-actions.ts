'use server'

/**
 * Bank Server Actions
 * Server-side operations for bank transaction management.
 *
 * Actions: reconcile, unlink, ignore/restore, manual sync
 */

import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { reconcileTransaction, unlinkTransactionFromEntity } from '@/lib/services/domain/bank-matching.service'
import { syncConnection } from '@/lib/services/domain/bank-sync.service'
import { BankTransactionRepository } from '@/lib/services/repositories/bank-transaction.repository'
import { broadcastInvalidationServer } from '@/lib/data-invalidation-server'
import { logger } from '@/lib/logger'

type BankTransactionStatus = 'to_reconcile' | 'reconciled' | 'ignored'

// ---------------------------------------------------------------------------
// reconcileTransactionAction
// ---------------------------------------------------------------------------

export async function reconcileTransactionAction(
  transactionId: string,
  entityType: string,
  entityId: string,
  matchMethod?: string,
  matchConfidence?: number
) {
  const context = await getServerActionAuthContextOrNull('gestionnaire')
  if (!context) {
    return { success: false, error: 'Authentication required' }
  }

  const { supabase, profile, team } = context

  try {
    await reconcileTransaction({
      transactionId,
      entityType,
      entityId,
      matchMethod: matchMethod ?? 'manual',
      matchConfidence: matchConfidence ?? 100,
      userId: profile.id,
      teamId: team.id,
      supabase
    })

    await broadcastInvalidationServer(supabase, team.id, ['bank_transactions', 'rent_calls', 'stats'])

    return { success: true }
  } catch (error) {
    logger.error('[BANK-ACTIONS] reconcileTransactionAction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors du rapprochement'
    }
  }
}

// ---------------------------------------------------------------------------
// unlinkTransactionAction
// ---------------------------------------------------------------------------

export async function unlinkTransactionAction(linkId: string) {
  const context = await getServerActionAuthContextOrNull('gestionnaire')
  if (!context) {
    return { success: false, error: 'Authentication required' }
  }

  const { supabase, profile, team } = context

  try {
    await unlinkTransactionFromEntity(linkId, profile.id, team.id, supabase)

    await broadcastInvalidationServer(supabase, team.id, ['bank_transactions', 'rent_calls', 'stats'])

    return { success: true }
  } catch (error) {
    logger.error('[BANK-ACTIONS] unlinkTransactionAction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la dissociation'
    }
  }
}

// ---------------------------------------------------------------------------
// ignoreTransactionAction — toggles between to_reconcile and ignored
// ---------------------------------------------------------------------------

export async function ignoreTransactionAction(transactionId: string) {
  const context = await getServerActionAuthContextOrNull('gestionnaire')
  if (!context) {
    return { success: false, error: 'Authentication required' }
  }

  const { supabase, profile, team } = context

  try {
    const repo = new BankTransactionRepository(supabase)
    const transaction = await repo.getTransactionById(transactionId)

    if (!transaction) {
      return { success: false, error: 'Transaction introuvable' }
    }

    const currentStatus = transaction.status as BankTransactionStatus
    const newStatus: BankTransactionStatus =
      currentStatus === 'ignored' ? 'to_reconcile' : 'ignored'

    await repo.updateStatus(transactionId, newStatus, profile.id)

    await broadcastInvalidationServer(supabase, team.id, ['bank_transactions', 'stats'])

    return { success: true, newStatus }
  } catch (error) {
    logger.error('[BANK-ACTIONS] ignoreTransactionAction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors du changement de statut'
    }
  }
}

// ---------------------------------------------------------------------------
// triggerManualSyncAction
// ---------------------------------------------------------------------------

export async function triggerManualSyncAction(connectionId: string) {
  const context = await getServerActionAuthContextOrNull('gestionnaire')
  if (!context) {
    return { success: false, error: 'Authentication required' }
  }

  const { supabase, team } = context

  try {
    const result = await syncConnection(connectionId, supabase)

    await broadcastInvalidationServer(supabase, team.id, ['bank_transactions', 'stats'])

    return {
      success: true,
      synced: result.synced,
      errors: result.errors
    }
  } catch (error) {
    logger.error('[BANK-ACTIONS] triggerManualSyncAction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la synchronisation'
    }
  }
}
