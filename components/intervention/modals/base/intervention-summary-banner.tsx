'use client'

/**
 * InterventionSummaryBanner
 * Reusable intervention summary card shown in modal headers
 *
 * Supports 3 variants:
 * - default: White background with border (programming modal style)
 * - gradient: Gradient background (quote submission style)
 * - minimal: Text only, no card wrapper
 */

import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InterventionData, ModalBadge, ContextInfoItem, SummaryVariant } from './types'

interface InterventionSummaryBannerProps {
  // Core data
  intervention: InterventionData

  // Badges configuration
  badges?: ModalBadge[]

  // Context info configuration (overrides default)
  contextInfo?: ContextInfoItem[]

  // Additional custom content below context info
  additionalContent?: React.ReactNode

  // Styling
  variant?: SummaryVariant
  showDescription?: boolean
  compact?: boolean
  className?: string
}

// Helper: Get priority colors
const getPriorityColor = (priority: string) => {
  const p = priority?.toLowerCase() || 'normale'
  if (p === 'urgente') return 'bg-red-100 text-red-800 border-red-200'
  if (p === 'haute') return 'bg-orange-100 text-orange-800 border-orange-200'
  if (p === 'normale') return 'bg-blue-100 text-blue-800 border-blue-200'
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

// Helper: Get priority label
const getPriorityLabel = (priority: string) => {
  const p = priority?.toLowerCase() || 'normale'
  if (p === 'urgente') return 'Urgente'
  if (p === 'haute') return 'Haute'
  if (p === 'normale') return 'Normale'
  return priority
}

// Helper: Get status colors
const getStatusColor = (status: string) => {
  const s = status?.toLowerCase() || ''
  if (s === 'approuvee' || s === 'approuvée') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (s === 'planifiee' || s === 'planifiée' || s === 'planification') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (s === 'en_cours' || s === 'en cours') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (s === 'demande') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

// Helper: Get status dot color
const getStatusDotColor = (status: string) => {
  const s = status?.toLowerCase() || ''
  if (s === 'approuvee' || s === 'approuvée') return 'bg-emerald-500'
  if (s === 'planifiee' || s === 'planifiée' || s === 'planification') return 'bg-blue-500'
  if (s === 'en_cours' || s === 'en cours') return 'bg-blue-600'
  if (s === 'demande') return 'bg-amber-500'
  return 'bg-slate-500'
}

// Helper: Get location text
const getLocationText = (intervention: InterventionData): string => {
  if (intervention.lot) {
    const building = intervention.lot.building_id ? intervention.building?.name : ''
    return building
      ? `${intervention.lot.reference} - ${building}`
      : intervention.lot.reference
  }
  if (intervention.building) {
    return intervention.building.name
  }
  return 'Localisation non spécifiée'
}

// Helper: Get location icon
const getLocationIcon = (intervention: InterventionData) => {
  return intervention.building ? Building2 : MapPin
}

export function InterventionSummaryBanner({
  intervention,
  badges,
  contextInfo,
  additionalContent,
  variant = 'default',
  showDescription = false,
  compact = true,
  className
}: InterventionSummaryBannerProps) {

  // Build default context info if not provided
  const defaultContextInfo: ContextInfoItem[] = [
    {
      icon: getLocationIcon(intervention),
      label: 'Localisation',
      value: getLocationText(intervention)
    },
    ...(intervention.created_by ? [{
      icon: User,
      label: 'Créée par',
      value: intervention.created_by
    }] : []),
    ...(intervention.created_at ? [{
      icon: Calendar,
      label: 'Créé le',
      value: new Date(intervention.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }] : [])
  ]

  const contextItems = contextInfo || defaultContextInfo

  // Wrapper classes based on variant
  const wrapperClass = cn(
    variant === 'default' && 'bg-white border-slate-200',
    variant === 'gradient' && 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    variant === 'minimal' && 'bg-transparent border-transparent',
    variant !== 'minimal' && 'border rounded-lg',
    compact ? 'p-4' : 'p-6',
    className
  )

  return (
    <div className={wrapperClass}>
      <div className="text-center">
        {/* Title and Badges Row */}
        <div className="flex items-center justify-center space-x-3 mb-2 flex-wrap">
          <h2 className={cn(
            'font-bold text-slate-900 truncate',
            compact ? 'text-lg' : 'text-xl'
          )}>
            {intervention.title || 'Sans titre'}
          </h2>

          {/* Badges */}
          {badges && badges.map((badge, index) => {
            const BadgeIcon = badge.icon
            const badgeColor = badge.type === 'status'
              ? getStatusColor(badge.label)
              : badge.type === 'priority'
                ? getPriorityColor(badge.label)
                : badge.color || 'bg-slate-100 text-slate-800 border-slate-200'

            const dotColor = badge.type === 'status'
              ? getStatusDotColor(badge.label)
              : badge.type === 'priority'
                ? (badge.label?.toLowerCase() === 'urgente' ? 'bg-red-500' :
                   badge.label?.toLowerCase() === 'haute' ? 'bg-orange-500' : 'bg-blue-500')
                : 'bg-slate-500'

            const displayLabel = badge.type === 'priority'
              ? getPriorityLabel(badge.label)
              : badge.label

            return (
              <Badge
                key={index}
                className={cn(
                  'flex items-center space-x-1 font-medium border',
                  badgeColor
                )}
              >
                {BadgeIcon ? (
                  <BadgeIcon className="h-3 w-3" />
                ) : (
                  <div className={cn('w-2 h-2 rounded-full', dotColor)} />
                )}
                <span>{displayLabel}</span>
              </Badge>
            )
          })}
        </div>

        {/* Description (optional) */}
        {showDescription && intervention.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
            {intervention.description}
          </p>
        )}

        {/* Context Info Row */}
        {contextItems.length > 0 && (
          <div className="flex items-center justify-center space-x-4 text-sm text-slate-600 flex-wrap gap-2">
            {contextItems.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="flex items-center space-x-1">
                  <Icon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-xs">{item.value}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Additional Content */}
        {additionalContent && (
          <div className="mt-4">
            {additionalContent}
          </div>
        )}
      </div>
    </div>
  )
}
