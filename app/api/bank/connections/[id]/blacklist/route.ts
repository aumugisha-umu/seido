import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'
import { BankConnectionRepository } from '@/lib/services/repositories/bank-connection.repository'
import { toggleBlacklistSchema } from '@/lib/validation/bank-schemas'

/**
 * PATCH /api/bank/connections/[id]/blacklist
 * Toggle blacklist status on a bank connection
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

    const body: unknown = await request.json()
    const parsed = toggleBlacklistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Donnees invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { blacklisted } = parsed.data

    logger.info(
      { teamId, connectionId: id, blacklisted },
      '[BANK-CONNECTIONS] PATCH blacklist toggle'
    )

    const repo = new BankConnectionRepository(supabase)
    await repo.toggleBlacklist(id, blacklisted, userProfile.id, teamId)

    return NextResponse.json({ success: true, blacklisted })
  } catch (error) {
    logger.error({ error }, '[BANK-CONNECTIONS] Unexpected error in blacklist PATCH')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
