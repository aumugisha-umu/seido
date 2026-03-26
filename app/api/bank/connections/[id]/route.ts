import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'
import { BankConnectionRepository } from '@/lib/services/repositories/bank-connection.repository'

/**
 * DELETE /api/bank/connections/[id]
 * Soft delete a bank connection
 */
export async function DELETE(
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

    logger.info({ teamId, connectionId: id }, '[BANK-CONNECTIONS] DELETE')

    const repo = new BankConnectionRepository(supabase)
    await repo.softDelete(id, userProfile.id, teamId)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, '[BANK-CONNECTIONS] Unexpected error in DELETE')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/bank/connections/[id]
 * Update a bank connection (e.g., account_name)
 */
export async function PATCH(
  request: Request,
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

    const body = (await request.json()) as Record<string, unknown>

    logger.info(
      { teamId, connectionId: id },
      '[BANK-CONNECTIONS] PATCH update'
    )

    // Only allow updating safe fields
    const allowedFields = ['account_name'] as const
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ valide a mettre a jour' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('bank_connections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if (error) {
      logger.error({ error, connectionId: id }, '[BANK-CONNECTIONS] Update failed')
      return NextResponse.json(
        { error: 'Erreur lors de la mise a jour' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, '[BANK-CONNECTIONS] Unexpected error in PATCH')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
