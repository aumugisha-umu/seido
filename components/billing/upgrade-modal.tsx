'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, TrendingUp, CreditCard, CheckCircle2, Minus, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PricingCard, type BillingInterval } from '@/components/billing/pricing-card'
import {
  checkHasPaymentMethod,
  upgradeSubscription,
  getUpgradePreview,
  createCheckoutSessionAction,
} from '@/app/actions/subscription-actions'
import type { UpgradePreview } from '@/lib/services/domain/subscription.service'
import { FREE_TIER_LIMIT } from '@/lib/stripe'

// =============================================================================
// Types
// =============================================================================

export interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLots: number
  subscribedLots?: number
  onUpgradeComplete?: () => void
}

// =============================================================================
// Helpers
// =============================================================================

function centsToEuros(cents: number): string {
  const euros = cents / 100
  return euros % 1 === 0 ? `${euros}` : euros.toFixed(2)
}

// =============================================================================
// Component
// =============================================================================

export function UpgradeModal({
  open,
  onOpenChange,
  currentLots,
  subscribedLots,
  onUpgradeComplete,
}: UpgradeModalProps) {
  const [mode, setMode] = useState<'loading' | 'inline' | 'checkout'>('loading')
  const [additionalLots, setAdditionalLots] = useState(1)
  const [preview, setPreview] = useState<UpgradePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect mode on open: check if user has a payment method
  useEffect(() => {
    if (!open) {
      setSuccess(false)
      setError(null)
      setAdditionalLots(1)
      setPreview(null)
      return
    }

    setMode('loading')
    checkHasPaymentMethod().then(async (result) => {
      if (result.success && result.data) {
        // Mode A: Card saved -> inline upgrade
        setMode('inline')
        await fetchPreview(1)
      } else {
        // Mode B: No card -> redirect to checkout
        setMode('checkout')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Fetch preview with debounce
  const fetchPreview = useCallback(async (lots: number) => {
    setPreviewLoading(true)
    try {
      const previewResult = await getUpgradePreview(lots)
      if (previewResult.success && previewResult.data) {
        setPreview(previewResult.data)
      }
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const handleQuantityChange = (newValue: number) => {
    const clamped = Math.max(1, newValue)
    setAdditionalLots(clamped)

    // Debounce preview fetch (300ms)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPreview(clamped)
    }, 300)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Mode A: Inline upgrade (card saved) ────────────────────────────
  const handleInlineUpgrade = async () => {
    setUpgrading(true)
    setError(null)
    try {
      const result = await upgradeSubscription(additionalLots)
      if (result.success) {
        setSuccess(true)
        onUpgradeComplete?.()
      } else {
        setError(result.error ?? 'Erreur lors de la mise \u00e0 niveau')
      }
    } catch {
      setError('Erreur inattendue')
    } finally {
      setUpgrading(false)
    }
  }

  // ── Mode B: Checkout redirect ──────────────────────────────────────
  const handleCheckout = async (interval: BillingInterval) => {
    setUpgrading(true)
    try {
      const quantity = Math.max(currentLots + additionalLots, FREE_TIER_LIMIT + 1)
      const result = await createCheckoutSessionAction({ interval, quantity })
      if (result.success && result.data?.url) {
        window.location.href = result.data.url
      } else {
        setError(result.error ?? 'Erreur lors de la cr\u00e9ation du checkout')
      }
    } finally {
      setUpgrading(false)
    }
  }

  const limitLabel = subscribedLots
    ? `${currentLots}/${subscribedLots}`
    : `${currentLots}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {success ? 'Mise \u00e0 niveau r\u00e9ussie !' : 'Ajouter des lots'}
          </DialogTitle>
          <DialogDescription>
            {success
              ? 'Votre abonnement a \u00e9t\u00e9 mis \u00e0 jour.'
              : `Vous utilisez ${limitLabel} lots. Ajoutez des lots suppl\u00e9mentaires \u00e0 votre abonnement.`}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {mode === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm text-muted-foreground">
              +{additionalLots} lot{additionalLots > 1 ? 's' : ''} ajout&eacute;{additionalLots > 1 ? 's' : ''} &agrave; votre abonnement.
            </p>
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          </div>
        )}

        {/* Mode A: Inline upgrade with preview */}
        {mode === 'inline' && !success && (
          <div className="space-y-4 py-2">
            {/* Quantity selector */}
            <div className="rounded-lg border p-4">
              <label className="text-sm font-medium text-foreground mb-3 block">
                Lots suppl&eacute;mentaires
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleQuantityChange(additionalLots - 1)}
                  disabled={additionalLots <= 1 || upgrading}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={additionalLots}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-20 h-9 text-center text-lg font-bold"
                  disabled={upgrading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleQuantityChange(additionalLots + 1)}
                  disabled={upgrading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-1">
                  lot{additionalLots > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Price preview */}
            {(preview || previewLoading) && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 relative">
                {previewLoading && (
                  <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {preview && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lots utilises / inclus</span>
                      <span className="font-medium">{preview.current_lots} / {preview.subscribed_lots}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Apr&egrave;s mise &agrave; niveau</span>
                      <span className="font-medium text-blue-600">{preview.current_lots} / {preview.new_lots}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prorata aujourd&apos;hui</span>
                        <span className="font-semibold">{centsToEuros(preview.proration_amount)}&euro; HT</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">
                          R&eacute;current ({preview.interval === 'year' ? 'an' : 'mois'})
                        </span>
                        <span className="text-muted-foreground">
                          +{centsToEuros(preview.recurring_change)}&euro; HT
                        </span>
                      </div>
                    </div>
                    {preview.is_estimate && (
                      <p className="text-xs text-muted-foreground/70 italic">
                        * Montant estim&eacute;. Le montant exact sera calcul&eacute; par Stripe.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleInlineUpgrade}
                disabled={upgrading || previewLoading}
              >
                {upgrading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Ajouter {additionalLots} lot{additionalLots > 1 ? 's' : ''}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={upgrading}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Mode B: Checkout redirect */}
        {mode === 'checkout' && !success && (
          <div className="space-y-4 py-2">
            {/* Quantity selector for checkout too */}
            <div className="rounded-lg border p-4">
              <label className="text-sm font-medium text-foreground mb-3 block">
                Nombre de lots souhait&eacute;s
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleQuantityChange(additionalLots - 1)}
                  disabled={additionalLots <= 1 || upgrading}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={additionalLots}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-20 h-9 text-center text-lg font-bold"
                  disabled={upgrading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleQuantityChange(additionalLots + 1)}
                  disabled={upgrading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-1">
                  lot{additionalLots > 1 ? 's' : ''} suppl&eacute;mentaire{additionalLots > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total apr&egrave;s upgrade : {currentLots + additionalLots} lots
              </p>
            </div>

            <PricingCard
              lotCount={currentLots + additionalLots}
              onSelectPlan={handleCheckout}
              loading={upgrading}
            />

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
