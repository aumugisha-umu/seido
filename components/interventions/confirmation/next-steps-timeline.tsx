'use client'

/**
 * Next Steps Timeline Component
 *
 * Shows what will happen after intervention creation.
 * Addresses Emma's frustration #1: "Je ne sais jamais où en est ma demande"
 *
 * @see docs/design/persona-locataire.md - Benchmark: Deliveroo (8 étapes visibles)
 */

import {
  CheckCircle2,
  Eye,
  UserCog,
  Calendar,
  Wrench,
  Clock,
  Send,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type StepStatus = 'completed' | 'current' | 'upcoming'

interface TimelineStep {
  id: string
  label: string
  description: string
  icon: React.ElementType
  status: StepStatus
}

interface NextStepsTimelineProps {
  variant: 'tenant' | 'manager'
  className?: string
}

const TENANT_STEPS: TimelineStep[] = [
  {
    id: '1',
    label: 'Demande envoyée',
    description: 'Votre demande a été enregistrée avec succès',
    icon: Send,
    status: 'completed',
  },
  {
    id: '2',
    label: 'Analyse par le gestionnaire',
    description: 'Votre gestionnaire va étudier votre demande',
    icon: Eye,
    status: 'current',
  },
  {
    id: '3',
    label: 'Technicien assigné',
    description: 'Un prestataire qualifié sera contacté',
    icon: UserCog,
    status: 'upcoming',
  },
  {
    id: '4',
    label: 'Rendez-vous planifié',
    description: 'Vous recevrez une proposition de créneau',
    icon: Calendar,
    status: 'upcoming',
  },
  {
    id: '5',
    label: 'Intervention réalisée',
    description: 'Le technicien effectuera la réparation',
    icon: Wrench,
    status: 'upcoming',
  },
]

const MANAGER_STEPS: TimelineStep[] = [
  {
    id: '1',
    label: 'Intervention créée',
    description: 'Tous les participants ont été notifiés',
    icon: CheckCircle2,
    status: 'completed',
  },
  {
    id: '2',
    label: 'Confirmations attendues',
    description: 'Les prestataires vont confirmer leur disponibilité',
    icon: Bell,
    status: 'current',
  },
  {
    id: '3',
    label: 'Planification finale',
    description: 'Coordonner le rendez-vous avec le locataire',
    icon: Calendar,
    status: 'upcoming',
  },
]

export function NextStepsTimeline({ variant, className }: NextStepsTimelineProps) {
  const steps = variant === 'tenant' ? TENANT_STEPS : MANAGER_STEPS

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section Header */}
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        Prochaines étapes
      </h4>

      {/* Timeline */}
      <div className="relative pl-6 space-y-4">
        {/* Vertical connecting line */}
        <div
          className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gradient-to-b from-green-300 via-blue-300 to-slate-200"
          aria-hidden="true"
        />

        {steps.map((step, idx) => {
          const Icon = step.icon
          const isLast = idx === steps.length - 1

          return (
            <div
              key={step.id}
              className={cn(
                "relative animate-in fade-in slide-in-from-left-2",
                // Staggered animation delay
              )}
              style={{ animationDelay: `${idx * 100}ms` }}
              role="listitem"
              aria-current={step.status === 'current' ? 'step' : undefined}
            >
              {/* Dot indicator */}
              <div
                className={cn(
                  "absolute -left-6 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white",
                  step.status === 'completed' && "border-green-500 bg-green-50",
                  step.status === 'current' && "border-blue-500 bg-blue-50 ring-4 ring-blue-100",
                  step.status === 'upcoming' && "border-slate-300 bg-slate-50"
                )}
              >
                {step.status === 'completed' && (
                  <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />
                )}
                {step.status === 'current' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>

              {/* Content */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        "w-3 h-3",
                        step.status === 'completed' && "text-green-600",
                        step.status === 'current' && "text-blue-600",
                        step.status === 'upcoming' && "text-slate-400"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        step.status === 'completed' && "text-green-700",
                        step.status === 'current' && "text-blue-700",
                        step.status === 'upcoming' && "text-slate-500"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                </div>

                <p className="text-[10px] text-slate-600 leading-snug pl-4.5">
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reassurance message for tenants */}
      {variant === 'tenant' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 flex items-start gap-2">
            <Bell className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Vous recevrez une notification à chaque étape. Pas besoin de relancer !
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
