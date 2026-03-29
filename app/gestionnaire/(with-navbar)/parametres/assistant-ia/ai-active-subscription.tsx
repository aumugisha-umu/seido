'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
  updateAiCustomInstructionsAction,
  toggleAiAutoTopupAction,
  createAiTopupAction,
  removeAiAddonAction,
  type AiSubscriptionInfo,
} from '@/app/actions/ai-subscription-actions'
import { TOPUP_PRICES, MAX_INSTRUCTIONS_LENGTH } from './ai-constants'

export function ActiveSubscription({
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
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

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

  const handleRemoveAi = () => {
    setIsRemoving(true)
    startTransition(async () => {
      const result = await removeAiAddonAction()
      setIsRemoving(false)
      if (result?.success) {
        toast.success('Assistant IA resilie avec succes.')
        setShowRemoveDialog(false)
        router.refresh()
      } else {
        toast.error(result?.error || 'Erreur lors de la resiliation')
      }
    })
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
          <h1 className="text-2xl font-bold">Assistant IA</h1>
        </div>

        <div className="space-y-6">
          {/* Phone Number Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Numero WhatsApp</CardTitle>
                    <CardDescription>
                      Votre numero WhatsApp dedie pour l&apos;assistant IA
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
                {subscriptionInfo.phoneNumber || 'Numero non configure'}
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
                    {subscriptionInfo.minutesUsed} / {subscriptionInfo.minutesIncluded} conversations utilisees
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
                {subscriptionInfo.callsCount} conversation{subscriptionInfo.callsCount !== 1 ? 's' : ''} ce mois
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
                    Ajouter automatiquement 100 conversations quand le quota est atteint
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
                  <p className="text-sm font-medium">Recharger des conversations</p>
                  <p className="text-xs text-muted-foreground">
                    Ajouter 100 conversations supplementaires pour {topupPrice}&euro;
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
                  Historique des conversations
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

              <Separator />

              <Button
                variant="outline"
                className="w-full justify-between text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={() => setShowRemoveDialog(true)}
              >
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Resilier l&apos;assistant IA
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Remove AI Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resilier l&apos;assistant IA ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Votre assistant IA sera desactive immediatement. Aucun remboursement
                  au prorata ne sera effectue, meme en cas d&apos;abonnement annuel.
                </p>
                <p className="text-sm font-medium text-destructive">
                  Le service (numero WhatsApp, conversations IA) sera coupe des la confirmation.
                </p>
                <p className="text-sm">
                  Vos donnees et votre numero seront supprimes. Cette action est irreversible.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAi}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Resiliation...
                </>
              ) : (
                'Resilier'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
