'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Wrench,
  Users,
  UserPlus,
  FileSignature,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  Zap,
  Lightbulb,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OnboardingProgress } from '@/app/actions/subscription-actions'

// =============================================================================
// Types
// =============================================================================

interface OnboardingChecklistProps {
  className?: string
  progress?: OnboardingProgress | null
  isTrialing?: boolean
}

interface ChecklistStep {
  id: keyof OnboardingProgress
  label: string
  description: string
  whyItMatters: string
  howItConnects: string
  ctaLabel: string
  icon: React.ElementType
  href: string
}

// =============================================================================
// Constants
// =============================================================================

const DISMISS_KEY = 'seido_onboarding_dismissed'

const STEPS: ChecklistStep[] = [
  {
    id: 'hasLot',
    label: 'Creer un lot',
    description: 'Ajoutez votre premier bien immobilier',
    whyItMatters: 'Le lot est la base de votre gestion. Toutes les interventions, contrats et locataires y seront rattaches.',
    howItConnects: 'Vous pourrez ensuite y associer des locataires, des contrats et suivre les interventions par lot.',
    ctaLabel: 'Creer mon premier lot',
    icon: Home,
    href: '/gestionnaire/biens/lots/nouveau',
  },
  {
    id: 'hasInvitedProvider',
    label: 'Ajouter un prestataire',
    description: 'Ajoutez un professionnel a votre equipe',
    whyItMatters: 'Les prestataires recoivent les missions, envoient leurs devis et planifient directement dans SEIDO.',
    howItConnects: 'Lors d\'une intervention, vous pourrez assigner un prestataire et suivre son avancement en temps reel.',
    ctaLabel: 'Ajouter un prestataire',
    icon: UserPlus,
    href: '/gestionnaire/contacts/nouveau?type=prestataire',
  },
  {
    id: 'hasAddedTenant',
    label: 'Ajouter un locataire',
    description: 'Enregistrez votre premier occupant',
    whyItMatters: 'Vos locataires pourront signaler des problemes directement via leur portail, sans vous appeler.',
    howItConnects: 'Une fois lie a un lot par un contrat, le locataire accede a son espace et peut creer des demandes.',
    ctaLabel: 'Ajouter un locataire',
    icon: Users,
    href: '/gestionnaire/contacts/nouveau?type=locataire',
  },
  {
    id: 'hasContract',
    label: 'Creer un contrat',
    description: 'Liez un locataire a un lot',
    whyItMatters: 'Le contrat formalise l\'occupation d\'un lot. Il permet le suivi du bail, des echeances et du taux d\'occupation.',
    howItConnects: 'Le locataire lie verra apparaitre le lot dans son espace et pourra y signaler des interventions.',
    ctaLabel: 'Creer un contrat',
    icon: FileSignature,
    href: '/gestionnaire/contrats/nouveau',
  },
  {
    id: 'hasIntervention',
    label: 'Creer une intervention',
    description: 'Lancez votre premiere demande de travaux',
    whyItMatters: 'C\'est le coeur de SEIDO : suivez chaque demande du signalement a la resolution, avec historique complet.',
    howItConnects: 'Le prestataire assigne sera notifie, pourra proposer des creneaux et envoyer un devis.',
    ctaLabel: 'Lancer une intervention',
    icon: Wrench,
    href: '/gestionnaire/interventions/nouvelle-intervention',
  },
  {
    id: 'hasClosedIntervention',
    label: 'Cloturer une intervention',
    description: 'Terminez un cycle complet',
    whyItMatters: 'La cloture archive l\'intervention avec tout son historique : echanges, devis, photos, creneaux.',
    howItConnects: 'L\'historique reste consultable sur la fiche du lot pour reference future.',
    ctaLabel: 'Voir mes interventions',
    icon: CheckCircle2,
    href: '/gestionnaire/interventions',
  },
]

// =============================================================================
// Component
// =============================================================================

export function OnboardingChecklist({ className, progress, isTrialing }: OnboardingChecklistProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
      setDismissed(true)
    }
  }, [])
  const [celebratingStep, setCelebratingStep] = useState<string | null>(null)

  // Don't render if not trialing, no data, or dismissed
  if (!isTrialing || !progress || dismissed) return null

  const completedCount = STEPS.filter((s) => progress[s.id]).length
  const totalSteps = STEPS.length
  const progressPercent = (completedCount / totalSteps) * 100

  // Don't show if all steps are completed
  if (completedCount === totalSteps) return null

  // Find the first incomplete step (current focus)
  const currentStepId = STEPS.find((s) => !progress[s.id])?.id



  const handleStepClick = (step: ChecklistStep) => {
    if (!progress[step.id]) {
      router.push(step.href)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className={cn(
      'rounded-lg border bg-card shadow-sm overflow-hidden',
      className,
    )}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Demarrage rapide</p>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalSteps} etapes completees
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Compact progress bar */}
          <div className="hidden sm:flex items-center gap-2 w-24">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {Math.round(progressPercent)}%
            </span>
          </div>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-1">
          {/* Full progress bar (mobile) */}
          <div className="sm:hidden mb-3">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {STEPS.map((step, index) => {
            const isComplete = progress[step.id]
            const isCurrent = step.id === currentStepId
            const isCelebrating = celebratingStep === step.id
            const Icon = step.icon

            return (
              <div key={step.id}>
                <button
                  onClick={() => handleStepClick(step)}
                  onMouseEnter={() => {
                    if (isComplete && !celebratingStep) {
                      setCelebratingStep(step.id)
                      setTimeout(() => setCelebratingStep(null), 1000)
                    }
                  }}
                  disabled={isComplete}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-all',
                    isComplete
                      ? 'opacity-60'
                      : isCurrent
                        ? 'bg-primary/5 border border-primary/20 hover:bg-primary/10 cursor-pointer'
                        : 'hover:bg-muted/50 cursor-pointer',
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 transition-all',
                    isComplete
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : isCurrent
                        ? 'bg-primary/10'
                        : 'bg-muted',
                  )}>
                    {isComplete ? (
                      isCelebrating ? (
                        <PartyPopper className="h-3.5 w-3.5 text-green-600 dark:text-green-400 animate-bounce" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      )
                    ) : (
                      <span className={cn(
                        'text-xs font-semibold',
                        isCurrent ? 'text-primary' : 'text-muted-foreground',
                      )}>
                        {index + 1}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm',
                      isComplete
                        ? 'line-through text-muted-foreground'
                        : isCurrent
                          ? 'font-semibold text-primary'
                          : 'font-medium',
                    )}>
                      {step.label}
                    </p>
                    {!isComplete && (
                      <p className="text-xs text-muted-foreground truncate">
                        {step.description}
                      </p>
                    )}
                  </div>

                  {isCurrent && !isComplete && (
                    <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>

                {/* Tutorial content + CTA — visible for current step only */}
                {isCurrent && !isComplete && (
                  <div className="ml-10 mt-1 mb-2 pl-3 border-l-2 border-primary/20">
                    <div className="flex items-start gap-1.5 mb-1">
                      <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.whyItMatters}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed mb-3">
                      {step.howItConnects}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => router.push(step.href)}
                      className="gap-1.5"
                    >
                      {step.ctaLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Dismiss link */}
          <div className="pt-2 text-center">
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Masquer cette liste
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
