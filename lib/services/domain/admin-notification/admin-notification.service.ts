/**
 * Admin Notification Service
 *
 * Sends rich HTML emails to platform admins for key user lifecycle events:
 * 1. New signup (email or OAuth)
 * 2. Subscription created/updated (with MRR/ARR impact)
 * 3. Subscription cancelled (churn, with MRR loss)
 * 4. Trial expired
 *
 * All methods are fire-and-forget safe — errors are logged, never thrown.
 * Uses service-role Supabase client for cross-team queries.
 */

import { resend, EMAIL_CONFIG, isResendConfigured } from '@/lib/email/resend-client'
import { logger } from '@/lib/logger'
import {
  calculateIndividualMrrCents,
  calculatePlatformMrrCents,
  formatEur,
  getPlanLabel,
} from './admin-mrr.helper'
import {
  buildAdminEmailHtml,
  separator,
  type AdminEventType,
} from './admin-email-builder'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// =============================================================================
// Types
// =============================================================================

interface SignupParams {
  firstName: string
  lastName: string
  email: string
  method: 'email' | 'oauth'
}

interface SubscriptionChangeParams {
  teamId: string
  teamName: string
  firstName: string
  lastName: string
  email: string
  oldLots: number
  newLots: number
  priceId: string | null
}

interface SubscriptionCancelledParams {
  teamId: string
  teamName: string
  firstName: string
  lastName: string
  email: string
  lotsLost: number
  priceId: string | null
  subscriptionStartDate: string | null
}

interface TrialExpiredParams {
  teamName: string
  firstName: string
  lastName: string
  email: string
  newStatus: 'free_tier' | 'read_only'
  lotCount: number
  trialStart: string | null
  interventionCount: number
}

// =============================================================================
// Recipients
// =============================================================================

const DEFAULT_ADMIN_EMAIL = 'arthur@seido-app.com'

function getSubjectPrefix(): string {
  const isProduction = process.env.NODE_ENV === 'production'
  return isProduction ? '[SEIDO]' : '[SEIDO-DEV]'
}

function getAdminRecipients(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAILS ?? ''
  const parsed = raw.split(',').map(e => e.trim()).filter(Boolean)
  return parsed.length > 0 ? parsed : [DEFAULT_ADMIN_EMAIL]
}

// =============================================================================
// Service
// =============================================================================

export class AdminNotificationService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  // ── Helpers ───────────────────────────────────────────────────────────

  private async sendHtml(to: string[], subject: string, html: string): Promise<void> {
    if (!isResendConfigured()) {
      logger.warn({ subject }, '[ADMIN-NOTIFY] Resend not configured — skipping')
      return
    }

    try {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject,
        html,
      })
      logger.info({ to, subject }, '[ADMIN-NOTIFY] Email sent')
    } catch (error) {
      logger.error({ error, subject }, '[ADMIN-NOTIFY] Failed to send email')
    }
  }

  private async getTotalUserCount(): Promise<number> {
    const { count } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    return count ?? 0
  }

  // ── 1. New Signup ─────────────────────────────────────────────────────

  async notifyNewSignup(params: SignupParams): Promise<void> {
    const recipients = getAdminRecipients()
    if (recipients.length === 0) return

    const { firstName, lastName, email, method } = params
    const fullName = `${firstName} ${lastName}`
    const totalUsers = await this.getTotalUserCount()
    const now = new Date()

    const html = buildAdminEmailHtml({
      eventType: 'signup',
      title: fullName,
      rows: [
        { label: 'Email', value: email },
        { label: 'Methode', value: method === 'oauth' ? 'Google OAuth' : 'Email' },
        { label: 'Date', value: now.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) },
        separator(),
        { label: 'Total utilisateurs', value: String(totalUsers), bold: true },
      ],
    })

    const subject = `${getSubjectPrefix()} 🟢 Nouvel inscrit — ${fullName}`
    await this.sendHtml(recipients, subject, html)
  }

  // ── 2. Subscription Change ────────────────────────────────────────────

  async notifySubscriptionChange(params: SubscriptionChangeParams): Promise<void> {
    const recipients = getAdminRecipients()
    if (recipients.length === 0) return

    const { teamName, firstName, lastName, email, oldLots, newLots, priceId } = params
    const fullName = `${firstName} ${lastName}`
    const delta = newLots - oldLots
    const isUpgrade = delta > 0
    const isNew = oldLots === 0

    const eventType: AdminEventType = isUpgrade ? 'subscription_upgrade' : 'subscription_downgrade'

    const newMrr = calculateIndividualMrrCents(newLots, priceId)
    const oldMrr = calculateIndividualMrrCents(oldLots, priceId)
    const deltaMrr = newMrr - oldMrr
    const platformMrr = await calculatePlatformMrrCents(this.supabase)

    const lotsLabel = isNew
      ? `${newLots} lots`
      : `${oldLots} → ${newLots} (${delta > 0 ? '+' : ''}${delta})`

    const html = buildAdminEmailHtml({
      eventType,
      title: fullName,
      rows: [
        { label: 'Email', value: email },
        { label: 'Equipe', value: teamName },
        { label: 'Plan', value: getPlanLabel(priceId) },
        { label: 'Lots', value: lotsLabel },
        separator(),
        { label: 'MRR individuel', value: `${formatEur(newMrr)} €`, bold: true },
        { label: 'ARR individuel', value: `${formatEur(newMrr * 12)} €` },
        { label: 'Delta MRR', value: `${deltaMrr >= 0 ? '+' : ''}${formatEur(deltaMrr)} €`, bold: true },
        separator(),
        { label: 'MRR plateforme', value: `${formatEur(platformMrr)} €`, bold: true },
        { label: 'ARR plateforme', value: `${formatEur(platformMrr * 12)} €`, bold: true },
      ],
    })

    const sign = deltaMrr >= 0 ? '+' : ''
    const deltaLabel = delta > 0 ? `+${delta}` : String(delta)
    const prefix = getSubjectPrefix()
    const subject = isNew
      ? `${prefix} 🔵 +${formatEur(deltaMrr)}€ MRR — ${fullName} (${newLots} lots)`
      : `${prefix} ${isUpgrade ? '🔵' : '🟠'} ${sign}${formatEur(deltaMrr)}€ MRR — ${fullName} (${deltaLabel} lots)`

    await this.sendHtml(recipients, subject, html)
  }

  // ── 3. Subscription Cancelled ─────────────────────────────────────────

  async notifySubscriptionCancelled(params: SubscriptionCancelledParams): Promise<void> {
    const recipients = getAdminRecipients()
    if (recipients.length === 0) return

    const { teamName, firstName, lastName, email, lotsLost, priceId, subscriptionStartDate } = params
    const fullName = `${firstName} ${lastName}`

    const lostMrr = calculateIndividualMrrCents(lotsLost, priceId)
    const platformMrr = await calculatePlatformMrrCents(this.supabase)

    // Calculate subscription duration
    let durationLabel = 'Inconnue'
    if (subscriptionStartDate) {
      const start = new Date(subscriptionStartDate)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const months = Math.floor(days / 30)
      const remainingDays = days % 30
      durationLabel = months > 0
        ? `${months} mois ${remainingDays} jours`
        : `${days} jours`
    }

    const html = buildAdminEmailHtml({
      eventType: 'subscription_cancelled',
      title: fullName,
      rows: [
        { label: 'Email', value: email },
        { label: 'Equipe', value: teamName },
        { label: 'Plan perdu', value: `${getPlanLabel(priceId)}, ${lotsLost} lots` },
        { label: "Duree d'abonnement", value: durationLabel },
        separator(),
        { label: 'MRR perdu', value: `-${formatEur(lostMrr)} €`, bold: true },
        { label: 'ARR perdu', value: `-${formatEur(lostMrr * 12)} €` },
        separator(),
        { label: 'MRR plateforme', value: `${formatEur(platformMrr)} €`, bold: true },
        { label: 'ARR plateforme', value: `${formatEur(platformMrr * 12)} €`, bold: true },
      ],
    })

    const subject = `${getSubjectPrefix()} 🔴 -${formatEur(lostMrr)}€ MRR — Churn ${fullName}`
    await this.sendHtml(recipients, subject, html)
  }

  // ── 4. Trial Expired ──────────────────────────────────────────────────

  async notifyTrialExpired(params: TrialExpiredParams): Promise<void> {
    const recipients = getAdminRecipients()
    if (recipients.length === 0) return

    const { teamName, firstName, lastName, email, newStatus, lotCount, trialStart, interventionCount } = params
    const fullName = `${firstName} ${lastName}`

    // Calculate usage duration
    let durationLabel = '30 jours'
    if (trialStart) {
      const start = new Date(trialStart)
      const now = new Date()
      const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      durationLabel = `${days} jours`
    }

    const statusLabel = newStatus === 'free_tier'
      ? 'free_tier (≤2 lots)'
      : 'read_only (>2 lots)'

    const html = buildAdminEmailHtml({
      eventType: 'trial_expired',
      title: fullName,
      rows: [
        { label: 'Email', value: email },
        { label: 'Equipe', value: teamName },
        { label: 'Nouveau statut', value: statusLabel, bold: true },
        { label: "Lots a l'expiration", value: String(lotCount) },
        { label: "Duree d'utilisation", value: durationLabel },
        { label: 'Interventions creees', value: String(interventionCount) },
      ],
    })

    const subject = `${getSubjectPrefix()} ⚪ Trial expire — ${fullName} → ${newStatus}`
    await this.sendHtml(recipients, subject, html)
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an AdminNotificationService instance.
 * Requires a service-role Supabase client for cross-team MRR queries.
 */
export function createAdminNotificationService(
  supabase: SupabaseClient<Database>,
): AdminNotificationService {
  return new AdminNotificationService(supabase)
}
