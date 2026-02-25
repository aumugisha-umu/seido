'use client'

import { TrialBanner } from '@/components/billing/trial-banner'
import { TrialOverageBanner } from '@/components/billing/trial-overage-banner'
import { ReadOnlyBanner } from '@/components/billing/read-only-banner'
import { FREE_TIER_LIMIT } from '@/lib/stripe'
import type { SubscriptionInfo } from '@/lib/services/domain/subscription.service'

interface SubscriptionBannersProps {
  subscriptionInfo: SubscriptionInfo | null
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  activeTeamsCount?: number
}

/**
 * Renders the appropriate subscription banner based on priority:
 * 1. ReadOnlyBanner (highest — trial expired, account restricted)
 * 2. TrialOverageBanner (trialing with >FREE_TIER_LIMIT lots — warns about upcoming restriction)
 * 3. TrialBanner (trialing, last 7 days countdown)
 */
export function SubscriptionBanners({ subscriptionInfo, role, activeTeamsCount }: SubscriptionBannersProps) {
  if (!subscriptionInfo) return null

  // Priority 1: Read-only takes precedence over everything
  if (subscriptionInfo.is_read_only) {
    return <ReadOnlyBanner role={role} className="mx-4 mt-2" />
  }

  // Priority 2: Trial overage — trialing with lots exceeding free tier limit
  if (subscriptionInfo.status === 'trialing' && subscriptionInfo.actual_lots > FREE_TIER_LIMIT) {
    return (
      <TrialOverageBanner
        actualLots={subscriptionInfo.actual_lots}
        daysLeft={subscriptionInfo.days_left_trial}
        className="mx-4 mt-2"
      />
    )
  }

  // Priority 3: Standard trial countdown (last 7 days)
  if (subscriptionInfo.status === 'trialing') {
    return <TrialBanner daysLeft={subscriptionInfo.days_left_trial} activeTeamsCount={activeTeamsCount} className="mx-4 mt-2" />
  }

  return null
}
