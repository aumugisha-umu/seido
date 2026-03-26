import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'
import { BankConnectionRepository } from '@/lib/services/repositories/bank-connection.repository'

/**
 * GET /api/bank/connections
 * List bank connections for the authenticated user's team (safe version, no tokens)
 */
export async function GET() {
  try {
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const teamId = userProfile?.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team' }, { status: 403 })
    }

    logger.info({ teamId }, '[BANK-CONNECTIONS] GET list')

    const repo = new BankConnectionRepository(supabase)
    const connections = await repo.getConnectionsByTeam(teamId)

    return NextResponse.json({ success: true, connections })
  } catch (error) {
    logger.error({ error }, '[BANK-CONNECTIONS] Unexpected error in GET')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bank/connections
 * Create a bank connection (admin/testing only)
 */
export async function POST(request: Request) {
  try {
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { userProfile } = authResult.data
    const teamId = userProfile?.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team' }, { status: 403 })
    }

    const body: unknown = await request.json()

    logger.info({ teamId }, '[BANK-CONNECTIONS] POST create (admin/test)')

    // Connection creation is handled through Tink Link flow in production.
    // This endpoint exists for testing/admin purposes only.
    return NextResponse.json(
      {
        success: true,
        message: 'Connection creation is handled through Tink Link flow',
        body,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ error }, '[BANK-CONNECTIONS] Unexpected error in POST')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
