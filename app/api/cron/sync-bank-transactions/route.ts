import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { syncAllConnections } from '@/lib/services/domain/bank-sync.service'
import { createContextLogger } from '@/lib/logger'

const cronLogger = createContextLogger('cron:bank-sync')

export const maxDuration = 120

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createServiceRoleSupabaseClient()

    cronLogger.info('Starting bank transaction sync')

    const result = await syncAllConnections(supabase)

    cronLogger.info(
      { total: result.total, synced: result.synced, errors: result.errors },
      'Bank transaction sync completed'
    )

    return NextResponse.json({
      synced: result.synced,
      errors: result.errors,
      total: result.total,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    cronLogger.error({ error: message }, 'Bank transaction sync failed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
