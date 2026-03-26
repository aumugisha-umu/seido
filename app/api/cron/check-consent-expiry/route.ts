import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { BankConnectionRepository } from '@/lib/services/repositories/bank-connection.repository'
import { createContextLogger } from '@/lib/logger'

const cronLogger = createContextLogger('cron:consent-expiry')

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createServiceRoleSupabaseClient()

    const repository = new BankConnectionRepository(supabase)
    const expiringConnections = await repository.getExpiringConnections(7)

    const now = new Date()
    let disconnectedCount = 0

    for (const connection of expiringConnections) {
      const expiresAt = new Date(connection.consent_expires_at)
      const isExpired = expiresAt < now

      if (isExpired) {
        await repository.updateSyncState(connection.id, {
          syncStatus: 'disconnected',
        })
        disconnectedCount++
        cronLogger.warn(
          { connectionId: connection.id, teamId: connection.team_id, expiredAt: connection.consent_expires_at },
          'Bank connection consent expired — marked as disconnected'
        )
      } else {
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        cronLogger.warn(
          { connectionId: connection.id, teamId: connection.team_id, daysUntilExpiry, expiresAt: connection.consent_expires_at },
          'Bank connection consent expiring soon'
        )
      }
    }

    const expiringCount = expiringConnections.length - disconnectedCount

    cronLogger.info(
      { expiring: expiringCount, disconnected: disconnectedCount },
      'Consent expiry check completed'
    )

    return NextResponse.json({
      expiring: expiringCount,
      disconnected: disconnectedCount,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    cronLogger.error({ error: message }, 'Consent expiry check failed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
