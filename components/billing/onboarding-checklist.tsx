'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Mail,
  Wrench,
  Users,
  FileSignature,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  Zap,
  Lightbulb,
  X,
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
  /** Open the panel automatically on first render */
  defaultExpanded?: boolean
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
    label: 'Créer un lot',
    description: 'Ajoutez votre premier bien immobilier',
    whyItMatters: 'Le lot est la base de votre gestion. Toutes les interventions, contrats et locataires y seront ensuite rattachés.',
    howItConnects: 'Vous pouvez créer un immeuble pour regrouper plusieurs lots ou les laisser indépendants.',
    ctaLabel: 'Créer mon premier lot',
    icon: Home,
    href: '/gestionnaire/biens/lots/nouveau',
  },
  {
    id: 'hasEmail',
    label: 'Connecter votre email',
    description: 'Reliez votre boite mail professionnelle',
    whyItMatters: 'En connectant votre email, vous centralisez toutes vos communications dans SEIDO. Fini les allers-retours entre votre boite mail et votre outil de gestion.',
    howItConnects: 'Les emails liés aux interventions et aux contacts apparaîtront directement dans SEIDO, avec historique complet.',
    ctaLabel: 'Connecter mon email',
    icon: Mail,
    href: '/gestionnaire/parametres/emails',
  },
  {
    id: 'hasContact',
    label: 'Ajouter des contacts',
    description: 'Invitez prestataires, locataires ou gestionnaires',
    whyItMatters: 'Vos contacts sont au coeur de SEIDO. Prestataires pour les missions et devis, locataires pour signaler des problemes, gestionnaires pour collaborer. Invites a l\'app, ils accedent a leur portail dedie.',
    howItConnects: 'Sans invitation, le contact reste dans votre carnet d\'adresses. Avec invitation, il recoit un acces a l\'application et des notifications automatiques.',
    ctaLabel: 'Ajouter un contact',
    icon: Users,
    href: '/gestionnaire/contacts/nouveau',
  },
  {
    id: 'hasContract',
    label: 'Créer un contrat',
    description: 'Liez un locataire à un lot',
    whyItMatters: 'Le contrat formalise l\'occupation d\'un lot. Il permet le suivi du bail, des échéances et du taux d\'occupation.',
    howItConnects: 'Le locataire lié verra apparaître le lot dans son espace et pourra y signaler des interventions.',
    ctaLabel: 'Créer un contrat',
    icon: FileSignature,
    href: '/gestionnaire/contrats/nouveau',
  },
  {
    id: 'hasIntervention',
    label: 'Créer une intervention',
    description: 'Lancez votre première demande de travaux',
    whyItMatters: 'C\'est le cœur de SEIDO : suivez chaque demande du signalement à la résolution, avec historique complet.',
    howItConnects: 'Le prestataire assigné sera notifié, pourra proposer des créneaux et envoyer un devis.',
    ctaLabel: 'Lancer une intervention',
    icon: Wrench,
    href: '/gestionnaire/interventions/nouvelle-intervention',
  },
  {
    id: 'hasClosedIntervention',
    label: 'Clôturer une intervention',
    description: 'Terminez un cycle complet',
    whyItMatters: 'La clôture archive l\'intervention avec tout son historique : échanges, devis, photos, créneaux.',
    howItConnects: 'L\'historique reste consultable sur la fiche du lot pour référence future.',
    ctaLabel: 'Voir mes interventions',
    icon: CheckCircle2,
    href: '/gestionnaire/interventions',
  },
]

// =============================================================================
// Component
// =============================================================================

export function OnboardingChecklist({ className, progress, isTrialing, defaultExpanded }: OnboardingChecklistProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const [dismissed, setDismissed] = useState(false)
  const [celebratingStep, setCelebratingStep] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
      setDismissed(true)
    }
  }, [])

  // Close panel on outside click
  useEffect(() => {
    if (!expanded) return
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [expanded])

  // Close on Escape
  useEffect(() => {
    if (!expanded) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [expanded])

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
      setExpanded(false)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div ref={panelRef} className={cn('relative z-40', className)}>
      {/* Pill trigger — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-2.5 px-4 py-2 rounded-full',
          'border shadow-sm transition-all duration-200',
          'hover:scale-[1.02] active:scale-[0.98]',
          expanded
            ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
            : 'bg-card border-border hover:border-primary/40 hover:shadow-primary/10',
        )}
        aria-expanded={expanded}
        aria-label={`Guide de démarrage : ${completedCount} sur ${totalSteps} étapes complétées`}
      >
        <Zap className={cn('h-3.5 w-3.5', expanded ? 'text-primary-foreground' : 'text-primary')} />
        <span className={cn('text-sm font-medium', expanded ? 'text-primary-foreground' : 'text-foreground')}>
          Démarrage
        </span>

        {/* Mini progress dots */}
        <div className="flex items-center gap-1">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                progress[step.id]
                  ? 'bg-green-500'
                  : expanded
                    ? 'bg-primary-foreground/30'
                    : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>

        <span className={cn(
          'text-xs font-medium tabular-nums',
          expanded ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}>
          {completedCount}/{totalSteps}
        </span>

        {expanded ? (
          <ChevronUp className={cn('h-3.5 w-3.5', expanded ? 'text-primary-foreground/70' : 'text-muted-foreground')} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Expanded panel — overlay dropdown below pill */}
      {expanded && (
        <div className="absolute top-full left-0 mt-2 w-[min(480px,calc(100vw-2rem))]">
          <div className="rounded-xl border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Panel header */}
            <div className="flex items-center justify-between p-4 pb-3 border-b">
              <div>
                <p className="text-sm font-semibold">Guide de démarrage</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedCount} sur {totalSteps} étapes complétées
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Progress bar */}
                <div className="flex items-center gap-2 w-20">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Steps list */}
            <div className="p-3 space-y-0.5 max-h-[60vh] overflow-y-auto">
              {STEPS.map((step, index) => {
                const isComplete = progress[step.id]
                const isCurrent = step.id === currentStepId
                const isCelebrating = celebratingStep === step.id
                const Icon = step.icon

                return (
                  <div key={step.id}>
                    <div
                      role="button"
                      tabIndex={isComplete ? -1 : 0}
                      onClick={() => handleStepClick(step)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStepClick(step) } }}
                      onMouseEnter={() => {
                        if (isComplete && !celebratingStep) {
                          setCelebratingStep(step.id)
                          setTimeout(() => setCelebratingStep(null), 1000)
                        }
                      }}
                      aria-disabled={isComplete}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all',
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
                        <div className="flex items-center justify-between gap-2">
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
                          {isCurrent && !isComplete && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(step.href)
                                setExpanded(false)
                              }}
                              className="gap-1.5 flex-shrink-0 text-xs h-7"
                            >
                              <Icon className="h-3 w-3" />
                              {step.ctaLabel}
                            </Button>
                          )}
                        </div>
                        {!isComplete && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tutorial content — visible for current step only */}
                    {isCurrent && !isComplete && (
                      <div className="ml-10 mt-1 mb-2 pl-3 border-l-2 border-primary/20">
                        <div className="flex items-start gap-1.5 mb-1">
                          <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.whyItMatters}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground/70 leading-relaxed">
                          {step.howItConnects}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="border-t p-3 text-center">
              <button
                onClick={handleDismiss}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Masquer ce guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
