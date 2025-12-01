'use client'

/**
 * ProgressionTimeline - Timeline de progression d'une intervention
 *
 * Affiche l'historique des changements de statut avec:
 * - Date et heure de chaque action
 * - Personne qui a effectué l'action
 * - Icône colorée selon l'état (passé, courant, futur)
 * - Zone scrollable avec auto-focus sur l'étape courante
 *
 * @example
 * <ProgressionTimeline
 *   currentStatus="planifiee"
 *   events={[
 *     { status: 'demande', date: '2025-01-15T10:30:00', author: 'Sophie Martin' },
 *     { status: 'approuvee', date: '2025-01-15T14:00:00', author: 'Jean Dupont' }
 *   ]}
 * />
 */

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Calendar,
  FileText,
  AlertCircle,
  XCircle,
  Wrench,
  ClipboardCheck,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Événement de timeline avec date et auteur
 */
export interface TimelineEvent {
  /** Statut de l'intervention à ce moment */
  status: string
  /** Date et heure de l'action (ISO string) */
  date: string
  /** Nom de la personne qui a effectué l'action */
  author?: string
  /** Rôle de la personne (optionnel, pour coloration) */
  authorRole?: 'manager' | 'provider' | 'tenant'
}

export interface ProgressionTimelineProps {
  /** Statut actuel de l'intervention */
  currentStatus: string
  /** Historique des événements (optionnel, pour afficher dates et auteurs) */
  events?: TimelineEvent[]
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
 * Formate une date en français
 */
const formatEventDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr })
  } catch {
    return dateString
  }
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
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
 * Timeline de progression détaillée avec dates et auteurs
 * Zone scrollable avec auto-focus sur l'étape courante
 */
const DetailedTimeline = ({
  currentStatus,
  events = [],
  className
}: ProgressionTimelineProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentStepRef = useRef<HTMLDivElement>(null)
  const currentStatusIndex = getStatusIndex(currentStatus)
  const isError = ERROR_STATUSES.includes(currentStatus)

  // Crée un map des événements par statut pour accès rapide
  const eventsByStatus = new Map<string, TimelineEvent>()
  events.forEach(event => {
    eventsByStatus.set(event.status, event)
  })

  // Affiche toutes les étapes de la timeline
  const visibleSteps = TIMELINE_STEPS

  // Auto-scroll vers l'étape courante au chargement
  useEffect(() => {
    if (currentStepRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const currentStep = currentStepRef.current

      // Calcule la position pour centrer l'étape courante
      const containerHeight = container.clientHeight
      const stepTop = currentStep.offsetTop
      const stepHeight = currentStep.clientHeight

      // Scroll pour que l'étape courante soit visible avec du contexte autour
      const scrollPosition = stepTop - (containerHeight / 3) + (stepHeight / 2)

      container.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      })
    }
  }, [currentStatus])

  return (
    <div className={cn('space-y-3', className)}>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Progression
      </span>

      {/* Zone scrollable avec hauteur maximale */}
      <div
        ref={scrollContainerRef}
        className="relative max-h-[250px] overflow-y-auto pr-2 pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
      >
        {visibleSteps.map((step, index) => {
          const stepIndex = TIMELINE_STEPS.findIndex(s => s.status === step.status)
          const isPast = stepIndex < currentStatusIndex
          const isCurrent = stepIndex === currentStatusIndex
          const isFuture = stepIndex > currentStatusIndex
          const Icon = step.icon
          const isLast = index === visibleSteps.length - 1

          // Récupère l'événement associé à cette étape (si disponible)
          const event = eventsByStatus.get(step.status)

          return (
            <div
              key={step.status}
              ref={isCurrent ? currentStepRef : undefined}
              className="flex gap-3"
            >
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
                      'w-0.5 flex-1 mt-1 min-h-[24px]',
                      isPast ? 'bg-green-300' : 'bg-slate-200'
                    )}
                  />
                )}
              </div>

              {/* Contenu: Label + Date + Auteur */}
              <div className="flex-1 pb-4">
                {/* Label du statut */}
                <p
                  className={cn(
                    'text-sm font-medium leading-none',
                    isPast && 'text-green-700',
                    isCurrent && (isError ? 'text-red-700' : 'text-blue-700'),
                    isFuture && 'text-slate-400'
                  )}
                >
                  {step.label}
                </p>

                {/* Date et auteur (uniquement pour les étapes passées ou courantes avec événement) */}
                {(isPast || isCurrent) && event && (
                  <div className="mt-1 space-y-0.5">
                    {/* Date et heure */}
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatEventDate(event.date)}
                    </p>

                    {/* Auteur */}
                    {event.author && (
                      <p className="text-[11px] text-slate-500">
                        par <span className="font-medium text-slate-600">{event.author}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Placeholder pour les étapes futures */}
                {isFuture && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    En attente
                  </p>
                )}
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
            <div className="pt-0.5">
              <p className="text-sm text-red-700 font-medium">
                {currentStatus === 'annulee' ? 'Annulée' : 'Rejetée'}
              </p>
              {eventsByStatus.get(currentStatus) && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatEventDate(eventsByStatus.get(currentStatus)!.date)}
                  </p>
                  {eventsByStatus.get(currentStatus)?.author && (
                    <p className="text-[11px] text-slate-500">
                      par <span className="font-medium text-slate-600">
                        {eventsByStatus.get(currentStatus)!.author}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
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
  events,
  variant = 'default',
  className
}: ProgressionTimelineProps) => {
  if (variant === 'compact') {
    return <CompactTimeline currentStatus={currentStatus} className={className} />
  }

  return <DetailedTimeline currentStatus={currentStatus} events={events} className={className} />
}
