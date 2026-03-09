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
import { AssistantIaSettingsClient } from './assistant-ia-settings-client'

function LoadingFallback() {
  return (
    <div className="layout-padding">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-lg text-muted-foreground">Chargement...</p>
      </div>
    </div>
  )
}

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
      }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AssistantIaSettingsClient subscriptionInfo={subscriptionInfo} />
    </Suspense>
  )
}
