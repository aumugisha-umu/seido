/**
 * CRON — Trial Expiration
 *
 * Transitions expired trials to free_tier (<=2 lots) or read_only (>2 lots).
 * Sends trial-expired email.
 *
 * Frequency: Daily at 00:30 UTC (30 0 * * *)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { getSubscriptionEmailService } from '@/lib/services/domain/subscription-email.service'
import { FREE_TIER_LIMIT } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
    const emailService = getSubscriptionEmailService()
    const now = new Date()
    let transitioned = 0

    // Find all expired trials
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('*, teams!inner(id, name)')
      .eq('status', 'trialing')
      .lt('trial_end', now.toISOString())

    if (error) {
      logger.error({ error }, '[CRON-TRIAL-EXP] Query error')
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!subs || subs.length === 0) {
      logger.info({}, '[CRON-TRIAL-EXP] No expired trials found')
      return NextResponse.json({ success: true, transitioned: 0, timing: Date.now() - startTime })
    }

    logger.info({ count: subs.length }, '[CRON-TRIAL-EXP] Found expired trials')

    for (const sub of subs) {
      const lotCount = sub.billable_properties ?? 0
      const newStatus = lotCount <= FREE_TIER_LIMIT ? 'free_tier' : 'read_only'
      const isReadOnly = newStatus === 'read_only'

      // Transition status
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: newStatus,
          trial_expired_email_sent: true,
        })
        .eq('id', sub.id)

      if (updateError) {
        logger.error({ error: updateError, subId: sub.id }, '[CRON-TRIAL-EXP] Update error')
        continue
      }

      // Send trial-expired email
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, users!inner(email, first_name)')
        .eq('team_id', sub.team_id)
        .eq('role', 'admin')
        .is('left_at', null)
        .limit(1)

      const member = members?.[0]
      if (member?.users?.email) {
        await emailService.sendTrialExpired(
          member.users.email,
          {
            firstName: member.users.first_name || 'Gestionnaire',
            teamName: (sub.teams as { name: string })?.name || 'Votre equipe',
            lotCount,
            isReadOnly,
          },
        )
      }

      transitioned++
      logger.info({ subId: sub.id, newStatus, lotCount }, '[CRON-TRIAL-EXP] Transitioned')
    }

    const timing = Date.now() - startTime
    logger.info({ transitioned, timing }, '[CRON-TRIAL-EXP] Complete')

    return NextResponse.json({ success: true, transitioned, timing })
  } catch (error) {
    logger.error({ error }, '[CRON-TRIAL-EXP] Unexpected error')
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
