'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Wrench,
  UserPlus,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getOnboardingProgress,
  getSubscriptionStatus,
  type OnboardingProgress,
} from '@/app/actions/subscription-actions'

// =============================================================================
// Types
// =============================================================================

interface OnboardingChecklistProps {
  className?: string
}

interface ChecklistStep {
  id: keyof OnboardingProgress
  label: string
  description: string
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
    label: 'Creer un bien',
    description: 'Ajoutez votre premier lot ou immeuble',
    icon: Home,
    href: '/gestionnaire/biens',
  },
  {
    id: 'hasIntervention',
    label: 'Creer une intervention',
    description: 'Lancez votre premiere demande',
    icon: Wrench,
    href: '/gestionnaire/interventions',
  },
  {
    id: 'hasInvitedProvider',
    label: 'Inviter un prestataire',
    description: 'Ajoutez un professionnel a votre equipe',
    icon: UserPlus,
    href: '/gestionnaire/contacts',
  },
  {
    id: 'hasUploadedDocument',
    label: 'Ajouter un document',
    description: 'Centralisez vos fichiers importants',
    icon: FileText,
    href: '/gestionnaire/biens',
  },
  {
    id: 'hasClosedIntervention',
    label: 'Cloturer une intervention',
    description: 'Terminez un cycle complet',
    icon: CheckCircle2,
    href: '/gestionnaire/interventions',
  },
]

// =============================================================================
// Component
// =============================================================================

export function OnboardingChecklist({ className }: OnboardingChecklistProps) {
  const router = useRouter()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [celebratingStep, setCelebratingStep] = useState<string | null>(null)

  useEffect(() => {
    // Check dismissed state first (fast, no network)
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY)) {
      setDismissed(true)
      setLoading(false)
      return
    }

    // Check if user is trialing, then fetch progress
    Promise.all([getSubscriptionStatus(), getOnboardingProgress()]).then(
      ([subResult, progressResult]) => {
        const isTrialing = subResult.success && subResult.data?.status === 'trialing'
        if (!isTrialing) {
          setLoading(false)
          return
        }
        if (progressResult.success && progressResult.data) {
          setProgress(progressResult.data)
        }
        setLoading(false)
      },
    )
  }, [])

  if (loading || dismissed || !progress) return null

  const completedCount = STEPS.filter((s) => progress[s.id]).length
  const totalSteps = STEPS.length
  const progressPercent = (completedCount / totalSteps) * 100

  // Don't show if all steps are completed
  if (completedCount === totalSteps) return null

  const showUpgradeCTA = completedCount >= 3

  const handleStepClick = (step: ChecklistStep) => {
    if (!progress[step.id]) {
      router.push(step.href)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
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

          {STEPS.map((step) => {
            const isComplete = progress[step.id]
            const isCelebrating = celebratingStep === step.id
            const Icon = step.icon

            return (
              <button
                key={step.id}
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
                    : 'hover:bg-muted/50 cursor-pointer',
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 transition-all',
                  isComplete
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-muted',
                )}>
                  {isComplete ? (
                    isCelebrating ? (
                      <PartyPopper className="h-3.5 w-3.5 text-green-600 dark:text-green-400 animate-bounce" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    )
                  ) : (
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm',
                    isComplete ? 'line-through text-muted-foreground' : 'font-medium',
                  )}>
                    {step.label}
                  </p>
                  {!isComplete && (
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            )
          })}

          {/* CTA upgrade after 3+ steps */}
          {showUpgradeCTA && (
            <div className="pt-3 mt-2 border-t">
              <div className="flex items-center gap-2 mb-2">
                <PartyPopper className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Bravo ! Vous exploitez deja bien SEIDO.
                </p>
              </div>
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => router.push('/gestionnaire/settings/billing')}
              >
                Passer au plan Pro
              </Button>
            </div>
          )}

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
