'use client'

/**
 * Status Timeline Component
 * Visual timeline showing intervention status progression
 */

import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Circle,
  XCircle,
  Clock,
  FileText,
  Calendar,
  Flag
} from 'lucide-react'
import type { Database } from '@/lib/database.types'

type InterventionStatus = Database['public']['Enums']['intervention_status']

interface TimelineStep {
  status: InterventionStatus
  label: string
  icon: typeof Circle
  date?: string | null
  description?: string
}

interface StatusTimelineProps {
  currentStatus: InterventionStatus
  createdAt?: string | null
  scheduledDate?: string | null
  completedDate?: string | null
  rejectedAt?: string | null
  cancelledAt?: string | null
  onStepClick?: (status: InterventionStatus) => void
}

// Status flow definition
const statusFlow: Record<InterventionStatus, TimelineStep> = {
  'demande': {
    status: 'demande',
    label: 'Demande créée',
    icon: Circle,
    description: "La demande d'intervention a été créée"
  },
  'rejetee': {
    status: 'rejetee',
    label: 'Rejetée',
    icon: XCircle,
    description: "La demande a été rejetée par le gestionnaire"
  },
  'approuvee': {
    status: 'approuvee',
    label: 'Approuvée',
    icon: CheckCircle,
    description: "La demande a été approuvée et peut être planifiée"
  },
  'demande_de_devis': {
    status: 'demande_de_devis',
    label: 'Devis demandé',
    icon: FileText,
    description: "Un devis a été demandé au prestataire"
  },
  'planification': {
    status: 'planification',
    label: 'En planification',
    icon: Calendar,
    description: "L'intervention est en cours de planification"
  },
  'planifiee': {
    status: 'planifiee',
    label: 'Planifiée',
    icon: Clock,
    description: "L'intervention est planifiée à une date précise"
  },
  'cloturee_par_prestataire': {
    status: 'cloturee_par_prestataire',
    label: 'Terminée (prestataire)',
    icon: CheckCircle,
    description: "Le prestataire a terminé l'intervention"
  },
  'cloturee_par_locataire': {
    status: 'cloturee_par_locataire',
    label: 'Validée (locataire)',
    icon: CheckCircle,
    description: "Le locataire a validé les travaux"
  },
  'cloturee_par_gestionnaire': {
    status: 'cloturee_par_gestionnaire',
    label: 'Clôturée',
    icon: Flag,
    description: "L'intervention est définitivement clôturée"
  },
  'annulee': {
    status: 'annulee',
    label: 'Annulée',
    icon: XCircle,
    description: "L'intervention a été annulée"
  }
}

// Main workflow path (excludes rejected/cancelled)
// Workflow: planifiee → cloturee_par_prestataire (no intermediate status)
const mainWorkflow: InterventionStatus[] = [
  'demande',
  'approuvee',
  'planification',
  'planifiee',
  'cloturee_par_prestataire',
  'cloturee_par_locataire',
  'cloturee_par_gestionnaire'
]

// Determine if status is in main workflow
function isInMainWorkflow(status: InterventionStatus): boolean {
  return mainWorkflow.includes(status)
}

// Get status index in workflow
function getStatusIndex(status: InterventionStatus): number {
  const index = mainWorkflow.indexOf(status)
  return index !== -1 ? index : -1
}

export function StatusTimeline({
  currentStatus,
  createdAt,
  scheduledDate,
  completedDate,
  rejectedAt,
  cancelledAt,
  onStepClick
}: StatusTimelineProps) {
  const currentIndex = getStatusIndex(currentStatus)
  const isMainPath = isInMainWorkflow(currentStatus)

  // Determine which steps to show based on current status
  const stepsToShow = (() => {
    if (currentStatus === 'rejetee') {
      return ['demande', 'rejetee']
    }
    if (currentStatus === 'annulee') {
      // Show steps up to where it was cancelled
      const lastCompletedIndex = currentIndex > -1 ? currentIndex : 2
      return [...mainWorkflow.slice(0, lastCompletedIndex + 1), 'annulee']
    }
    // For normal workflow, show completed steps + next step
    if (isMainPath) {
      return mainWorkflow.slice(0, Math.max(currentIndex + 2, 3))
    }
    return mainWorkflow.slice(0, 3)
  })()

  // Format date
  const formatDate = (date: string | null | undefined) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get step state
  const getStepState = (step: InterventionStatus): 'completed' | 'current' | 'upcoming' | 'cancelled' | 'rejected' => {
    if (step === 'rejetee' && currentStatus === 'rejetee') return 'rejected'
    if (step === 'annulee' && currentStatus === 'annulee') return 'cancelled'
    if (step === currentStatus) return 'current'

    const stepIndex = getStatusIndex(step)
    if (stepIndex !== -1 && currentIndex !== -1 && stepIndex < currentIndex) {
      return 'completed'
    }

    return 'upcoming'
  }

  // Get step date
  const getStepDate = (step: InterventionStatus): string | null => {
    switch (step) {
      case 'demande':
        return formatDate(createdAt)
      case 'planifiee':
        return formatDate(scheduledDate)
      case 'cloturee_par_gestionnaire':
        return formatDate(completedDate)
      case 'rejetee':
        return formatDate(rejectedAt)
      case 'annulee':
        return formatDate(cancelledAt)
      default:
        return null
    }
  }

  return (
    <div className="relative">
      <div className="space-y-8">
        {stepsToShow.map((stepStatus, index) => {
          const step = statusFlow[stepStatus]
          const state = getStepState(stepStatus)
          const date = getStepDate(stepStatus)
          const Icon = step.icon
          const isLast = index === stepsToShow.length - 1

          return (
            <div key={step.status} className="relative flex items-start gap-4">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-4 top-8 w-0.5 h-full -bottom-4",
                    state === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}

              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white transition-colors",
                  state === 'completed' && 'border-green-500 bg-green-50',
                  state === 'current' && 'border-blue-500 bg-blue-50 ring-4 ring-blue-100',
                  state === 'upcoming' && 'border-gray-300 bg-gray-50',
                  state === 'rejected' && 'border-red-500 bg-red-50',
                  state === 'cancelled' && 'border-orange-500 bg-orange-50',
                  onStepClick && 'cursor-pointer hover:scale-110'
                )}
                onClick={() => onStepClick?.(step.status)}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    state === 'completed' && 'text-green-500',
                    state === 'current' && 'text-blue-500',
                    state === 'upcoming' && 'text-gray-400',
                    state === 'rejected' && 'text-red-500',
                    state === 'cancelled' && 'text-orange-500'
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2">
                  <h4
                    className={cn(
                      "text-sm font-medium",
                      state === 'completed' && 'text-green-700',
                      state === 'current' && 'text-blue-700',
                      state === 'upcoming' && 'text-gray-500',
                      state === 'rejected' && 'text-red-700',
                      state === 'cancelled' && 'text-orange-700'
                    )}
                  >
                    {step.label}
                  </h4>
                  {state === 'current' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Actuel
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                )}
                {date && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Clock className="inline-block w-3 h-3 mr-1" />
                    {date}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}