'use client'

import { useState } from 'react'
import { CheckCircle2, Sparkles, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { calculatePrice, calculateAnnualSavings, centsToEuros, FREE_TIER_LIMIT } from '@/lib/stripe'

// =============================================================================
// Types
// =============================================================================

export type BillingInterval = 'annual' | 'monthly'

export interface PricingCardProps {
  lotCount: number
  onSelectPlan?: (interval: BillingInterval) => void
  loading?: boolean
  currentInterval?: BillingInterval | null
  className?: string
}

// =============================================================================
// Helpers (cents → display)
// =============================================================================

function formatSavingsPercent(): string {
  // Annual = 50€/lot/year, Monthly = 5€/lot/month = 60€/lot/year → savings = 10/60 ≈ 17%
  return '17%'
}

// =============================================================================
// Component
// =============================================================================

export function PricingCard({
  lotCount,
  onSelectPlan,
  loading = false,
  currentInterval = null,
  className,
}: PricingCardProps) {
  const [hovered, setHovered] = useState<BillingInterval | null>(null)

  const isFreeTier = lotCount <= FREE_TIER_LIMIT

  // Prices in cents
  const annualTotalCents = calculatePrice(lotCount, 'year')
  const monthlyTotalCents = calculatePrice(lotCount, 'month')
  const savingsCents = calculateAnnualSavings(lotCount)

  // Per-lot prices for display
  const annualPerLotDisplay = '50'  // €50/lot/year HT
  const monthlyPerLotDisplay = '5'  // €5/lot/month HT

  // Monthly equivalent of annual plan
  const annualMonthlyEquivalent = isFreeTier ? '0' : centsToEuros(Math.round(annualTotalCents / 12))

  return (
    <div className={cn('grid md:grid-cols-2 gap-6', className)}>
      {/* ── Monthly Card (Secondary) ─────────────────────────────────── */}
      <Card
        className={cn(
          'relative overflow-hidden border transition-all duration-200 flex flex-col',
          hovered === 'monthly' && 'scale-[1.01]',
          currentInterval === 'monthly'
            ? 'border-border bg-muted/30'
            : 'border-border/70',
        )}
        onMouseEnter={() => setHovered('monthly')}
        onMouseLeave={() => setHovered(null)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Mensuel</h3>
              <p className="text-sm text-muted-foreground mt-1">Sans engagement</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex-1 flex flex-col">
          {/* Price display */}
          <div>
            {isFreeTier ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-green-600">Gratuit</span>
                <span className="text-sm text-muted-foreground ml-1">&le; {FREE_TIER_LIMIT} lots</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {monthlyPerLotDisplay}&euro;
                  </span>
                  <span className="text-muted-foreground">/lot/mois HT</span>
                </div>
              </>
            )}
          </div>

          {/* Dynamic total */}
          {!isFreeTier && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{lotCount} lots &times; {monthlyPerLotDisplay}&euro;</span>
                <span className="font-semibold text-foreground">{centsToEuros(monthlyTotalCents)}&euro; HT/mois</span>
              </div>
            </div>
          )}

          {/* Features */}
          <ul className="space-y-2">
            <li className="flex items-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
              Importez vos donn&eacute;es Excel
            </li>
            <li className="flex items-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
              Support 5/7
            </li>
          </ul>

          {/* Spacer to push button to bottom */}
          <div className="flex-1" />

          {/* CTA */}
          {onSelectPlan && (
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => onSelectPlan('monthly')}
              disabled={loading || currentInterval === 'monthly'}
            >
              {currentInterval === 'monthly' ? 'Plan actuel' : 'Choisir le mensuel'}
            </Button>
          )}

          {/* VAT mention */}
          <p className="text-xs text-center text-muted-foreground">
            Prix HT. TVA applicable en sus.
          </p>
        </CardContent>
      </Card>

      {/* ── Annual Card (Highlighted / Recommended) ────────────────────── */}
      <Card
        className={cn(
          'relative overflow-hidden border-2 transition-all duration-200 flex flex-col',
          hovered === 'annual' && 'scale-[1.01]',
          currentInterval === 'annual'
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
            : 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10',
        )}
        onMouseEnter={() => setHovered('annual')}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Recommended badge */}
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-blue-600 text-white hover:bg-blue-600 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3 w-3 mr-1" />
            Recommand&eacute;
          </Badge>
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between pr-24">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Annuel</h3>
              {!isFreeTier && (
                <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  &Eacute;conomisez {formatSavingsPercent()}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex-1 flex flex-col">
          {/* Price display */}
          <div>
            {isFreeTier ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-green-600">Gratuit</span>
                <span className="text-sm text-muted-foreground ml-1">&le; {FREE_TIER_LIMIT} lots</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {annualPerLotDisplay}&euro;
                  </span>
                  <span className="text-muted-foreground">/lot/an HT</span>
                </div>

                {/* Strikethrough monthly comparison */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground line-through">
                    {monthlyPerLotDisplay}&euro;/lot/mois
                  </span>
                  <span className="text-sm text-muted-foreground">&rarr;</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    ~{centsToEuros(Math.round(5000 / 12))}&euro;/lot/mois
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Dynamic total */}
          {!isFreeTier && (
            <div className="rounded-lg bg-blue-100/50 dark:bg-blue-900/20 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{lotCount} lots &times; {annualPerLotDisplay}&euro;</span>
                <span className="font-semibold text-foreground">{centsToEuros(annualTotalCents)}&euro; HT/an</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Soit par mois</span>
                <span className="text-muted-foreground">{annualMonthlyEquivalent}&euro;/mois</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-green-600 dark:text-green-400">
                <span>&Eacute;conomie vs mensuel</span>
                <span>-{centsToEuros(savingsCents)}&euro;/an</span>
              </div>
            </div>
          )}

          {/* Features */}
          <ul className="space-y-2">
            <li className="flex items-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
              <strong className="text-foreground">Service d&apos;import pro inclus</strong>
            </li>
            <li className="flex items-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
              Support prioritaire 7/7
            </li>
          </ul>

          {/* Spacer to push button to bottom */}
          <div className="flex-1" />

          {/* CTA */}
          {onSelectPlan && (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
              onClick={() => onSelectPlan('annual')}
              disabled={loading || currentInterval === 'annual'}
            >
              {currentInterval === 'annual' ? 'Plan actuel' : 'Choisir l\'annuel'}
            </Button>
          )}

          {/* VAT mention */}
          <p className="text-xs text-center text-muted-foreground">
            Prix HT. TVA applicable en sus.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
