import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'
import { BankTransactionRepository } from '@/lib/services/repositories/bank-transaction.repository'
import { getSuggestions } from '@/lib/services/domain/bank-matching.service'

/**
 * GET /api/bank/suggestions/[id]
 * Get match suggestions for a specific transaction
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const teamId = userProfile?.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team' }, { status: 403 })
    }

    logger.info(
      { teamId, transactionId: id },
      '[BANK-SUGGESTIONS] GET'
    )

    const repo = new BankTransactionRepository(supabase)
    const transaction = await repo.getTransactionById(id, teamId)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction introuvable' },
        { status: 404 }
      )
    }

    const suggestions = await getSuggestions(transaction, supabase)

    logger.info(
      { transactionId: id, suggestionCount: suggestions.length },
      '[BANK-SUGGESTIONS] Suggestions generated'
    )

    return NextResponse.json({
      success: true,
      suggestions,
    })
  } catch (error) {
    logger.error({ error }, '[BANK-SUGGESTIONS] Unexpected error in GET')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
