/**
 * CRON — Cleanup Webhook Events
 *
 * Deletes webhook idempotency records older than 30 days.
 * Uses the DB function cleanup_old_webhook_events() for atomic operation.
 *
 * Frequency: Weekly on Monday at 03:00 UTC (0 3 * * 1)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const startTime = Date.now()

  // Auth
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Use the DB function for atomic cleanup
    const { data: deletedCount, error } = await supabase.rpc('cleanup_old_webhook_events')

    if (error) {
      logger.error({ error }, '[CRON-CLEANUP] RPC error')
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const timing = Date.now() - startTime
    logger.info({ deleted: deletedCount, timing }, '[CRON-CLEANUP] Complete')

    return NextResponse.json({ success: true, deleted: deletedCount ?? 0, timing })
  } catch (error) {
    logger.error({ error }, '[CRON-CLEANUP] Unexpected error')
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
