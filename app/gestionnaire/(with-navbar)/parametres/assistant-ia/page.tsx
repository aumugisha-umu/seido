/**
 * AI Assistant Settings — SSR Pre-fetch
 *
 * Server Component fetches AI subscription status,
 * then passes to client component for interactions.
 * Suspense boundary required because AssistantIaSettingsClient uses useSearchParams().
 */

import { Suspense } from 'react'
import { getServerAuthContext } from '@/lib/server-context'
import {
  getAiSubscriptionStatus,
  type AiSubscriptionInfo,
} from '@/app/actions/ai-subscription-actions'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { AssistantIaSettingsClient } from './assistant-ia-settings-client'

export default async function AssistantIaPage() {
  await getServerAuthContext('gestionnaire')

  const result = await getAiSubscriptionStatus()

  const subscriptionInfo: AiSubscriptionInfo = result.success && result.data
    ? result.data
    : {
        isActive: false,
        tier: null,
        phoneNumber: null,
        minutesUsed: 0,
        minutesIncluded: 0,
        callsCount: 0,
        customInstructions: null,
        autoTopup: false,
        stripeSubscriptionId: null,
        provisioningStatus: null,
        provisioningError: null,
        subscriptionStatus: null,
        trialEnd: null,
        billingInterval: null,
      }

  return (
    <Suspense fallback={<PageSkeleton variant="cards" />}>
      <AssistantIaSettingsClient subscriptionInfo={subscriptionInfo} />
    </Suspense>
  )
}
