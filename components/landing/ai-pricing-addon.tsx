'use client'

import { CheckCircle2, Sparkles, Phone, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { BillingInterval } from '@/lib/stripe'

interface AiPricingAddonProps {
  billingInterval: BillingInterval
  className?: string
}

const AI_TIERS = [
  {
    name: 'Particulier',
    headline: 'WhatsApp uniquement',
    monthlyPrice: 49,
    annualPrice: 499,
    minutes: 0,
    conversations: 100,
    topupPrice: '0,80',
    topupConvPrice: '0,47',
    hasVoice: false,
    anchor: null,
    features: [
      'Assistant IA disponible 24h/24',
      'Demandes WhatsApp traitées automatiquement',
      'Interventions créées sans effort',
      'Recharge automatique disponible',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    headline: 'WhatsApp, SMS & voix',
    monthlyPrice: 99,
    annualPrice: 999,
    minutes: 180,
    conversations: 300,
    topupPrice: '0,55',
    topupConvPrice: '0,32',
    hasVoice: true,
    anchor: 'Tout Particulier, plus :',
    features: [
      'SMS pour locataires sans smartphone',
      'Appels vocaux entrants',
      'Instructions personnalisées par équipe',
      'Recharge automatique disponible',
    ],
    popular: true,
  },
  {
    name: 'Agence',
    headline: 'Tous canaux + numéro dédié',
    monthlyPrice: 199,
    annualPrice: 1999,
    minutes: 600,
    conversations: 1000,
    topupPrice: '0,33',
    topupConvPrice: '0,19',
    hasVoice: true,
    anchor: 'Tout Pro, plus :',
    features: [
      'Numéro dédié à votre agence',
      'Emails triés et convertis en interventions',
      'Recharge automatique disponible',
      'Support prioritaire',
    ],
    popular: false,
  },
] as const

export function AiPricingAddon({ billingInterval, className }: AiPricingAddonProps) {
  const isAnnual = billingInterval === 'year'

  return (
    <div className={cn("mt-16", className)}>
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 border border-violet-500/30 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-violet-400">Addon</span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Assistant IA
        </h3>
        <p className="text-white/60 max-w-xl mx-auto">
          Ajoutez l&apos;intelligence artificielle à votre gestion. Vos locataires contactent l&apos;IA, elle crée les interventions pour vous.
        </p>
      </div>

      {/* Tier cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {AI_TIERS.map((tier) => {
          const price = isAnnual ? tier.annualPrice : tier.monthlyPrice
          const priceLabel = isAnnual ? '/an' : '/mois'
          const monthlyEquiv = isAnnual ? Math.round(tier.annualPrice / 12) : null

          return (
            <div
              key={tier.name}
              className={cn(
                "relative p-6 rounded-2xl border flex flex-col transition-all duration-300 hover:scale-[1.02]",
                tier.popular
                  ? "bg-[#1e293b]/80 border-violet-500/50 shadow-[0_0_40px_rgba(139,92,246,0.15)] hover:shadow-[0_0_60px_rgba(139,92,246,0.25)]"
                  : "bg-[#1e293b]/50 border-white/10 hover:bg-[#1e293b]/70"
              )}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-400 rounded-full text-xs font-medium tracking-wider uppercase text-white">
                    Populaire
                  </span>
                </div>
              )}

              {/* Tier name + headline */}
              <p className="text-sm font-medium text-violet-400 mb-1">{tier.name}</p>
              <p className="text-white/60 text-sm mb-4">{tier.headline}</p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-white">{price}€</span>
                <span className="text-white/60">{priceLabel}</span>
              </div>
              {monthlyEquiv && (
                <p className="text-sm text-violet-300 mb-4">
                  soit {monthlyEquiv}€/mois
                </p>
              )}
              {!monthlyEquiv && <div className="mb-4" />}

              {/* Quotas */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <MessageSquare className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <span className="text-sm text-white">
                    <strong>{tier.conversations}</strong> conversations
                  </span>
                  <span className="text-xs text-white/50 ml-auto">
                    +{tier.topupConvPrice}€/conv
                  </span>
                </div>
                {tier.hasVoice && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Phone className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span className="text-sm text-white">
                      <strong>{tier.minutes} min</strong> d&apos;appels
                    </span>
                    <span className="text-xs text-white/50 ml-auto">
                      +{tier.topupPrice}€/min
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-grow">
                {tier.anchor && (
                  <li className="text-sm font-medium text-violet-300 mb-1">
                    {tier.anchor}
                  </li>
                )}
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-white/80">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href="/auth/signup" className="w-full mt-auto">
                <Button className={cn(
                  "w-full border-0 transition-all hover:scale-105",
                  tier.popular
                    ? "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-lg shadow-violet-500/25"
                    : "bg-white/10 hover:bg-white/20 text-white"
                )}>
                  Souscrire
                </Button>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
