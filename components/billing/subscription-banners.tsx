'use client'

import { TrialBanner } from '@/components/billing/trial-banner'
import { ReadOnlyBanner } from '@/components/billing/read-only-banner'
import type { SubscriptionInfo } from '@/lib/services/domain/subscription.service'

interface SubscriptionBannersProps {
  subscriptionInfo: SubscriptionInfo | null
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  activeTeamsCount?: number
}

/**
 * Renders the appropriate subscription banner based on priority:
 * 1. ReadOnlyBanner (highest — trial expired, account restricted)
 * 2. TrialBanner (trialing, last 7 days countdown)
 *
 * Note: Trial overage warning (lots > FREE_TIER_LIMIT) is now displayed
 * inside the sidebar SubscriptionSidebarCard instead of a top banner.
 */
export function SubscriptionBanners({ subscriptionInfo, role, activeTeamsCount }: SubscriptionBannersProps) {
  if (!subscriptionInfo) return null

  // Priority 1: Read-only takes precedence over everything
  if (subscriptionInfo.is_read_only) {
    return <ReadOnlyBanner role={role} className="mx-4 mt-2" />
  }

  // Priority 2: Standard trial countdown (last 7 days)
  if (subscriptionInfo.status === 'trialing') {
    return <TrialBanner daysLeft={subscriptionInfo.days_left_trial} activeTeamsCount={activeTeamsCount} className="mx-4 mt-2" />
  }

  return null
}
