/**
 * Cron Job - Check Unpaid Rent Calls
 *
 * Marks pending rent calls as overdue when due_date is 2+ days past.
 * Groups overdue calls by team_id for future notification dispatch.
 *
 * Frequency: Daily (0 8 * * *)
 */

import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const startTime = Date.now()

  // Auth: verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createServiceRoleSupabaseClient()

    // Find pending rent calls past due by 2+ days
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const cutoffDate = twoDaysAgo.toISOString().split('T')[0]

    const { data: overdueRentCalls, error: fetchError } = await supabase
      .from('rent_calls')
      .select('id, team_id, contract_id, lot_id, due_date, total_expected')
      .eq('status', 'pending')
      .lt('due_date', cutoffDate)

    if (fetchError) {
      logger.error({ error: fetchError }, '[CRON-UNPAID] Failed to fetch overdue rent calls')
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!overdueRentCalls || overdueRentCalls.length === 0) {
      const duration = Date.now() - startTime
      logger.info({ duration }, '[CRON-UNPAID] No overdue rent calls found')
      return NextResponse.json({
        success: true,
        updated: 0,
        teamsAffected: 0,
        duration,
      })
    }

    // Batch update status to 'overdue'
    const overdueIds = overdueRentCalls.map((rc) => rc.id)

    const { error: updateError } = await supabase
      .from('rent_calls')
      .update({
        status: 'overdue',
        updated_at: new Date().toISOString(),
      })
      .in('id', overdueIds)

    if (updateError) {
      logger.error({ error: updateError }, '[CRON-UNPAID] Failed to update overdue status')
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Group by team_id for notification logging
    const teamGroups = new Map<string, number>()
    for (const rc of overdueRentCalls) {
      teamGroups.set(rc.team_id, (teamGroups.get(rc.team_id) || 0) + 1)
    }

    // Log per-team summary (notification dispatch will be added in a future story)
    for (const [teamId, count] of teamGroups) {
      logger.info(
        { teamId, overdueCount: count },
        '[CRON-UNPAID] Team has overdue rent calls',
      )
    }

    const duration = Date.now() - startTime
    logger.info(
      { updated: overdueIds.length, teamsAffected: teamGroups.size, duration },
      '[CRON-UNPAID] Check completed',
    )

    return NextResponse.json({
      success: true,
      updated: overdueIds.length,
      teamsAffected: teamGroups.size,
      teams: Object.fromEntries(teamGroups),
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(
      { error, duration },
      '[CRON-UNPAID] Check failed',
    )
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}
