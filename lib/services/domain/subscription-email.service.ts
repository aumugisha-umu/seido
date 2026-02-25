/**
 * Subscription Email Service
 *
 * Orchestrates sending billing-related emails (trial lifecycle, payments, activation).
 * Uses EmailService.send() with React Email templates from emails/templates/billing/.
 *
 * Called by:
 * - CRON routes (trial notifications, expiration, win-back)
 * - Webhook handler (payment failed, subscription activated)
 * - Trial initialization (welcome)
 */

import React from 'react'
import { EmailService } from './email.service'
import { TrialWelcomeEmail } from '@/emails/templates/billing/trial-welcome'
import { FeatureEngagementEmail } from '@/emails/templates/billing/feature-engagement'
import { ValueReportEmail } from '@/emails/templates/billing/value-report'
import { TrialEndingEmail } from '@/emails/templates/billing/trial-ending'
import { TrialExpiredEmail } from '@/emails/templates/billing/trial-expired'
import { WinBackEmail } from '@/emails/templates/billing/win-back'
import { PaymentFailedEmail } from '@/emails/templates/billing/payment-failed'
import { SubscriptionActivatedEmail } from '@/emails/templates/billing/subscription-activated'
import { calculatePrice, calculateAnnualSavings } from '@/lib/stripe'
import type {
  TrialWelcomeEmailProps,
  FeatureEngagementEmailProps,
  ValueReportEmailProps,
  TrialEndingEmailProps,
  TrialExpiredEmailProps,
  WinBackEmailProps,
  PaymentFailedEmailProps,
  SubscriptionActivatedEmailProps,
} from '@/emails/utils/types'
import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

interface SendResult {
  success: boolean
  emailId?: string
  error?: string
}

// =============================================================================
// Service
// =============================================================================

export class SubscriptionEmailService {
  constructor(private emailService: EmailService) {}

  private async send(
    to: string,
    subject: string,
    react: React.ReactElement,
    tag: string,
  ): Promise<SendResult> {
    try {
      const result = await this.emailService.send({
        to,
        subject,
        react,
        tags: [{ name: 'category', value: 'billing' }, { name: 'type', value: tag }],
      })
      return result
    } catch (error) {
      logger.error({ error, to, tag }, '[SUB-EMAIL] Failed to send billing email')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' }
    }
  }

  // ---------------------------------------------------------------------------
  // Trial lifecycle emails
  // ---------------------------------------------------------------------------

  /** J+1: Welcome email after trial starts */
  async sendTrialWelcome(to: string, props: Omit<TrialWelcomeEmailProps, 'billingUrl'>): Promise<SendResult> {
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/settings/billing`
    return this.send(
      to,
      'Bienvenue sur SEIDO !',
      React.createElement(TrialWelcomeEmail, { ...props, billingUrl }),
      'trial_welcome',
    )
  }

  /** J+7: Feature engagement email */
  async sendFeatureEngagement(to: string, props: Omit<FeatureEngagementEmailProps, 'billingUrl'>): Promise<SendResult> {
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/settings/billing`
    return this.send(
      to,
      'Votre premiere semaine avec SEIDO',
      React.createElement(FeatureEngagementEmail, { ...props, billingUrl }),
      'feature_engagement',
    )
  }

  /** J+14: Value report email */
  async sendValueReport(to: string, props: Omit<ValueReportEmailProps, 'billingUrl'>): Promise<SendResult> {
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/settings/billing`
    return this.send(
      to,
      'Votre rapport de valeur SEIDO',
      React.createElement(ValueReportEmail, { ...props, billingUrl }),
      'value_report',
    )
  }

  /** J-7 / J-3 / J-1: Trial ending warning */
  async sendTrialEnding(to: string, props: Omit<TrialEndingEmailProps, 'billingUrl' | 'annualPriceHT' | 'monthlyPriceHT' | 'annualSavings'> & { lotCount: number }): Promise<SendResult> {
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/settings/billing`
    // Calculate prices from lot count (convert from cents to EUR)
    const annualPriceHT = calculatePrice(props.lotCount, 'year') / 100
    const monthlyPriceHT = calculatePrice(props.lotCount, 'month') / 100
    const annualSavings = calculateAnnualSavings(props.lotCount) / 100

    const subjectMap: Record<number, string> = {
      7: `Votre essai SEIDO se termine dans 7 jours`,
      3: `Plus que 3 jours d'essai SEIDO`,
      1: `Dernier jour de votre essai SEIDO`,
    }
    const subject = subjectMap[props.daysLeft] || `Votre essai se termine dans ${props.daysLeft} jours`

    return this.send(
      to,
      subject,
      React.createElement(TrialEndingEmail, {
        ...props,
        billingUrl,
        annualPriceHT,
        monthlyPriceHT,
        annualSavings,
      }),
      `trial_ending_${props.daysLeft}`,
    )
  }

  /** J+0: Trial expired */
  async sendTrialExpired(to: string, props: Omit<TrialExpiredEmailProps, 'billingUrl'>): Promise<SendResult> {
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/settings/billing`
    return this.send(
      to,
      'Votre essai SEIDO est termine',
      React.createElement(TrialExpiredEmail, { ...props, billingUrl }),
      'trial_expired',
    )
  }

  /** J+3 post-expiry: Win-back (read_only users only) */
  async sendWinBack(to: string, props: Omit<WinBackEmailProps, 'billingUrl'>): Promise<SendResult> {
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/settings/billing`
    return this.send(
      to,
      'Vos donnees vous attendent sur SEIDO',
      React.createElement(WinBackEmail, { ...props, billingUrl }),
      'win_back',
    )
  }

  // ---------------------------------------------------------------------------
  // Payment emails
  // ---------------------------------------------------------------------------

  /** Payment failed (from webhook: invoice.payment_failed) */
  async sendPaymentFailed(to: string, props: Omit<PaymentFailedEmailProps, 'billingUrl'>): Promise<SendResult> {
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/settings/billing`
    return this.send(
      to,
      props.attemptCount >= 3 ? 'Action requise : paiement echoue' : 'Paiement echoue — mettez a jour votre moyen de paiement',
      React.createElement(PaymentFailedEmail, { ...props, billingUrl }),
      'payment_failed',
    )
  }

  /** Subscription activated (from webhook: checkout.session.completed) */
  async sendSubscriptionActivated(to: string, props: Omit<SubscriptionActivatedEmailProps, 'billingUrl' | 'dashboardUrl'>): Promise<SendResult> {
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/settings/billing`
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/dashboard`
    return this.send(
      to,
      'Votre abonnement SEIDO est actif !',
      React.createElement(SubscriptionActivatedEmail, { ...props, billingUrl, dashboardUrl }),
      'subscription_activated',
    )
  }
}

// =============================================================================
// Factory
// =============================================================================

let _instance: SubscriptionEmailService | null = null

export function getSubscriptionEmailService(): SubscriptionEmailService {
  if (!_instance) {
    _instance = new SubscriptionEmailService(new EmailService())
  }
  return _instance
}
