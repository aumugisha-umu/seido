'use client'

/**
 * ProgressionTimeline - Timeline de progression d'une intervention
 *
 * @example
 * <ProgressionTimeline currentStatus="planifiee" />
 * <ProgressionTimeline currentStatus="approuvee" variant="compact" />
 */

import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Calendar,
  FileText,
  AlertCircle,
  XCircle,
  Wrench,
  ClipboardCheck
} from 'lucide-react'

export interface ProgressionTimelineProps {
  /** Statut actuel de l'intervention */
  currentStatus: string
  /** Variante d'affichage */
  variant?: 'default' | 'compact'
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Configuration des étapes de la timeline
 */
interface TimelineStep {
  status: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TIMELINE_STEPS: TimelineStep[] = [
  { status: 'demande', label: 'Demande', icon: AlertCircle },
  { status: 'approuvee', label: 'Approuvée', icon: CheckCircle2 },
  { status: 'demande_de_devis', label: 'Devis', icon: FileText },
  { status: 'planification', label: 'Planification', icon: Calendar },
  { status: 'planifiee', label: 'Planifiée', icon: Calendar },
  { status: 'en_cours', label: 'En cours', icon: Wrench },
  { status: 'cloturee_par_prestataire', label: 'Terminé (Prestataire)', icon: ClipboardCheck },
  { status: 'cloturee_par_locataire', label: 'Validé (Locataire)', icon: ClipboardCheck },
  { status: 'cloturee_par_gestionnaire', label: 'Clôturée', icon: CheckCircle2 }
]

/**
 * Statuts terminaux (fin de workflow)
 */
const TERMINAL_STATUSES = ['annulee', 'rejetee', 'cloturee_par_gestionnaire']

/**
 * Statuts d'erreur
 */
const ERROR_STATUSES = ['annulee', 'rejetee']

/**
 * Trouve l'index du statut courant dans la timeline
 */
const getStatusIndex = (status: string): number => {
  const index = TIMELINE_STEPS.findIndex(step => step.status === status)
  return index >= 0 ? index : -1
}

/**
 * Timeline de progression compacte
 */
const CompactTimeline = ({
  currentStatus,
  className
}: ProgressionTimelineProps) => {
  const currentIndex = getStatusIndex(currentStatus)
  const isError = ERROR_STATUSES.includes(currentStatus)
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus)

  // Pour la variante compacte, on montre seulement les étapes principales
  const compactSteps = [
    { status: 'demande', label: 'Demande' },
    { status: 'approuvee', label: 'Approuvée' },
    { status: 'planifiee', label: 'Planifiée' },
    { status: 'cloturee_par_gestionnaire', label: 'Clôturée' }
  ]

  // Calcule l'index compact basé sur le statut actuel
  const getCompactIndex = (status: string): number => {
    if (['demande', 'rejetee'].includes(status)) return 0
    if (['approuvee', 'demande_de_devis'].includes(status)) return 1
    if (['planification', 'planifiee', 'en_cours'].includes(status)) return 2
    if (['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(status)) return 3
    return 0
  }

  const compactIndex = getCompactIndex(currentStatus)

  return (
    <div className={cn('space-y-2', className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Progression
      </span>

      <div className="flex items-center gap-1">
        {compactSteps.map((step, index) => {
          const isPast = index < compactIndex
          const isCurrent = index === compactIndex
          const isFuture = index > compactIndex

          return (
            <div key={step.status} className="flex items-center flex-1">
              {/* Point */}
              <div
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  isPast && 'bg-green-500',
                  isCurrent && (isError ? 'bg-red-500' : 'bg-blue-500'),
                  isFuture && 'bg-slate-200'
                )}
              />

              {/* Ligne de connexion */}
              {index < compactSteps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1',
                    isPast ? 'bg-green-500' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Label du statut actuel */}
      <p className={cn(
        'text-xs font-medium',
        isError ? 'text-red-600' : isTerminal ? 'text-green-600' : 'text-blue-600'
      )}>
        {isError && currentStatus === 'annulee' && 'Intervention annulée'}
        {isError && currentStatus === 'rejetee' && 'Demande rejetée'}
        {!isError && compactSteps[compactIndex]?.label}
      </p>
    </div>
  )
}

/**
 * Timeline de progression détaillée
 */
const DetailedTimeline = ({
  currentStatus,
  className
}: ProgressionTimelineProps) => {
  const currentStatusIndex = getStatusIndex(currentStatus)
  const isError = ERROR_STATUSES.includes(currentStatus)

  // Détermine quelles étapes afficher (pas toutes)
  const visibleSteps = TIMELINE_STEPS.filter((step, index) => {
    // Toujours montrer les étapes passées et courante
    if (index <= currentIndex) return true
    // Montrer les 2 prochaines étapes
    if (index <= currentIndex + 2) return true
    return false
  })

  return (
    <div className={cn('space-y-3', className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Progression
      </span>

      <div className="relative">
        {visibleSteps.map((step, index) => {
          const stepIndex = TIMELINE_STEPS.findIndex(s => s.status === step.status)
          const isPast = stepIndex < currentStatusIndex
          const isCurrent = stepIndex === currentStatusIndex
          const isFuture = stepIndex > currentStatusIndex
          const Icon = step.icon
          const isLast = index === visibleSteps.length - 1

          return (
            <div key={step.status} className="flex gap-3">
              {/* Colonne de l'indicateur */}
              <div className="flex flex-col items-center">
                {/* Icône/Point */}
                <div
                  className={cn(
                    'flex items-center justify-center h-6 w-6 rounded-full transition-colors',
                    isPast && 'bg-green-100 text-green-600',
                    isCurrent && (isError ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'),
                    isFuture && 'bg-slate-100 text-slate-400'
                  )}
                >
                  {isCurrent && isError ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Ligne de connexion */}
                {!isLast && (
                  <div
                    className={cn(
                      'w-0.5 h-6 mt-1',
                      isPast ? 'bg-green-300' : 'bg-slate-200'
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pt-0.5 pb-3">
                <p
                  className={cn(
                    'text-sm',
                    isPast && 'text-green-700 font-medium',
                    isCurrent && (isError ? 'text-red-700 font-medium' : 'text-blue-700 font-medium'),
                    isFuture && 'text-slate-400'
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          )
        })}

        {/* Indication si intervention annulée ou rejetée */}
        {isError && (
          <div className="flex gap-3 mt-2">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-sm text-red-700 font-medium pt-0.5">
              {currentStatus === 'annulee' ? 'Annulée' : 'Rejetée'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Timeline de progression d'une intervention
 */
export const ProgressionTimeline = ({
  currentStatus,
  variant = 'default',
  className
}: ProgressionTimelineProps) => {
  if (variant === 'compact') {
    return <CompactTimeline currentStatus={currentStatus} className={className} />
  }

  return <DetailedTimeline currentStatus={currentStatus} className={className} />
}
