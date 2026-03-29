'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Bot,
  MessageCircle,
  Phone,
  Mail,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  createAiCheckoutAction,
  previewAiAddonAction,
} from '@/app/actions/ai-subscription-actions'
import type { AiTier, BillingInterval } from '@/lib/stripe'
import { PRICING_TIERS } from './ai-constants'

// ============================================================================
// Channel definitions
// ============================================================================

const CHANNELS = [
  {
    key: 'messaging',
    label: 'WhatsApp & SMS',
    shortLabel: 'WhatsApp',
    icon: MessageCircle,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    availableFrom: 'solo' as AiTier,
  },
  {
    key: 'calls',
    label: 'Appels telephoniques',
    shortLabel: 'Appels',
    icon: Phone,
    colorClass: 'text-violet-600',
    bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    borderClass: 'border-violet-200 dark:border-violet-800',
    availableFrom: 'equipe' as AiTier,
  },
  {
    key: 'email',
    label: 'Emails intelligents',
    shortLabel: 'Emails',
    icon: Mail,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
    availableFrom: 'agence' as AiTier,
  },
]

const TIER_ORDER: AiTier[] = ['solo', 'equipe', 'agence']

const channelIncludedIn = (channelAvailableFrom: AiTier, cardTier: AiTier): boolean =>
  TIER_ORDER.indexOf(cardTier) >= TIER_ORDER.indexOf(channelAvailableFrom)

// ============================================================================
// Per-tier feature lists (channel-tagged for icon rendering)
// ============================================================================

const TIER_FEATURES: Record<AiTier, { text: string; channel: 'messaging' | 'calls' | 'email' | 'core' }[]> = {
  solo: [
    { text: 'Reponse automatique 24/7 WhatsApp & SMS', channel: 'messaging' },
    { text: 'Creation automatique d\'interventions', channel: 'messaging' },
    { text: '200 conversations / mois', channel: 'messaging' },
    { text: 'Assistant contextuel in-app', channel: 'core' },
  ],
  equipe: [
    { text: 'Tout le plan Solo inclus', channel: 'core' },
    { text: '500 conversations / mois', channel: 'messaging' },
    { text: '180 minutes d\'appels IA / mois', channel: 'calls' },
    { text: 'Instructions personnalisees', channel: 'calls' },
    { text: 'Support prioritaire', channel: 'core' },
  ],
  agence: [
    { text: 'Tout le plan Equipe inclus', channel: 'core' },
    { text: '1 500 conversations / mois', channel: 'messaging' },
    { text: '500 minutes d\'appels IA / mois', channel: 'calls' },
    { text: 'Auto-assignation des emails entrants', channel: 'email' },
    { text: 'Propositions de reponse email IA', channel: 'email' },
    { text: 'Creation d\'interventions depuis emails', channel: 'email' },
    { text: 'Account manager dedie', channel: 'core' },
  ],
}

const FeatureIcon = ({ channel }: { channel: 'messaging' | 'calls' | 'email' | 'core' }) => {
  if (channel === 'messaging') return <MessageCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
  if (channel === 'calls') return <Phone className="h-3.5 w-3.5 text-violet-600 mt-0.5 shrink-0" />
  if (channel === 'email') return <Mail className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
  return <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
}

// ============================================================================
// Component
// ============================================================================

export function PricingSection({
  isPending,
  startTransition,
  subscriptionStatus,
  trialEnd,
  existingInterval,
}: {
  isPending: boolean
  startTransition: React.TransitionStartFunction
  subscriptionStatus: string | null
  trialEnd: string | null
  existingInterval: BillingInterval | null
}) {
  const router = useRouter()
  const isTrial = subscriptionStatus === 'trialing'
  const isActiveSub = subscriptionStatus === 'active'

  const [billingInterval, setBillingInterval] = useState<BillingInterval>(existingInterval ?? 'month')

  // Confirmation modal state for active subscribers (proration preview)
  const [confirmTier, setConfirmTier] = useState<AiTier | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewAmount, setPreviewAmount] = useState<number | null>(null)
  const [previewCurrency, setPreviewCurrency] = useState('eur')
  const [actionLoading, setActionLoading] = useState(false)

  const handleSubscribe = (tier: AiTier) => {
    if (isActiveSub) {
      setConfirmTier(tier)
      setPreviewLoading(true)
      setPreviewAmount(null)
      previewAiAddonAction(tier)
        .then((result) => {
          if (result?.success && result.data) {
            setPreviewAmount(result.data.prorationAmount)
            setPreviewCurrency(result.data.currency)
          } else {
            toast.error(result?.error || 'Erreur lors de la previsualisation')
            setConfirmTier(null)
          }
        })
        .catch(() => {
          toast.error('Erreur lors de la previsualisation')
          setConfirmTier(null)
        })
        .finally(() => setPreviewLoading(false))
      return
    }

    startTransition(async () => {
      const result = await createAiCheckoutAction(tier, billingInterval)
      if (result?.success && result.data?.immediate) {
        toast.success('Assistant IA active avec succes !')
        router.refresh()
      } else if (result?.success && result.data?.url) {
        router.push(result.data.url)
      } else {
        toast.error(result?.error || 'Erreur lors de la souscription')
      }
    })
  }

  const handleConfirmAdd = () => {
    if (!confirmTier) return
    setActionLoading(true)
    startTransition(async () => {
      const result = await createAiCheckoutAction(confirmTier)
      setActionLoading(false)
      if (result?.success && result.data?.immediate) {
        toast.success('Assistant IA active avec succes !')
        setConfirmTier(null)
        router.refresh()
      } else if (result?.success && result.data?.url) {
        router.push(result.data.url)
      } else {
        toast.error(result?.error || 'Erreur lors de la souscription')
        setConfirmTier(null)
      }
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const trialEndFormatted = trialEnd
    ? new Date(trialEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="layout-padding">
      <div className="max-w-5xl mx-auto">

        {/* Header — back + title inline */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push('/gestionnaire/parametres')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Assistant IA</h1>
          </div>
          {/* Channel pills — inline in header */}
          <div className="hidden sm:flex items-center gap-1.5 ml-auto">
            {CHANNELS.map((ch) => {
              const Icon = ch.icon
              return (
                <div
                  key={ch.key}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${ch.bgClass} ${ch.borderClass}`}
                >
                  <Icon className={`h-3 w-3 ${ch.colorClass}`} />
                  <span>{ch.shortLabel}</span>
                  {ch.availableFrom !== 'solo' && (
                    <span className="text-[9px] text-muted-foreground">
                      {ch.availableFrom === 'equipe' ? 'Pro' : 'Agence'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Value prop — compact single line */}
        <div className="mb-6">
          <p className="text-muted-foreground max-w-2xl">
            Un assistant qui repond a vos locataires 24/7 — WhatsApp, SMS, appels et emails.
            Il cree les interventions, assigne les messages et vous envoie un resume complet.
          </p>
        </div>

        {/* Billing toggle + trial badge */}
        {isTrial && (
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-1 rounded-lg border bg-muted p-1 shrink-0">
              <button
                type="button"
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  billingInterval === 'month'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setBillingInterval('month')}
              >
                Mensuel
              </button>
              <button
                type="button"
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  billingInterval === 'year'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setBillingInterval('year')}
              >
                Annuel
                <Badge variant="secondary" className="ml-2 text-xs">
                  -17%
                </Badge>
              </button>
            </div>
            {trialEndFormatted && (
              <span className="text-sm text-muted-foreground">
                Essai gratuit jusqu&apos;au {trialEndFormatted}
              </span>
            )}
          </div>
        )}

        {/* Active sub interval notice */}
        {isActiveSub && existingInterval && (
          <p className="text-sm text-muted-foreground mb-6">
            Facturation {existingInterval === 'year' ? 'annuelle' : 'mensuelle'} — alignee sur votre abonnement principal.
          </p>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PRICING_TIERS.map((tier) => {
            const displayPrice = billingInterval === 'year' ? tier.annualPrice : tier.monthlyPrice
            const priceLabel = billingInterval === 'year' ? '/an' : '/mois'
            const monthlySaving = billingInterval === 'year'
              ? tier.monthlyPrice * 12 - tier.annualPrice
              : 0
            const features = TIER_FEATURES[tier.id]

            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${
                  tier.popular
                    ? 'border-primary shadow-md ring-1 ring-primary/20'
                    : 'border-border'
                }`}
              >
                {tier.popular && (
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-primary" />
                )}

                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    {tier.popular && (
                      <Badge className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Populaire
                      </Badge>
                    )}
                  </div>

                  {/* Channel dots — visual tier progression */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {CHANNELS.map((ch) => {
                      const included = channelIncludedIn(ch.availableFrom, tier.id)
                      const Icon = ch.icon
                      return (
                        <div
                          key={ch.key}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            included
                              ? `${ch.bgClass} ${ch.colorClass} border ${ch.borderClass}`
                              : 'bg-muted/50 text-muted-foreground/40 border border-border/50'
                          }`}
                          title={included ? ch.label : `${ch.label} — non inclus`}
                        >
                          <Icon className="h-3 w-3" />
                          <span className="hidden sm:inline">{ch.shortLabel}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-5">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{displayPrice}</span>
                      <span className="text-lg text-muted-foreground">&euro;</span>
                      <span className="text-sm text-muted-foreground">{priceLabel}</span>
                    </div>
                    {monthlySaving > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Economisez {monthlySaving}&euro; par an
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {features.map((feature) => (
                      <li key={feature.text} className="flex items-start gap-2">
                        <FeatureIcon channel={feature.channel} />
                        <span className="text-sm text-muted-foreground leading-snug">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  <Button
                    className="w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                    disabled={isPending}
                    onClick={() => handleSubscribe(tier.id)}
                    data-testid={`ai-pricing-subscribe-${tier.id}`}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        Choisir {tier.name}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Confirmation Modal (active subscribers — proration preview) */}
      <AlertDialog open={!!confirmTier} onOpenChange={(open) => !open && setConfirmTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;activation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {previewLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calcul du montant au prorata...</span>
                  </div>
                ) : previewAmount !== null ? (
                  <>
                    <p>
                      L&apos;assistant IA <strong>{confirmTier}</strong> sera ajoute a votre abonnement existant.
                    </p>
                    <p className="text-lg font-semibold">
                      Montant du a aujourd&apos;hui : {formatAmount(previewAmount, previewCurrency)}
                    </p>
                    <p className="text-xs">
                      Ce montant est calcule au prorata de votre periode de facturation en cours.
                    </p>
                  </>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAdd}
              disabled={previewLoading || actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Activation...
                </>
              ) : (
                'Confirmer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
