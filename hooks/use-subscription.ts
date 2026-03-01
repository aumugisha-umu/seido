'use client'

/**
 * Hook useSubscription — Client-side subscription state management
 *
 * Provides reactive subscription status with caching and refresh capability.
 * Calls server actions to fetch data, avoiding direct DB queries from client.
 *
 * @example
 * const { status, loading, error, refresh, canAddProperty, isReadOnly } = useSubscription()
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getSubscriptionStatus,
  checkCanAddProperty as checkCanAddPropertyAction,
  checkHasPaymentMethod as checkHasPaymentMethodAction,
} from '@/app/actions/subscription-actions'
import type { SubscriptionInfo, CanAddPropertyResult } from '@/lib/services/domain/subscription.service'

// =============================================================================
// Types
// =============================================================================

export interface UseSubscriptionReturn {
  /** Full subscription info (null if not loaded or no subscription) */
  status: SubscriptionInfo | null
  /** True while loading */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Convenience: true when error is non-null */
  hasError: boolean
  /** Force re-fetch from server */
  refresh: () => Promise<void>
  /** Derived: can the team add a property? */
  canAddProperty: boolean
  /** Derived: is the account in read-only mode? */
  isReadOnly: boolean
  /** Derived: is the team on free tier? */
  isFreeTier: boolean
  /** Derived: does the team have a Stripe subscription? */
  hasStripeSubscription: boolean
  /** Derived: days left in trial (null if not trialing) */
  daysLeftTrial: number | null
  /** Derived: billing interval ('month' | 'year' | null) */
  billingInterval: 'month' | 'year' | null
  /** Check if team can add property (calls server action) */
  checkCanAddProperty: () => Promise<CanAddPropertyResult | null>
  /** Check if team has payment method (calls server action) */
  checkHasPaymentMethod: () => Promise<boolean>
}

// =============================================================================
// Hook
// =============================================================================

export function useSubscription(): UseSubscriptionReturn {
  const [status, setStatus] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSubscriptionStatus()
      if (result.success) {
        setStatus(result.data ?? null)
      } else {
        setError(result.error ?? 'Failed to load subscription')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch — only once
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchStatus()
    }
  }, [fetchStatus])

  const refresh = useCallback(async () => {
    await fetchStatus()
  }, [fetchStatus])

  const checkCanAddProperty = useCallback(async (): Promise<CanAddPropertyResult | null> => {
    try {
      const result = await checkCanAddPropertyAction()
      if (result.success && result.data) {
        return result.data
      }
      return null
    } catch {
      return null
    }
  }, [])

  const checkHasPaymentMethod = useCallback(async (): Promise<boolean> => {
    try {
      const result = await checkHasPaymentMethodAction()
      if (result.success && result.data !== undefined) {
        return result.data
      }
      return false
    } catch {
      return false
    }
  }, [])

  return {
    status,
    loading,
    error,
    hasError: error !== null,
    refresh,
    canAddProperty: status?.can_add_property ?? false,
    isReadOnly: status?.is_read_only ?? false,
    isFreeTier: status?.is_free_tier ?? false,
    hasStripeSubscription: status?.has_stripe_subscription ?? false,
    daysLeftTrial: status?.days_left_trial ?? null,
    billingInterval: status?.billing_interval ?? null,
    checkCanAddProperty,
    checkHasPaymentMethod,
  }
}
