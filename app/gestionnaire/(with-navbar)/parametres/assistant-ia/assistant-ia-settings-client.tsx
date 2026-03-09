'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Phone,
  Zap,
  BarChart3,
  Settings,
  CreditCard,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  createAiCheckoutAction,
  updateAiCustomInstructionsAction,
  toggleAiAutoTopupAction,
  createAiTopupAction,
  verifyAiCheckoutSession,
  type AiSubscriptionInfo,
} from '@/app/actions/ai-subscription-actions'
import type { AiTier } from '@/lib/stripe'

// ============================================================================
// Types
// ============================================================================

interface AssistantIaSettingsClientProps {
  subscriptionInfo: AiSubscriptionInfo
}

interface PricingTier {
  id: AiTier
  name: string
  price: number
  minutes: number
  popular: boolean
  features: string[]
}

// ============================================================================
// Constants
// ============================================================================

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'solo',
    name: 'Solo',
    price: 49,
    minutes: 60,
    popular: false,
    features: [
      'Numero de telephone dedie',
      'Reponse automatique 24/7',
      'Transcription des appels',
      'Notifications en temps reel',
    ],
  },
  {
    id: 'equipe',
    name: 'Equipe',
    price: 99,
    minutes: 180,
    popular: true,
    features: [
      'Tout le plan Solo',
      'Instructions personnalisees',
      'Priorite de traitement',
      'Rapport mensuel detaille',
      'Support prioritaire',
    ],
  },
  {
    id: 'agence',
    name: 'Agence',
    price: 149,
    minutes: 500,
    popular: false,
    features: [
      'Tout le plan Equipe',
      'Minutes supplementaires a prix reduit',
      'Integration CRM avancee',
      'Analyses et statistiques',
      'Account manager dedie',
    ],
  },
]

const TOPUP_PRICES: Record<AiTier, number> = {
  solo: 50,
  equipe: 40,
  agence: 30,
}

const MAX_INSTRUCTIONS_LENGTH = 500

// ============================================================================
// Component
// ============================================================================

export function AssistantIaSettingsClient({ subscriptionInfo }: AssistantIaSettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local state so we can update immediately after verification
  // without waiting for router.refresh() to complete
  const [localInfo, setLocalInfo] = useState<AiSubscriptionInfo>(subscriptionInfo)
  const [isVerifying, setIsVerifying] = useState(false)

  // Sync props → local state when server data refreshes
  useEffect(() => {
    setLocalInfo(subscriptionInfo)
  }, [subscriptionInfo])

  // Handle checkout/topup return params
  useEffect(() => {
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')
    const topup = searchParams.get('topup')

    console.log('[AI-SETTINGS] useEffect fired', { checkout, sessionId, topup })

    if (checkout === 'success' && sessionId) {
      // Verify checkout and trigger provisioning (webhook fallback for local dev)
      setIsVerifying(true)
      console.log('[AI-SETTINGS] Calling verifyAiCheckoutSession...', sessionId)
      verifyAiCheckoutSession(sessionId)
        .then((result) => {
          console.log('[AI-SETTINGS] verifyAiCheckoutSession result:', JSON.stringify(result))
          if (!result) {
            console.error('[AI-SETTINGS] Server action returned undefined')
            toast.error('Erreur serveur — rechargez la page')
            return
          }
          if (result.success && result.data?.verified) {
            const phone = result.data.phoneNumber
            toast.success(
              phone
                ? `Assistant IA active ! Numero attribue : ${phone}`
                : 'Assistant IA active avec succes !'
            )
            // Update local state immediately so the UI switches to active view
            // (don't rely on router.refresh — it would race with router.replace)
            setLocalInfo((prev) => ({
              ...prev,
              isActive: true,
              phoneNumber: phone ?? prev.phoneNumber,
              tier: prev.tier || 'solo',
              minutesIncluded: prev.minutesIncluded || 60,
            }))
          } else {
            console.error('[AI-SETTINGS] Verification failed:', result.error)
            toast.error(result.error || 'La verification du paiement a echoue')
          }
        })
        .catch((err) => {
          console.error('[AI-SETTINGS] verifyAiCheckoutSession error:', err)
          toast.error('Erreur lors de la verification du paiement')
        })
        .finally(() => {
          setIsVerifying(false)
          // Strip query params AFTER state is updated — use window.history
          // to avoid router.replace cancelling any pending RSC requests
          window.history.replaceState(null, '', '/gestionnaire/parametres/assistant-ia')
        })
    } else if (checkout === 'cancelled') {
      toast.info('Paiement annule')
      router.replace('/gestionnaire/parametres/assistant-ia', { scroll: false })
    } else if (topup === 'success') {
      toast.success('Recharge effectuee avec succes !')
      router.refresh()
      window.history.replaceState(null, '', '/gestionnaire/parametres/assistant-ia')
    } else if (topup === 'cancelled') {
      toast.info('Recharge annulee')
      router.replace('/gestionnaire/parametres/assistant-ia', { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isVerifying) {
    return (
      <div className="layout-padding">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-lg text-muted-foreground">Activation de votre assistant IA en cours...</p>
          <p className="text-sm text-muted-foreground">Attribution du numero de telephone et configuration de l&apos;agent vocal.</p>
        </div>
      </div>
    )
  }

  if (localInfo.isActive) {
    return <ActiveSubscription subscriptionInfo={localInfo} isPending={isPending} startTransition={startTransition} />
  }

  return <PricingSection isPending={isPending} startTransition={startTransition} />
}

// ============================================================================
// Pricing Section (Not Subscribed)
// ============================================================================

function PricingSection({
  isPending,
  startTransition,
}: {
  isPending: boolean
  startTransition: React.TransitionStartFunction
}) {
  const router = useRouter()

  const handleSubscribe = (tier: AiTier) => {
    startTransition(async () => {
      const result = await createAiCheckoutAction(tier)
      if (result?.success && result.data?.url) {
        router.push(result.data.url)
      } else {
        toast.error(result?.error || 'Erreur lors de la souscription')
      }
    })
  }

  return (
    <div className="layout-padding">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/gestionnaire/parametres')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Assistant IA Telephonique</h1>
        </div>

        {/* Subtitle */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Phone className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold">Assistant IA Telephonique</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Un numero de telephone dedie avec un assistant IA qui repond a vos locataires 24/7,
            prend les messages et cree automatiquement des demandes d&apos;intervention.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${
                tier.popular
                  ? 'border-primary shadow-lg ring-1 ring-primary/20'
                  : 'border-border'
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Populaire
                </Badge>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>
                  {tier.minutes} minutes incluses / mois
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">&euro;/mois</span>
                </div>

                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.popular ? 'default' : 'outline'}
                  disabled={isPending}
                  onClick={() => handleSubscribe(tier.id)}
                >
                  {isPending ? 'Chargement...' : 'Choisir ce plan'}
                  {!isPending && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Active Subscription
// ============================================================================

function ActiveSubscription({
  subscriptionInfo,
  isPending,
  startTransition,
}: {
  subscriptionInfo: AiSubscriptionInfo
  isPending: boolean
  startTransition: React.TransitionStartFunction
}) {
  const router = useRouter()
  const [instructions, setInstructions] = useState(subscriptionInfo.customInstructions || '')
  const [autoTopup, setAutoTopup] = useState(subscriptionInfo.autoTopup)
  const [isSavingInstructions, setIsSavingInstructions] = useState(false)

  // Usage calculations
  const usagePercent = subscriptionInfo.minutesIncluded > 0
    ? (subscriptionInfo.minutesUsed / subscriptionInfo.minutesIncluded) * 100
    : 0
  const clampedPercent = Math.min(usagePercent, 100)

  const getUsageColor = (percent: number): string => {
    if (percent >= 80) return 'bg-destructive'
    if (percent >= 60) return 'bg-orange-500'
    return ''
  }

  const usageColorClass = getUsageColor(usagePercent)

  const topupPrice = subscriptionInfo.tier
    ? TOPUP_PRICES[subscriptionInfo.tier]
    : 50

  // Handlers
  const handleSaveInstructions = () => {
    setIsSavingInstructions(true)
    startTransition(async () => {
      const result = await updateAiCustomInstructionsAction(instructions)
      setIsSavingInstructions(false)
      if (result?.success) {
        toast.success('Instructions mises a jour')
      } else {
        toast.error(result?.error || 'Erreur lors de la sauvegarde')
      }
    })
  }

  const handleToggleAutoTopup = (checked: boolean) => {
    setAutoTopup(checked)
    startTransition(async () => {
      const result = await toggleAiAutoTopupAction(checked)
      if (result?.success) {
        toast.success(checked ? 'Recharge automatique activee' : 'Recharge automatique desactivee')
      } else {
        setAutoTopup(!checked)
        toast.error(result?.error || 'Erreur lors de la mise a jour')
      }
    })
  }

  const handleTopup = () => {
    startTransition(async () => {
      const result = await createAiTopupAction()
      if (result?.success && result.data?.url) {
        router.push(result.data.url)
      } else {
        toast.error(result?.error || 'Erreur lors de la recharge')
      }
    })
  }

  const handleManageSubscription = () => {
    const portalUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL
    if (portalUrl) {
      window.open(portalUrl, '_blank', 'noopener,noreferrer')
    } else {
      toast.error('Le portail de gestion n\'est pas disponible')
    }
  }

  return (
    <div className="layout-padding">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/gestionnaire/parametres')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Assistant IA Telephonique</h1>
        </div>

        <div className="space-y-6">
          {/* Phone Number Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Numero de telephone</CardTitle>
                    <CardDescription>
                      Votre numero dedie pour l&apos;assistant IA
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                  Actif
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-semibold tracking-wider">
                {subscriptionInfo.phoneNumber || 'Attribution en cours...'}
              </p>
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Utilisation ce mois</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {subscriptionInfo.minutesUsed} / {subscriptionInfo.minutesIncluded} minutes utilisees
                  </span>
                  <span className="font-medium">
                    {Math.round(clampedPercent)}%
                  </span>
                </div>
                <div className="relative">
                  <Progress value={clampedPercent} className="h-3" />
                  {usageColorClass && (
                    <div
                      className={`absolute top-0 left-0 h-3 rounded-full transition-all ${usageColorClass}`}
                      style={{ width: `${clampedPercent}%` }}
                    />
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {subscriptionInfo.callsCount} appel{subscriptionInfo.callsCount !== 1 ? 's' : ''} ce mois
              </p>
            </CardContent>
          </Card>

          {/* Custom Instructions Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Instructions personnalisees</CardTitle>
                  <CardDescription>
                    Definissez le comportement de votre assistant IA : ton, informations a collecter,
                    reponses type, horaires, etc.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Ex: Repondez toujours en francais. Collectez le nom, l'adresse et la nature du probleme. Pour les urgences (fuite d'eau, panne de chauffage), indiquez le numero d'urgence 01 XX XX XX XX."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={MAX_INSTRUCTIONS_LENGTH}
                rows={4}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {instructions.length} / {MAX_INSTRUCTIONS_LENGTH} caracteres
                </span>
                <Button
                  size="sm"
                  disabled={isPending || isSavingInstructions || instructions === (subscriptionInfo.customInstructions || '')}
                  onClick={handleSaveInstructions}
                >
                  {isSavingInstructions ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>Parametres</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Top-up */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-topup" className="text-sm font-medium">
                    Recharge automatique
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ajouter automatiquement 100 minutes quand le quota est atteint
                  </p>
                </div>
                <Switch
                  id="auto-topup"
                  checked={autoTopup}
                  onCheckedChange={handleToggleAutoTopup}
                  disabled={isPending}
                  aria-label="Activer la recharge automatique"
                />
              </div>

              <Separator />

              {/* Manual Top-up */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Recharger des minutes</p>
                  <p className="text-xs text-muted-foreground">
                    Ajouter 100 minutes supplementaires pour {topupPrice}&euro;
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handleTopup}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isPending ? 'Chargement...' : 'Recharger'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle>Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => router.push('/gestionnaire/parametres/assistant-ia/historique')}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Historique des appels
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={handleManageSubscription}
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Gerer l&apos;abonnement
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
