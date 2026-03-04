'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CreditCard,
  ArrowRight,
  Clock,
  AlertTriangle,
  Building2,
  Loader2,
  Calendar,
  Shield,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { SubscriptionInfo } from '@/lib/services/domain/subscription.service'
import {
  getSubscriptionStatus,
  createPortalSessionAction,
  verifyCheckoutSession,
} from '@/app/actions/subscription-actions'
import { UpgradeModal } from '@/components/billing/upgrade-modal'

// =============================================================================
// Helpers
// =============================================================================

function getStatusConfig(status: SubscriptionInfo['status']) {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: 'Actif', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    trialing: { label: 'Essai gratuit', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    free_tier: { label: 'Gratuit', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
    past_due: { label: 'Paiement en retard', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    canceled: { label: 'Annul\u00e9', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    read_only: { label: 'Lecture seule', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    unpaid: { label: 'Impay\u00e9', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    paused: { label: 'En pause', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  }
  return map[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// =============================================================================
// Component
// =============================================================================

export function SubscriptionSummaryCard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [info, setInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutVerified, setCheckoutVerified] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getSubscriptionStatus()
      if (result.success) {
        setInfo(result.data ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    refresh()
  }, [refresh])

  // Handle checkout return (session_id in URL)
  useEffect(() => {
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')
    if (checkout === 'success' && sessionId) {
      verifyCheckoutSession(sessionId).then((result) => {
        if (result.success && result.data?.verified) {
          setCheckoutVerified(true)
          refresh()
        }
      })
    }
  }, [searchParams, refresh])

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const result = await createPortalSessionAction()
      if (result.success && result.data?.url) {
        window.location.href = result.data.url
      }
    } finally {
      setPortalLoading(false)
    }
  }

  const isTrialing = info?.status === 'trialing'
  const isReadOnly = info?.is_read_only ?? false
  const isFreeTier = info?.is_free_tier ?? true
  const hasSubscription = info?.has_stripe_subscription ?? false
  const statusConfig = info ? getStatusConfig(info.status) : null

  // Derive plan label from billing interval
  const planLabel = isFreeTier
    ? 'Gratuit'
    : isTrialing
      ? 'Essai'
      : !hasSubscription
        ? 'Gratuit'
        : info?.billing_interval === 'month'
          ? 'Mensuel'
          : info?.billing_interval === 'year'
            ? 'Annuel'
            : 'Payant'

  return (
    <>
      <Card className="relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Abonnement
            </CardTitle>
            {statusConfig && (
              <Badge className={cn('border-0', statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <CardDescription>
            G&eacute;rez votre abonnement et consultez vos factures.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Checkout success banner */}
              {checkoutVerified && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Paiement confirm&eacute; !</p>
                    <p className="text-xs text-green-700 dark:text-green-400">Votre abonnement est maintenant actif.</p>
                  </div>
                </div>
              )}

              {/* Read-only warning */}
              {isReadOnly && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Acc&egrave;s en lecture seule. Souscrivez un plan pour retrouver l&apos;acc&egrave;s complet.
                  </p>
                </div>
              )}

              {/* Cancel pending warning */}
              {info?.cancel_at_period_end && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    Annulation pr&eacute;vue &mdash; Acc&egrave;s jusqu&apos;au {formatDate(info.current_period_end)}
                  </p>
                </div>
              )}

              {/* Metrics grid — 4 columns like billing page */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Lots utilis&eacute;s
                  </p>
                  <p className="text-lg font-semibold">
                    {info?.actual_lots ?? 0}
                    {info?.subscribed_lots ? (
                      <span className="text-sm text-muted-foreground font-normal">/{info.subscribed_lots}</span>
                    ) : null}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Plan
                  </p>
                  <p className="text-lg font-semibold">
                    {planLabel}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {isTrialing ? 'Fin d\u2019essai' : 'Renouvellement'}
                  </p>
                  <p className="text-lg font-semibold">
                    {isTrialing ? formatDate(info?.trial_end ?? null) : formatDate(info?.current_period_end ?? null)}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isTrialing ? 'Jours restants' : 'Statut'}
                  </p>
                  <p className={cn(
                    'text-lg font-semibold',
                    isTrialing && info?.days_left_trial != null && info.days_left_trial <= 7 && 'text-orange-600',
                    isTrialing && info?.days_left_trial != null && info.days_left_trial <= 3 && 'text-red-600',
                  )}>
                    {isTrialing && info?.days_left_trial != null
                      ? `${info.days_left_trial}j`
                      : statusConfig?.label ?? '\u2014'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Manage subscription — for existing subscribers */}
                {hasSubscription && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    G&eacute;rer mon abonnement
                  </Button>
                )}

                {/* Add lots — for subscribers or free tier users */}
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (hasSubscription) {
                        setUpgradeModalOpen(true)
                      } else {
                        router.push('/gestionnaire/settings/billing')
                      }
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {hasSubscription ? 'Ajouter des lots' : 'Choisir un plan'}
                  </Button>
                )}

                {/* Invoices — Stripe portal */}
                {hasSubscription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Factures
                  </Button>
                )}
              </div>

              {/* Trial CTA */}
              {isTrialing && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push('/gestionnaire/settings/billing')}
                >
                  Choisir un plan
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}

              {/* Read-only CTA */}
              {isReadOnly && (
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => router.push('/gestionnaire/settings/billing')}
                >
                  R&eacute;activer mon compte
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentLots={info?.actual_lots ?? 0}
        subscribedLots={info?.subscribed_lots}
        onUpgradeComplete={() => {
          setUpgradeModalOpen(false)
          refresh()
        }}
      />
    </>
  )
}
