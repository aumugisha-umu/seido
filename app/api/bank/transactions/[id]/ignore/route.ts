import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'
import { BankTransactionRepository } from '@/lib/services/repositories/bank-transaction.repository'

/**
 * PATCH /api/bank/transactions/[id]/ignore
 * Toggle ignore status: to_reconcile -> ignored, ignored -> to_reconcile
 */
export async function PATCH(
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
      '[BANK-IGNORE] PATCH toggle'
    )

    const repo = new BankTransactionRepository(supabase)

    // Get current status to determine toggle direction (teamId for IDOR protection)
    const transaction = await repo.getTransactionById(id, teamId)
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction introuvable' },
        { status: 404 }
      )
    }

    const currentStatus = transaction.status as string
    if (currentStatus !== 'to_reconcile' && currentStatus !== 'ignored') {
      return NextResponse.json(
        {
          error: 'Seules les transactions "a reconcilier" ou "ignorees" peuvent etre basculees',
        },
        { status: 400 }
      )
    }

    const newStatus =
      currentStatus === 'to_reconcile' ? 'ignored' : 'to_reconcile'

    await repo.updateStatus(id, newStatus, userProfile.id)

    logger.info(
      { transactionId: id, from: currentStatus, to: newStatus },
      '[BANK-IGNORE] Status toggled'
    )

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    logger.error({ error }, '[BANK-IGNORE] Unexpected error in PATCH')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
