'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CreditCard,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Shield,
  Loader2,
  Home,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PricingCard, type BillingInterval } from '@/components/billing/pricing-card'
import { FREE_TIER_LIMIT } from '@/lib/stripe'
import type { SubscriptionInfo } from '@/lib/services/domain/subscription.service'
import {
  getSubscriptionStatus,
  createCheckoutSessionAction,
  createPortalSessionAction,
  verifyCheckoutSession,
} from '@/app/actions/subscription-actions'

// =============================================================================
// Types
// =============================================================================

interface BillingPageClientProps {
  initialSubscriptionInfo: SubscriptionInfo | null
  teamName?: string // Kept for backwards compat — no longer displayed (topbar has title)
}

// =============================================================================
// Helpers
// =============================================================================

function getStatusBadge(status: SubscriptionInfo['status']) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Actif', variant: 'default' },
    trialing: { label: 'Essai gratuit', variant: 'secondary' },
    free_tier: { label: 'Gratuit', variant: 'outline' },
    past_due: { label: 'Paiement en retard', variant: 'destructive' },
    canceled: { label: 'Annul\u00e9', variant: 'destructive' },
    read_only: { label: 'Lecture seule', variant: 'destructive' },
    unpaid: { label: 'Impay\u00e9', variant: 'destructive' },
    incomplete: { label: 'Incomplet', variant: 'destructive' },
    incomplete_expired: { label: 'Expir\u00e9', variant: 'destructive' },
    paused: { label: 'En pause', variant: 'secondary' },
  }
  return map[status] ?? { label: status, variant: 'outline' as const }
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

export function BillingPageClient({ initialSubscriptionInfo }: BillingPageClientProps) {
  const searchParams = useSearchParams()
  const [info, setInfo] = useState<SubscriptionInfo | null>(initialSubscriptionInfo)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutVerified, setCheckoutVerified] = useState(false)
  const [lotCount, setLotCount] = useState(Math.max(initialSubscriptionInfo?.actual_lots ?? 1, 1))

  // ── Refresh subscription data ──────────────────────────────────────
  const refresh = useCallback(async () => {
    const result = await getSubscriptionStatus()
    if (result.success && result.data) {
      setInfo(result.data)
    }
  }, [])

  // ── Handle checkout return ─────────────────────────────────────────
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

  // ── Actions ────────────────────────────────────────────────────────
  const handleSelectPlan = async (interval: BillingInterval) => {
    if (!info) return
    setCheckoutLoading(true)
    try {
      const quantity = Math.max(lotCount, FREE_TIER_LIMIT + 1)
      const result = await createCheckoutSessionAction({ interval, quantity })
      if (result.success && result.data?.url) {
        window.location.href = result.data.url
      }
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleLotCountChange = (value: number) => {
    const clamped = Math.max(minLots, Math.min(1000, value))
    setLotCount(clamped)
  }

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

  // ── Derived state ──────────────────────────────────────────────────
  const isFreeTier = info?.is_free_tier ?? true
  const isTrialing = info?.status === 'trialing'
  const hasSubscription = info?.has_stripe_subscription ?? false
  const isReadOnly = info?.is_read_only ?? false
  const statusBadge = info ? getStatusBadge(info.status) : null
  const minLots = Math.max(info?.actual_lots ?? 1, 1)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Checkout success banner */}
      {checkoutVerified && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Paiement confirm&eacute; !</p>
            <p className="text-xs text-green-700 dark:text-green-400">Votre abonnement est maintenant actif.</p>
          </div>
        </div>
      )}

      {/* Read-only warning */}
      {isReadOnly && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Acc&egrave;s en lecture seule</p>
            <p className="text-xs text-red-700 dark:text-red-400">
              Votre p&eacute;riode d&apos;essai a expir&eacute;. Souscrivez un abonnement pour retrouver l&apos;acc&egrave;s complet.
            </p>
          </div>
        </div>
      )}

      {/* ── Subscription Status Card ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Votre abonnement</CardTitle>
            </div>
            {statusBadge && (
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            )}
          </div>
          {info?.cancel_at_period_end && (
            <CardDescription className="text-orange-600 dark:text-orange-400">
              Annulation pr&eacute;vue &mdash; Acc&egrave;s jusqu&apos;au {formatDate(info.current_period_end)}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                Lots utilis&eacute;s
              </div>
              <p className="text-lg font-semibold">
                {info?.actual_lots ?? 0}
                {info?.subscribed_lots ? (
                  <span className="text-sm text-muted-foreground font-normal">
                    /{info.subscribed_lots}
                  </span>
                ) : null}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                Plan
              </div>
              <p className="text-lg font-semibold">
                {isFreeTier ? 'Gratuit' : hasSubscription ? 'Pro' : isTrialing ? 'Essai' : '\u2014'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {isTrialing ? 'Fin d\u2019essai' : 'Prochain renouvellement'}
              </div>
              <p className="text-lg font-semibold">
                {isTrialing ? formatDate(info?.trial_end ?? null) : formatDate(info?.current_period_end ?? null)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {isTrialing ? 'Jours restants' : 'Statut'}
              </div>
              <p className="text-lg font-semibold">
                {isTrialing && info?.days_left_trial != null ? (
                  <span className={info.days_left_trial <= 7 ? 'text-orange-600' : ''}>
                    {info.days_left_trial}j
                  </span>
                ) : (
                  statusBadge?.label ?? '\u2014'
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {hasSubscription && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Pricing / Upgrade Section ─────────────────────────────────── */}
      {!hasSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choisir un plan</CardTitle>
            <CardDescription>
              {isTrialing
                ? `Votre essai gratuit se termine ${info?.days_left_trial != null ? `dans ${info.days_left_trial} jours` : 'bient\u00f4t'}. Choisissez un plan pour continuer.`
                : isFreeTier
                  ? `Passez \u00e0 Pro pour g\u00e9rer plus de ${FREE_TIER_LIMIT} lots.`
                  : 'S\u00e9lectionnez un plan adapt\u00e9 \u00e0 vos besoins.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ── Lot count selector ──────────────────────────────────── */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Nombre de biens</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={lotCount}
                        onChange={(e) => handleLotCountChange(parseInt(e.target.value) || minLots)}
                        min={minLots}
                        max={1000}
                        className="w-20 h-8 text-center text-sm font-bold"
                      />
                      <span className="text-sm text-muted-foreground">lots</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {minLots > FREE_TIER_LIMIT
                      ? <>Minimum : {minLots} lots (vos biens actuels)</>
                      : <>1-{FREE_TIER_LIMIT} biens = gratuit &agrave; vie</>}
                  </p>
                </div>
              </div>
              <Slider
                value={[lotCount]}
                onValueChange={(v) => handleLotCountChange(v[0])}
                min={minLots}
                max={1000}
                step={1}
                className="w-full"
              />
              {lotCount >= 1000 && (
                <p className="text-sm text-primary font-medium mt-3">
                  1000+ biens ? Contactez-nous &agrave; support@seido.be pour une offre personnalis&eacute;e.
                </p>
              )}
            </div>

            {/* ── Pricing cards side by side ──────────────────────────── */}
            <PricingCard
              lotCount={lotCount}
              onSelectPlan={handleSelectPlan}
              loading={checkoutLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Upgrade Section (for existing subscribers) ────────────────── */}
      {hasSubscription && !info?.cancel_at_period_end && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mettre &agrave; niveau</CardTitle>
            <CardDescription>
              Ajoutez plus de lots &agrave; votre abonnement actuel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              G&eacute;rer depuis le portail Stripe
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Modifiez la quantit&eacute; de lots, le plan ou t&eacute;l&eacute;chargez vos factures.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Invoices via Stripe Portal ────────────────────────────────── */}
      {hasSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Factures
            </CardTitle>
            <CardDescription>
              Acc&eacute;dez &agrave; vos factures et re&ccedil;us via le portail Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              Voir mes factures
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <p className="text-xs text-center text-muted-foreground pb-4">
        Tous les prix sont indiqu&eacute;s HT. TVA 21% applicable pour la Belgique.
        <br />
        Questions ? Contactez-nous &agrave; support@seido.be
      </p>
    </div>
  )
}
