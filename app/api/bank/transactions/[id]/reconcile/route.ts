import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'
import {
  reconcileTransaction,
  unlinkTransactionFromEntity,
} from '@/lib/services/domain/bank-matching.service'
import {
  reconcileTransactionSchema,
  unlinkTransactionSchema,
} from '@/lib/validation/bank-schemas'

/**
 * POST /api/bank/transactions/[id]/reconcile
 * Link a transaction to an entity (rent_call, intervention, etc.)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params

    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const teamId = userProfile?.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = reconcileTransactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Donnees invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { entity_type, entity_id, match_method, match_confidence } =
      parsed.data

    logger.info(
      { teamId, transactionId, entity_type, entity_id, match_method },
      '[BANK-RECONCILE] POST link'
    )

    const result = await reconcileTransaction({
      transactionId,
      entityType: entity_type,
      entityId: entity_id,
      matchMethod: match_method,
      matchConfidence: match_confidence,
      userId: userProfile.id,
      teamId,
      supabase,
    })

    return NextResponse.json({ success: true, link: result })
  } catch (error) {
    logger.error({ error }, '[BANK-RECONCILE] Unexpected error in POST')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/bank/transactions/[id]/reconcile
 * Unlink a transaction from an entity
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params

    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const teamId = userProfile?.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = unlinkTransactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Donnees invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { link_id } = parsed.data

    logger.info(
      { teamId, transactionId, linkId: link_id },
      '[BANK-RECONCILE] DELETE unlink'
    )

    await unlinkTransactionFromEntity(link_id, userProfile.id, teamId, supabase)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, '[BANK-RECONCILE] Unexpected error in DELETE')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
