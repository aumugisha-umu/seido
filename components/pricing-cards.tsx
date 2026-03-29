"use client"

import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { BillingInterval } from "@/lib/stripe"

interface PricingCardsProps {
  variant?: 'light' | 'dark'
  disabled?: boolean
  showButtons?: boolean
  lotCount?: number
  className?: string
  billingInterval: BillingInterval
}

/**
 * Single pricing card for the Gestion immobilière subscription.
 * Renders monthly or annual pricing based on billingInterval.
 * Used on both landing page (dark) and settings page (light).
 */
export function PricingCards({
  variant = 'dark',
  disabled = false,
  showButtons = true,
  lotCount = 3,
  className,
  billingInterval,
}: PricingCardsProps) {
  const isLight = variant === 'light'
  const isAnnual = billingInterval === 'year'

  const FREE_TIER_LIMIT = 2
  const isFreeTier = lotCount <= FREE_TIER_LIMIT

  const monthlyTotal = isFreeTier ? 0 : lotCount * 5
  const annualTotal = isFreeTier ? 0 : lotCount * 50
  const annualSavings = isFreeTier ? 0 : lotCount * 10

  const unitPrice = isAnnual ? '50€' : '5€'
  const unitLabel = isAnnual ? '/lot/an' : '/lot/mois'
  const total = isAnnual ? annualTotal : monthlyTotal
  const totalLabel = isAnnual ? '/an' : '/mois'

  const colors = {
    title: isLight ? 'text-foreground' : 'text-white',
    price: isLight ? 'text-foreground' : 'text-white',
    subtitle: isLight ? 'text-muted-foreground' : 'text-white/60',
    body: isLight ? 'text-muted-foreground' : 'text-white/80',
    green: isLight ? 'text-green-600' : 'text-green-400',
    check: isLight
      ? (isAnnual ? 'text-blue-600' : 'text-green-600')
      : (isAnnual ? 'text-blue-400' : 'text-green-400'),
    blue: isLight ? 'text-blue-600' : 'text-blue-300',
    blueCaption: isLight ? 'text-blue-700' : 'text-blue-300',
    cardBg: isLight
      ? (isAnnual ? 'bg-blue-50/50' : 'bg-card')
      : (isAnnual ? 'bg-[#1e293b]/80' : 'bg-[#1e293b]/50'),
    badgeBg: isLight ? 'bg-muted' : 'bg-white/10',
    border: isLight
      ? (isAnnual ? 'border-blue-200' : 'border-border')
      : (isAnnual ? 'border-blue-500/50' : 'border-white/10'),
    borderBottom: isLight
      ? (isAnnual ? 'border-blue-200' : 'border-border')
      : (isAnnual ? 'border-blue-500/30' : 'border-white/10'),
    shadow: isAnnual
      ? (isLight ? 'shadow-lg shadow-blue-100' : 'shadow-[0_0_40px_rgba(59,130,246,0.15)]')
      : '',
    shadowHover: isAnnual
      ? (isLight ? 'hover:shadow-xl hover:shadow-blue-200' : 'hover:shadow-[0_0_60px_rgba(59,130,246,0.25)]')
      : '',
    btn: isAnnual
      ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25'
      : (isLight ? 'bg-muted hover:bg-muted/80 text-foreground' : 'bg-white/10 hover:bg-white/20 text-white'),
  }

  return (
    <div className={cn(
      "max-w-lg mx-auto",
      disabled && "opacity-50 pointer-events-none select-none",
      className
    )}>
      <div className={cn(
        "relative p-6 md:p-8 rounded-3xl flex flex-col transition-all duration-300 border",
        colors.cardBg,
        colors.border,
        colors.shadow,
        !disabled && colors.shadowHover,
        !disabled && "hover:scale-[1.02]"
      )}>
        {/* Badges */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase border",
            colors.badgeBg, isLight ? 'border-border' : 'border-white/10', colors.body
          )}>
            Après essai gratuit
          </span>
          {isAnnual && (
            <span className={cn(
              "px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-xs font-medium tracking-wider uppercase text-white whitespace-nowrap",
              !disabled && "animate-pulse"
            )}>
              Import Pro Offert
            </span>
          )}
        </div>

        <h3 className={cn("text-xl font-semibold mb-2 mt-2", colors.title)}>
          Gestion immobilière
        </h3>

        <div className="flex items-baseline gap-1 mb-1">
          {isFreeTier ? (
            <span className={cn("text-4xl font-bold", colors.green)}>Gratuit</span>
          ) : (
            <>
              <span className={cn("text-4xl font-bold", colors.price)}>{unitPrice}</span>
              <span className={colors.subtitle}>{unitLabel}</span>
            </>
          )}
        </div>

        <p className={cn("text-sm mb-2", colors.subtitle)}>
          {isFreeTier ? (
            <span>1-2 biens = <span className={cn("font-semibold", colors.green)}>gratuit à vie</span></span>
          ) : (
            <>Total : <span className={cn("font-semibold", colors.title)}>{total}€{totalLabel}</span> pour {lotCount} lots</>
          )}
        </p>

        {!isFreeTier && isAnnual ? (
          <p className={cn("text-sm mb-4", colors.blue)}>
            Économisez {annualSavings}€ vs mensuel
          </p>
        ) : (
          <div className="mb-4" />
        )}

        <ul className="space-y-3 mb-6">
          <li className={cn("flex items-center", colors.body)}>
            <CheckCircle2 className={cn("w-5 h-5 mr-3 flex-shrink-0", colors.check)} />
            Importez vos données Excel
          </li>
          <li className={cn("flex items-center", isAnnual ? colors.title : colors.body)}>
            <CheckCircle2 className={cn("w-5 h-5 mr-3 flex-shrink-0", colors.check)} />
            {isAnnual ? <strong>Service d&apos;import pro inclus</strong> : 'Support 5/7'}
          </li>
          <li className={cn("flex items-center", colors.body)}>
            <CheckCircle2 className={cn("w-5 h-5 mr-3 flex-shrink-0", colors.check)} />
            {isAnnual ? 'Support prioritaire 7/7' : 'Résiliation en 1 clic'}
          </li>
        </ul>

        {isAnnual && (
          <div className={cn("pt-4 border-t mb-6", colors.borderBottom)}>
            <p className={cn("text-sm", colors.blueCaption)}>
              Notre équipe migre vos données (valeur jusqu&apos;à 2000€)
            </p>
          </div>
        )}

        {showButtons && (
          <Link href="/auth/signup" className="w-full mt-auto">
            <Button className={cn(
              "w-full border-0 transition-all",
              colors.btn,
              !disabled && "hover:scale-105"
            )}>
              Démarrer mon essai gratuit
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
