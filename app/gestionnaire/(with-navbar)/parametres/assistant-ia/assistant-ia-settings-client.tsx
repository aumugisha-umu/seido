'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  verifyAiCheckoutSession,
  getProvisioningStatus,
  type AiSubscriptionInfo,
} from '@/app/actions/ai-subscription-actions'
import { ProvisioningProgress, ProvisioningFailed } from './ai-provisioning'
import { PricingSection } from './ai-pricing-section'
import { ActiveSubscription } from './ai-active-subscription'

// ============================================================================
// Main Orchestrator
// ============================================================================

export function AssistantIaSettingsClient({ subscriptionInfo }: { subscriptionInfo: AiSubscriptionInfo }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local state so we can update immediately after verification
  // without waiting for router.refresh() to complete
  const [localInfo, setLocalInfo] = useState<AiSubscriptionInfo>(subscriptionInfo)
  const [isVerifying, setIsVerifying] = useState(false)
  const [provisioningState, setProvisioningState] = useState<{
    status: string | null
    error: string | null
  }>({
    status: subscriptionInfo.provisioningStatus,
    error: subscriptionInfo.provisioningError,
  })

  // Sync props → local state when server data refreshes
  useEffect(() => {
    setLocalInfo(subscriptionInfo)
    setProvisioningState({
      status: subscriptionInfo.provisioningStatus,
      error: subscriptionInfo.provisioningError,
    })
  }, [subscriptionInfo])

  // Poll provisioning status when in an intermediate state
  const isProvisioning = provisioningState.status === 'purchasing'

  useEffect(() => {
    if (!isProvisioning) return

    const interval = setInterval(async () => {
      const result = await getProvisioningStatus()
      if (!result?.success || !result.data) return

      const { status, phoneNumber, error } = result.data

      setProvisioningState({ status, error })

      if (status === 'active') {
        clearInterval(interval)
        toast.success(
          phoneNumber
            ? `Assistant IA active ! Numero : ${phoneNumber}`
            : 'Assistant IA active avec succes !'
        )
        setLocalInfo((prev) => ({
          ...prev,
          isActive: true,
          phoneNumber: phoneNumber ?? prev.phoneNumber,
          provisioningStatus: 'active',
          provisioningError: null,
          tier: prev.tier || 'solo',
          minutesIncluded: prev.minutesIncluded || 60,
        }))
      } else if (status === 'failed') {
        clearInterval(interval)
        toast.error(error || 'Le provisioning a echoue')
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isProvisioning])

  // Handle checkout/topup return params
  useEffect(() => {
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')
    const topup = searchParams.get('topup')

    if (checkout === 'success' && sessionId) {
      // Verify checkout and trigger provisioning (webhook fallback for local dev)
      setIsVerifying(true)
      verifyAiCheckoutSession(sessionId)
        .then((result) => {
          if (!result) {
            toast.error('Erreur serveur — rechargez la page')
            return
          }
          if (result.success && result.data?.verified) {
            // Provisioning complete synchronously (manual mode)
            const phone = result.data.phoneNumber
            toast.success(
              phone
                ? `Assistant IA active ! Numero attribue : ${phone}`
                : 'Assistant IA active avec succes !'
            )
            setLocalInfo((prev) => ({
              ...prev,
              isActive: true,
              phoneNumber: phone ?? prev.phoneNumber,
              provisioningStatus: 'active',
              tier: prev.tier || 'solo',
              minutesIncluded: prev.minutesIncluded || 60,
            }))
          } else if (result.success && !result.data?.verified) {
            // Provisioning started but async (auto mode — polling will handle completion)
            setProvisioningState({ status: 'purchasing', error: null })
            toast.info('Configuration en cours... Veuillez patienter.')
          } else {
            toast.error(result.error || 'La verification du paiement a echoue')
          }
        })
        .catch(() => {
          toast.error('Erreur lors de la verification du paiement')
        })
        .finally(() => {
          setIsVerifying(false)
          window.history.replaceState(null, '', '/gestionnaire/parametres/assistant-ia')
        })
    } else if (checkout === 'cancelled') {
      toast.info('Paiement annule')
      router.replace('/gestionnaire/parametres/assistant-ia', { scroll: false })
    } else if (topup === 'success') {
      toast.success('Recharge effectuee avec succes !')
      router.refresh()
      window.history.replaceState(null, '', '/gestionnaire/parametres/assistant-ia')
    } else if (topup === 'cancelled') {
      toast.info('Recharge annulee')
      router.replace('/gestionnaire/parametres/assistant-ia', { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show provisioning progress (intermediate states)
  if (isVerifying || isProvisioning) {
    return <ProvisioningProgress status={provisioningState.status} />
  }

  // Show provisioning failure with retry
  if (provisioningState.status === 'failed') {
    return (
      <ProvisioningFailed
        error={provisioningState.error}
        onRetry={() => {
          setProvisioningState({ status: 'purchasing', error: null })
          router.refresh()
        }}
      />
    )
  }

  if (localInfo.isActive) {
    return <ActiveSubscription subscriptionInfo={localInfo} isPending={isPending} startTransition={startTransition} />
  }

  return (
    <PricingSection
      isPending={isPending}
      startTransition={startTransition}
      subscriptionStatus={localInfo.subscriptionStatus}
      trialEnd={localInfo.trialEnd}
      existingInterval={localInfo.billingInterval}
    />
  )
}
