'use client'

import { TrialBanner } from '@/components/billing/trial-banner'
import { ReadOnlyBanner } from '@/components/billing/read-only-banner'
import type { SubscriptionInfo } from '@/lib/services/domain/subscription.service'

interface SubscriptionBannersProps {
  subscriptionInfo: SubscriptionInfo | null
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  interventionCount?: number
}

/**
 * Renders the appropriate subscription banner based on priority:
 * 1. ReadOnlyBanner (highest — trial expired, account restricted)
 * 2. TrialBanner (trialing, last 7 days countdown with enriched messaging)
 */
export function SubscriptionBanners({ subscriptionInfo, role, interventionCount }: SubscriptionBannersProps) {
  if (!subscriptionInfo) return null

  // Priority 1: Read-only takes precedence over everything
  if (subscriptionInfo.is_read_only) {
    return <ReadOnlyBanner role={role} lotCount={subscriptionInfo.actual_lots} className="mx-4 mt-2" />
  }

  // Priority 2: Standard trial countdown (last 7 days) — gestionnaire admin only
  if (subscriptionInfo.status === 'trialing' && role === 'gestionnaire') {
    return (
      <TrialBanner
        daysLeft={subscriptionInfo.days_left_trial}
        paymentMethodAdded={subscriptionInfo.payment_method_added}
        trialEndDate={subscriptionInfo.trial_end}
        lotCount={subscriptionInfo.actual_lots}
        interventionCount={interventionCount ?? 0}
        className="mx-4 mt-2"
      />
    )
  }

  return null
}
