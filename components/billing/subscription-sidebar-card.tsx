'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, Building2, Lock, Plus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSidebar } from '@/components/ui/sidebar'
import { useSubscription } from '@/hooks/use-subscription'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { cn } from '@/lib/utils'
import { FREE_TIER_LIMIT } from '@/lib/stripe'
import type { SubscriptionStatus } from '@/lib/services/domain/subscription.service'

// =============================================================================
// Helpers
// =============================================================================

function getPlanLabel(
  isFreeTier: boolean,
  hasStripeSubscription: boolean,
  status: SubscriptionStatus | undefined,
  billingInterval: 'month' | 'year' | null,
): string {
  if (isFreeTier) return 'Gratuit'
  if (status === 'trialing') return 'Essai'
  if (!hasStripeSubscription) return 'Gratuit'
  if (billingInterval === 'month') return 'Mensuel'
  if (billingInterval === 'year') return 'Annuel'
  return 'Payant'
}

function getStatusDotColor(status: SubscriptionStatus | undefined, isOverage: boolean): string {
  if (isOverage) return 'bg-amber-500'
  if (!status) return 'bg-gray-400'
  switch (status) {
    case 'active': return 'bg-green-500'
    case 'trialing': return 'bg-blue-500'
    case 'past_due':
    case 'canceled':
    case 'read_only':
    case 'unpaid':
    case 'incomplete_expired': return 'bg-red-500'
    case 'paused': return 'bg-yellow-500'
    case 'free_tier': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

// =============================================================================
// Component
// =============================================================================

export function SubscriptionSidebarCard() {
  const { state } = useSidebar()
  const router = useRouter()
  const isCollapsed = state === 'collapsed'
  const {
    status,
    loading,
    isFreeTier,
    hasStripeSubscription,
    billingInterval,
    daysLeftTrial,
    refresh,
  } = useSubscription()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  const planLabel = getPlanLabel(isFreeTier, hasStripeSubscription, status?.status, billingInterval)
  const actualLots = status?.actual_lots ?? 0
  const subscribedLots = status?.subscribed_lots ?? 0

  // Trial overage: trialing with more lots than free tier allows
  const isTrialing = status?.status === 'trialing'
  const isOverage = isTrialing && actualLots > FREE_TIER_LIMIT
  const lockedCount = isOverage ? actualLots - FREE_TIER_LIMIT : 0

  // maxLots: trial (no overage) has no limit shown; overage shows X/2; others show subscribed or free tier
  const maxLots = isFreeTier ? FREE_TIER_LIMIT : subscribedLots || actualLots
  const usagePercent = maxLots > 0 ? Math.min(100, Math.round((actualLots / maxLots) * 100)) : 0

  // Days text for overage warning
  const daysText = daysLeftTrial != null && daysLeftTrial > 0
    ? `Dans ${daysLeftTrial}j`
    : 'Bientôt'

  // ── Collapsed: icon with tooltip ──────────────────────────────────────
  if (isCollapsed) {
    if (loading) {
      return (
        <div className="flex justify-center py-2">
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      )
    }

    const tooltipText = isOverage
      ? `Essai — ${actualLots}/${FREE_TIER_LIMIT} lots — ${lockedCount} seront verrouillés`
      : isTrialing
        ? `Essai — ${actualLots} lot${actualLots !== 1 ? 's' : ''}`
        : `Abonnement: ${planLabel} — ${actualLots}/${maxLots} lots`

    return (
      <div className="flex justify-center py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/gestionnaire/parametres"
              className="relative flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <CreditCard className="size-5" />
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar',
                  getStatusDotColor(status?.status, isOverage),
                )}
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  // ── Expanded: compact card ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-2 rounded-lg bg-sidebar-accent/50 p-3 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    )
  }

  // ── Trial overage variant: amber alert card with CTA ──────────────────
  if (isOverage) {
    return (
      <div className="mx-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
        {/* Row 1: Plan label + status dot */}
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-amber-700 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300 truncate">
            {planLabel}
          </span>
          <span className="ml-auto h-2 w-2 rounded-full flex-shrink-0 bg-amber-500" />
        </div>

        {/* Row 2: Lot count */}
        <div className="mt-1.5 flex items-center gap-2">
          <Building2 className="size-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {actualLots}/{FREE_TIER_LIMIT} lots
          </span>
        </div>

        {/* Row 3: Warning message */}
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
          <Lock className="size-3 flex-shrink-0" />
          {daysText}, {lockedCount} lot{lockedCount > 1 ? 's' : ''} verrouillé{lockedCount > 1 ? 's' : ''}
        </p>

        {/* Row 4: CTA button */}
        <Button
          size="sm"
          className="mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
          onClick={() => router.push('/gestionnaire/settings/billing')}
        >
          S&apos;abonner
        </Button>
      </div>
    )
  }

  // ── Default variant: normal card ──────────────────────────────────────
  const showAddLotsButton = hasStripeSubscription && !isTrialing && !isFreeTier

  return (
    <>
      <div className="group mx-2 rounded-lg bg-sidebar-accent/50 p-3 transition-colors hover:bg-sidebar-accent">
        <Link href="/gestionnaire/parametres" className="block">
          {/* Row 1: Plan label + status dot */}
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-sidebar-foreground/60 flex-shrink-0" />
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              {planLabel}
            </span>
            <span
              className={cn(
                'ml-auto h-2 w-2 rounded-full flex-shrink-0',
                getStatusDotColor(status?.status, false),
              )}
            />
          </div>

          {/* Row 2: Lot count */}
          <div className="mt-1.5 flex items-center gap-2">
            <Building2 className="size-3.5 text-sidebar-foreground/50 flex-shrink-0" />
            <span className="text-xs text-sidebar-foreground/70">
              {isTrialing ? `${actualLots} lot${actualLots !== 1 ? 's' : ''}` : `${actualLots}/${maxLots} lots`}
            </span>
          </div>

          {/* Row 3: Progress bar (hidden during trial — no limit) */}
          {!isTrialing && (
            <Progress
              value={usagePercent}
              className="mt-2 h-1.5 bg-sidebar-foreground/10"
            />
          )}
        </Link>

        {/* Row 4: Add lots button (active paid subscriptions only) */}
        {showAddLotsButton && (
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-sidebar-foreground/60 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground transition-colors"
          >
            <Plus className="size-3.5" />
            Ajouter des lots
          </button>
        )}
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentLots={actualLots}
        subscribedLots={subscribedLots}
        onUpgradeComplete={refresh}
      />
    </>
  )
}
