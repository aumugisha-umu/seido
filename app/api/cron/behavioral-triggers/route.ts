/**
 * CRON — Behavioral Triggers
 *
 * Sends engagement emails based on user activity during trial.
 * J+7: feature-engagement email when lots >= 3
 * J+14: value-report email when completed interventions >= 1
 *
 * Frequency: Daily at 10:00 UTC (0 10 * * *)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { getSubscriptionEmailService } from '@/lib/services/domain/subscription-email.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Anti-spam: minimum 7 days between behavioral emails
const COOLDOWN_DAYS = 7
// Time saved per intervention (minutes) for value calculation
const MINUTES_PER_INTERVENTION = 30
const HOURLY_RATE = 45

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
    const cooldownDate = new Date(now.getTime() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    let totalSent = 0

    // Find trialing subs eligible for behavioral emails
    // Must be trialing, trial started at least 7 days ago, no recent behavioral email
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('*, teams!inner(id, name)')
      .eq('status', 'trialing')
      .lte('trial_start', sevenDaysAgo.toISOString())
      .or(`last_behavioral_email_at.is.null,last_behavioral_email_at.lte.${cooldownDate.toISOString()}`)

    if (error) {
      logger.error({ error }, '[CRON-BEHAVIORAL] Query error')
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!subs || subs.length === 0) {
      logger.info({}, '[CRON-BEHAVIORAL] No eligible subs')
      return NextResponse.json({ success: true, sent: 0, timing: Date.now() - startTime })
    }

    logger.info({ count: subs.length }, '[CRON-BEHAVIORAL] Found eligible subs')

    for (const sub of subs) {
      const daysSinceStart = Math.floor(
        (now.getTime() - new Date(sub.trial_start).getTime()) / (24 * 60 * 60 * 1000)
      )
      const lotCount = sub.billable_properties ?? 0
      const daysLeft = Math.max(0, Math.ceil(
        (new Date(sub.trial_end).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      ))

      // Get admin email
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, users!inner(email, first_name)')
        .eq('team_id', sub.team_id)
        .eq('role', 'admin')
        .is('left_at', null)
        .limit(1)

      const member = members?.[0]
      if (!member?.users?.email) continue

      const firstName = member.users.first_name || 'Gestionnaire'
      const teamName = (sub.teams as { name: string })?.name || 'Votre equipe'
      let sent = false

      if (daysSinceStart >= 14) {
        // J+14: Value report — need completed interventions
        const { count: completedCount } = await supabase
          .from('interventions')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', sub.team_id)
          .in('status', ['cloturee_par_gestionnaire', 'cloturee_par_prestataire', 'cloturee_par_locataire'])

        const completed = completedCount ?? 0
        if (completed >= 1) {
          const hoursSaved = (completed * MINUTES_PER_INTERVENTION) / 60
          const moneySaved = hoursSaved * HOURLY_RATE

          const result = await emailService.sendValueReport(member.users.email, {
            firstName,
            teamName,
            completedInterventions: completed,
            hoursSaved,
            moneySaved,
            lotCount,
            daysLeft,
          })
          sent = result.success
        }
      } else if (daysSinceStart >= 7 && lotCount >= 3) {
        // J+7: Feature engagement — lots >= 3
        const { count: interventionCount } = await supabase
          .from('interventions')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', sub.team_id)

        const result = await emailService.sendFeatureEngagement(member.users.email, {
          firstName,
          teamName,
          interventionCount: interventionCount ?? 0,
          lotCount,
          daysLeft,
        })
        sent = result.success
      }

      if (sent) {
        await supabase
          .from('subscriptions')
          .update({ last_behavioral_email_at: now.toISOString() })
          .eq('id', sub.id)

        totalSent++
      }
    }

    const timing = Date.now() - startTime
    logger.info({ totalSent, timing }, '[CRON-BEHAVIORAL] Complete')

    return NextResponse.json({ success: true, sent: totalSent, timing })
  } catch (error) {
    logger.error({ error }, '[CRON-BEHAVIORAL] Unexpected error')
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
