import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'
import { syncConnection } from '@/lib/services/domain/bank-sync.service'
import { syncConnectionSchema } from '@/lib/validation/bank-schemas'

/**
 * POST /api/bank/sync
 * Trigger a manual sync for a specific bank connection
 */
export async function POST(request: Request) {
  try {
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const teamId = userProfile?.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = syncConnectionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Donnees invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { connection_id } = parsed.data

    logger.info(
      { teamId, connectionId: connection_id },
      '[BANK-SYNC] POST manual sync trigger'
    )

    const result = await syncConnection(connection_id, supabase)

    logger.info(
      { connectionId: connection_id, synced: result.synced, errors: result.errors },
      '[BANK-SYNC] Sync completed'
    )

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
    })
  } catch (error) {
    logger.error({ error }, '[BANK-SYNC] Unexpected error in POST')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
