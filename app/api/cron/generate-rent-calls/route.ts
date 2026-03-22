/**
 * Cron Job - Generate Rent Calls
 *
 * Generates rent calls for all active contracts with auto_rent_calls enabled.
 * Creates rent calls for the next 3 months based on payment frequency.
 * Idempotent: duplicate (contract_id, due_date) pairs are ignored.
 *
 * Frequency: Daily (0 2 * * *)
 */

import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import { generateAllRentCalls } from '@/lib/services/domain/rent-call.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const startTime = Date.now()

  // Auth: verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createServiceRoleSupabaseClient()

    const summary = await generateAllRentCalls(supabase)

    const duration = Date.now() - startTime
    logger.info(
      { ...summary, duration },
      '[CRON-RENT-CALLS] Generation completed',
    )

    return NextResponse.json({
      success: true,
      ...summary,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(
      { error, duration },
      '[CRON-RENT-CALLS] Generation failed',
    )
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}
