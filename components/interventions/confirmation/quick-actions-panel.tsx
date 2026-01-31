'use client'

/**
 * Quick Actions Panel Component
 *
 * Post-creation engagement actions to increase user satisfaction
 * and reduce support requests.
 *
 * @see docs/design/persona-locataire.md - Emma wants self-service options
 */

import {
  Bell,
  MessageSquare,
  Calendar,
  Copy,
  Download,
  ChevronRight,
  Zap,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAction {
  icon: React.ElementType
  label: string
  description: string
  onClick?: () => void
  href?: string
  disabled?: boolean
}

interface QuickActionsPanelProps {
  variant: 'tenant' | 'manager'
  onContactManager?: () => void
  onUpdateAvailability?: () => void
  onEnableNotifications?: () => void
  onDuplicate?: () => void
  onExportPdf?: () => void
  onGoToDashboard?: () => void
  className?: string
}

export function QuickActionsPanel({
  variant,
  onContactManager,
  onUpdateAvailability,
  onEnableNotifications,
  onDuplicate,
  onExportPdf,
  onGoToDashboard,
  className,
}: QuickActionsPanelProps) {
  const tenantActions: QuickAction[] = [
    {
      icon: Bell,
      label: 'Activer les notifications',
      description: 'Soyez alerté à chaque étape',
      onClick: onEnableNotifications,
    },
    {
      icon: MessageSquare,
      label: 'Contacter le gestionnaire',
      description: 'Besoin de précisions ?',
      onClick: onContactManager,
    },
    {
      icon: Home,
      label: 'Retour à l\'accueil',
      description: 'Voir toutes vos demandes',
      onClick: onGoToDashboard,
    },
  ]

  const managerActions: QuickAction[] = [
    {
      icon: Copy,
      label: 'Créer une intervention similaire',
      description: 'Dupliquer les paramètres',
      onClick: onDuplicate,
    },
    {
      icon: Download,
      label: 'Exporter en PDF',
      description: 'Télécharger un récapitulatif',
      onClick: onExportPdf,
    },
    {
      icon: Home,
      label: 'Retour au tableau de bord',
      description: 'Voir toutes les interventions',
      onClick: onGoToDashboard,
    },
  ]

  const actions = variant === 'tenant' ? tenantActions : managerActions

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section Header */}
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5" />
        Actions rapides
      </h4>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 gap-2">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                "flex items-start gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-left transition-all group",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                "active:scale-[0.98]",
                action.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Icon container */}
              <div className="flex-shrink-0 w-9 h-9 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                <Icon className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-900 group-hover:text-primary transition-colors">
                  {action.label}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {action.description}
                </div>
              </div>

              {/* Chevron indicator */}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
