"use client"

import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface PricingCardsProps {
  variant?: 'light' | 'dark'
  disabled?: boolean
  showButtons?: boolean
  lotCount?: number
  className?: string
}

/**
 * Composant PricingCards réutilisable
 *
 * Affiche les deux offres d'abonnement (Mensuel/Annuel) avec le design
 * exact de la landing page, adapté pour les modes light et dark.
 *
 * @param variant - 'dark' pour landing page, 'light' pour settings
 * @param disabled - Grise les cards (pour beta gratuite)
 * @param showButtons - Affiche ou masque les boutons CTA
 */
export function PricingCards({
  variant = 'dark',
  disabled = false,
  showButtons = true,
  lotCount = 3,
  className
}: PricingCardsProps) {
  const isLight = variant === 'light'

  // Seuil gratuit : 1-2 biens = gratuit
  const FREE_TIER_LIMIT = 2
  const isFreeTier = lotCount <= FREE_TIER_LIMIT

  // Calcul des prix totaux (0€ si gratuit, sinon prix normal)
  const monthlyTotal = isFreeTier ? 0 : lotCount * 5
  const annualTotal = isFreeTier ? 0 : lotCount * 50
  const annualSavings = isFreeTier ? 0 : lotCount * 10 // Économie vs mensuel (2 mois)

  // Couleurs conditionnelles selon le variant
  const colors = {
    // Textes
    title: isLight ? 'text-foreground' : 'text-white',
    price: isLight ? 'text-foreground' : 'text-white',
    subtitle: isLight ? 'text-muted-foreground' : 'text-white/60',
    body: isLight ? 'text-muted-foreground' : 'text-white/80',
    caption: isLight ? 'text-muted-foreground/70' : 'text-white/50',

    // Couleurs d'accent
    green: isLight ? 'text-green-600' : 'text-green-400',
    greenCheck: isLight ? 'text-green-600' : 'text-green-400',
    blue: isLight ? 'text-blue-600' : 'text-blue-300',
    blueCheck: isLight ? 'text-blue-600' : 'text-blue-400',
    blueCaption: isLight ? 'text-blue-700' : 'text-blue-300',

    // Backgrounds
    cardBg: isLight ? 'bg-card' : 'bg-[#1e293b]/50',
    cardBgHover: isLight ? 'hover:bg-muted/50' : 'hover:bg-[#1e293b]/70',
    cardBgAnnual: isLight ? 'bg-blue-50/50' : 'bg-[#1e293b]/80',
    badgeBg: isLight ? 'bg-muted' : 'bg-white/10',

    // Borders
    border: isLight ? 'border-border' : 'border-white/10',
    borderAnnual: isLight ? 'border-blue-200' : 'border-blue-500/50',
    borderBottom: isLight ? 'border-border' : 'border-white/10',
    borderBottomBlue: isLight ? 'border-blue-200' : 'border-blue-500/30',

    // Shadows
    shadowAnnual: isLight
      ? 'shadow-lg shadow-blue-100'
      : 'shadow-[0_0_40px_rgba(59,130,246,0.15)]',
    shadowAnnualHover: isLight
      ? 'hover:shadow-xl hover:shadow-blue-200'
      : 'hover:shadow-[0_0_60px_rgba(59,130,246,0.25)]',

    // Buttons
    btnMonthly: isLight
      ? 'bg-muted hover:bg-muted/80 text-foreground'
      : 'bg-white/10 hover:bg-white/20 text-white',
    btnAnnual: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25',
  }

  return (
    <div className={cn(
      "grid md:grid-cols-2 gap-6",
      disabled && "opacity-50 pointer-events-none select-none",
      className
    )}>
      {/* Card Mensuel */}
      <div className={cn(
        "p-6 md:p-8 rounded-3xl border flex flex-col h-full relative transition-all duration-300",
        colors.cardBg,
        colors.cardBgHover,
        colors.border,
        !disabled && "hover:scale-[1.02]"
      )}>
        {/* Badge "Après essai gratuit" */}
        <div className={cn(
          "absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase border",
          colors.badgeBg,
          colors.border,
          colors.body
        )}>
          Après essai gratuit
        </div>

        <h3 className={cn("text-xl font-semibold mb-2 mt-2", colors.title)}>
          Mensuel
        </h3>

        <div className="flex items-baseline gap-1 mb-1">
          {isFreeTier ? (
            <span className={cn("text-4xl font-bold", colors.green)}>Gratuit</span>
          ) : (
            <>
              <span className={cn("text-4xl font-bold", colors.price)}>5€</span>
              <span className={colors.subtitle}>/lot/mois</span>
            </>
          )}
        </div>
        <p className={cn("text-sm mb-2", colors.subtitle)}>
          {isFreeTier ? (
            <span>1-2 biens = <span className={cn("font-semibold", colors.green)}>gratuit à vie</span></span>
          ) : (
            <>Total : <span className={cn("font-semibold", colors.title)}>{monthlyTotal}€/mois</span> pour {lotCount} lots</>
          )}
        </p>

        {/* Spacer pour aligner avec la card Annuel qui a "Économisez X€" */}
        {!isFreeTier && <p className={cn("text-sm mb-6 invisible", colors.subtitle)}>Placeholder</p>}
        {isFreeTier && <div className="mb-6" />}

        <ul className="space-y-3 mb-6 flex-grow">
          <li className={cn("flex items-center", colors.body)}>
            <CheckCircle2 className={cn("w-5 h-5 mr-3 flex-shrink-0", colors.greenCheck)} />
            Importez vos données Excel
          </li>
          <li className={cn("flex items-center", colors.body)}>
            <CheckCircle2 className={cn("w-5 h-5 mr-3 flex-shrink-0", colors.greenCheck)} />
            Support 5/7
          </li>
        </ul>

        <div className={cn("pt-4 border-t mb-6", colors.borderBottom)}>
          <p className={cn("text-sm", colors.caption)}>
            Service d'import pro disponible : 500€/jour
          </p>
        </div>

        {showButtons && (
          <Link href="/auth/signup" className="w-full mt-auto">
            <Button className={cn(
              "w-full border-0 transition-all",
              colors.btnMonthly,
              !disabled && "hover:scale-105"
            )}>
              Démarrer mon essai gratuit
            </Button>
          </Link>
        )}
      </div>

      {/* Card Annuel - Avec glow */}
      <div className={cn(
        "relative p-6 md:p-8 rounded-3xl flex flex-col h-full transition-all duration-300 border",
        colors.cardBgAnnual,
        colors.borderAnnual,
        colors.shadowAnnual,
        !disabled && colors.shadowAnnualHover,
        !disabled && "hover:scale-[1.02]"
      )}>
        {/* Double badges centrés */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
          <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full text-xs font-medium tracking-wider uppercase text-white flex items-center justify-center text-center">
            Populaire
          </span>
          <span className={cn(
            "px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-xs font-medium tracking-wider uppercase text-white flex items-center justify-center text-center whitespace-nowrap",
            !disabled && "animate-pulse"
          )}>
            Import Pro Offert
          </span>
        </div>

        <h3 className={cn("text-xl font-semibold mb-2 mt-2", colors.title)}>
          Annuel
        </h3>

        <div className="flex items-baseline gap-1 mb-1">
          {isFreeTier ? (
            <span className={cn("text-4xl font-bold", colors.green)}>Gratuit</span>
          ) : (
            <>
              <span className={cn("text-4xl font-bold", colors.price)}>50€</span>
              <span className={colors.subtitle}>/lot/an</span>
            </>
          )}
        </div>
        <p className={cn("text-sm mb-2", colors.subtitle)}>
          {isFreeTier ? (
            <span>1-2 biens = <span className={cn("font-semibold", colors.green)}>gratuit à vie</span></span>
          ) : (
            <>Total : <span className={cn("font-semibold", colors.title)}>{annualTotal}€/an</span> pour {lotCount} lots</>
          )}
        </p>

        {!isFreeTier && (
          <p className={cn("text-sm mb-6", colors.blue)}>
            Économisez {annualSavings}€ vs mensuel
          </p>
        )}
        {isFreeTier && <div className="mb-6" />}

        <ul className="space-y-3 mb-6 flex-grow">
          <li className={cn("flex items-center", colors.title)}>
            <CheckCircle2 className={cn("w-5 h-5 mr-3 flex-shrink-0", colors.blueCheck)} />
            <span><strong>Service d'import pro inclus</strong></span>
          </li>
          <li className={cn("flex items-center", colors.body)}>
            <CheckCircle2 className={cn("w-5 h-5 mr-3 flex-shrink-0", colors.blueCheck)} />
            Support prioritaire 7/7
          </li>
        </ul>

        <div className={cn("pt-4 border-t mb-6", colors.borderBottomBlue)}>
          <p className={cn("text-sm", colors.blueCaption)}>
            Notre équipe migre vos données (valeur jusqu'à 2000€)
          </p>
        </div>

        {showButtons && (
          <Link href="/auth/signup" className="w-full mt-auto">
            <Button className={cn(
              "w-full border-0 transition-all",
              colors.btnAnnual,
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
