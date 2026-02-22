/**
 * CRON — Trial Notifications (J-7, J-3, J-1)
 *
 * Sends reminder emails to trialing gestionnaires before trial expiry.
 * Runs daily. Uses notification flags for idempotency.
 *
 * Frequency: Daily at 09:00 UTC (0 9 * * *)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { getSubscriptionEmailService } from '@/lib/services/domain/subscription-email.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Notification windows in days before trial_end
const WINDOWS = [
  { days: 7, flag: 'notification_j7_sent' as const },
  { days: 3, flag: 'notification_j3_sent' as const },
  { days: 1, flag: 'notification_j1_sent' as const },
]

export async function GET(request: Request) {
  const startTime = Date.now()

  // Auth
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const emailService = getSubscriptionEmailService()
    const now = new Date()
    let totalSent = 0

    for (const window of WINDOWS) {
      // Calculate the target date range for this window
      // We look for subs expiring within [now, now + window.days days]
      // but NOT already notified (flag = false)
      const targetDate = new Date(now.getTime() + window.days * 24 * 60 * 60 * 1000)

      logger.info({ window: window.days, targetDate: targetDate.toISOString() },
        `[CRON-TRIAL-NOTIF] Checking J-${window.days}`)

      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*, teams!inner(id, name)')
        .eq('status', 'trialing')
        .gt('trial_end', now.toISOString())
        .lte('trial_end', targetDate.toISOString())
        .is(window.flag, false)

      if (error) {
        logger.error({ error, window: window.days }, '[CRON-TRIAL-NOTIF] Query error')
        continue
      }

      if (!subs || subs.length === 0) {
        logger.info({ window: window.days }, '[CRON-TRIAL-NOTIF] No subs to notify')
        continue
      }

      logger.info({ window: window.days, count: subs.length }, '[CRON-TRIAL-NOTIF] Found subs to notify')

      for (const sub of subs) {
        // Get the gestionnaire admin email for this team
        const { data: members } = await supabase
          .from('team_members')
          .select('user_id, users!inner(email, first_name)')
          .eq('team_id', sub.team_id)
          .eq('role', 'admin')
          .is('left_at', null)
          .limit(1)

        const member = members?.[0]
        if (!member?.users?.email) {
          logger.warn({ teamId: sub.team_id }, '[CRON-TRIAL-NOTIF] No admin email found')
          continue
        }

        const daysLeft = Math.max(1, Math.ceil(
          (new Date(sub.trial_end).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        ))

        const result = await emailService.sendTrialEnding(
          member.users.email,
          {
            firstName: member.users.first_name || 'Gestionnaire',
            teamName: (sub.teams as { name: string })?.name || 'Votre equipe',
            daysLeft,
            lotCount: sub.billable_properties ?? 0,
          },
        )

        if (result.success) {
          // Set idempotency flag
          await supabase
            .from('subscriptions')
            .update({ [window.flag]: true })
            .eq('id', sub.id)

          totalSent++
        }
      }
    }

    const timing = Date.now() - startTime
    logger.info({ totalSent, timing }, '[CRON-TRIAL-NOTIF] Complete')

    return NextResponse.json({ success: true, sent: totalSent, timing })
  } catch (error) {
    logger.error({ error }, '[CRON-TRIAL-NOTIF] Unexpected error')
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
