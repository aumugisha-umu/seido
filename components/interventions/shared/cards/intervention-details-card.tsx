'use client'

/**
 * InterventionDetailsCard - Card affichant les détails d'une intervention
 * avec section planification intégrée
 *
 * @example
 * <InterventionDetailsCard
 *   title="Détails de l'intervention"
 *   description="Fuite importante sous l'évier de la cuisine"
 *   instructions="Merci de prévoir des joints de rechange"
 *   location="Appartement 3A, 15 rue de la Paix"
 *   planning={{
 *     status: 'scheduled',
 *     scheduledDate: '2025-01-20',
 *     quotesStatus: 'approved',
 *     quotesCount: 2,
 *     selectedQuoteAmount: 450
 *   }}
 * />
 */

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  ListChecks,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { InterventionDetailsCardProps } from '../types'
import { formatDate, formatAmount } from '../utils/helpers'

/**
 * Configuration du statut planning
 */
const getPlanningStatusConfig = (status: 'pending' | 'proposed' | 'scheduled' | 'completed', proposedCount?: number) => {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle2,
        label: 'Terminée',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: 'Intervention terminée'
      }
    case 'scheduled':
      return {
        icon: Calendar,
        label: 'Confirmé',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        description: 'Créneau confirmé'
      }
    case 'proposed':
      return {
        icon: Clock,
        label: proposedCount && proposedCount > 1 ? `${proposedCount} créneaux` : '1 créneau',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        description: proposedCount && proposedCount > 1
          ? `${proposedCount} créneaux proposés`
          : '1 créneau proposé'
      }
    default:
      return {
        icon: AlertCircle,
        label: 'En attente',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        description: 'Aucun créneau proposé'
      }
  }
}

/**
 * Configuration du statut devis
 */
const getQuotesStatusConfig = (status: 'pending' | 'received' | 'approved', count: number) => {
  switch (status) {
    case 'approved':
      return {
        icon: CheckCircle2,
        label: 'Devis validé',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      }
    case 'received':
      return {
        icon: FileText,
        label: `${count} devis reçu${count > 1 ? 's' : ''}`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      }
    default:
      return {
        icon: AlertCircle,
        label: 'En attente',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      }
  }
}

/**
 * Section Planification - Cliquable pour naviguer vers l'onglet Planning et Devis
 */
interface PlanningStatusSectionProps {
  planning: NonNullable<InterventionDetailsCardProps['planning']>
  onNavigateToPlanning?: () => void
}

const PlanningStatusSection = ({ planning, onNavigateToPlanning }: PlanningStatusSectionProps) => {
  const planningConfig = getPlanningStatusConfig(planning.status, planning.proposedSlotsCount)
  const quotesConfig = getQuotesStatusConfig(planning.quotesStatus, planning.quotesCount || 0)
  const PlanningIcon = planningConfig.icon
  const QuotesIcon = quotesConfig.icon

  const isClickable = !!onNavigateToPlanning

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Planning et Devis
        </h4>
        {isClickable && (
          <button
            onClick={onNavigateToPlanning}
            className="text-xs text-primary hover:underline"
          >
            Voir détails →
          </button>
        )}
      </div>

      {/* Grid Planning + Devis - Cliquable */}
      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 gap-3',
          isClickable && 'cursor-pointer'
        )}
        onClick={isClickable ? onNavigateToPlanning : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => e.key === 'Enter' && onNavigateToPlanning?.() : undefined}
      >
        {/* Planning Status */}
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg bg-slate-50 transition-colors',
          isClickable && 'hover:bg-slate-100'
        )}>
          <div
            className={cn(
              'flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0',
              planningConfig.bgColor
            )}
          >
            <PlanningIcon className={cn('h-4 w-4', planningConfig.color)} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Planning</p>
            <p className="text-xs text-muted-foreground truncate">
              {planning.scheduledDate
                ? formatDate(planning.scheduledDate)
                : planningConfig.description}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs shrink-0',
              planningConfig.bgColor,
              planningConfig.color,
              'border-transparent'
            )}
            aria-label={`Statut planning: ${planningConfig.label}`}
          >
            {planningConfig.label}
          </Badge>
        </div>

        {/* Devis Status */}
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg bg-slate-50 transition-colors',
          isClickable && 'hover:bg-slate-100'
        )}>
          <div
            className={cn(
              'flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0',
              quotesConfig.bgColor
            )}
          >
            <QuotesIcon className={cn('h-4 w-4', quotesConfig.color)} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Devis</p>
            <p className="text-xs text-muted-foreground truncate">
              {planning.selectedQuoteAmount
                ? formatAmount(planning.selectedQuoteAmount)
                : quotesConfig.label}
            </p>
          </div>
          {planning.selectedQuoteAmount ? (
            <Badge
              variant="outline"
              className="text-xs bg-green-50 text-green-600 border-transparent shrink-0"
              aria-label="Devis validé"
            >
              Validé
            </Badge>
          ) : planning.quotesCount && planning.quotesCount > 0 ? (
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-600 border-transparent shrink-0"
              aria-label={`${planning.quotesCount} devis reçu${planning.quotesCount > 1 ? 's' : ''}`}
            >
              {planning.quotesCount} reçu{planning.quotesCount > 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs bg-amber-50 text-amber-600 border-transparent shrink-0"
              aria-label="Devis en attente"
            >
              En attente
            </Badge>
          )}
        </div>
      </div>

      {/* Montant validé (highlight) */}
      {planning.selectedQuoteAmount && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50 border border-green-100">
          <span className="text-sm font-medium text-muted-foreground">
            Montant validé
          </span>
          <span className="text-lg font-bold text-green-700">
            {formatAmount(planning.selectedQuoteAmount)}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Card de détails d'intervention avec planification intégrée
 */
export const InterventionDetailsCard = ({
  title,
  description,
  instructions,
  location,
  planning,
  onNavigateToPlanning,
  className
}: InterventionDetailsCardProps) => {
  const hasContent = description || instructions || location || planning

  if (!hasContent) {
    return null
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title || "Détails de l'intervention"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {description && (
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-muted-foreground">
              Description
            </h4>
            <p className="text-sm leading-relaxed">{description}</p>
          </div>
        )}

        {/* Instructions pour le prestataire */}
        {instructions && (
          <>
            {description && <Separator />}
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                Instructions
              </h4>
              <p className="text-sm leading-relaxed">{instructions}</p>
            </div>
          </>
        )}

        {/* Localisation */}
        {location && (
          <>
            {(description || instructions) && <Separator />}
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Localisation
              </h4>
              <p className="text-sm">{location}</p>
            </div>
          </>
        )}

        {/* Section Planification */}
        {planning && (
          <>
            {(description || instructions || location) && <Separator />}
            <PlanningStatusSection
              planning={planning}
              onNavigateToPlanning={onNavigateToPlanning}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Version compacte de la card de détails
 */
export interface CompactDetailsCardProps {
  description?: string
  location?: string
  className?: string
}

export const CompactDetailsCard = ({
  description,
  location,
  className
}: CompactDetailsCardProps) => {
  return (
    <div className={cn('p-4 bg-slate-50 rounded-lg space-y-3', className)}>
      {description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
          <p className="text-sm line-clamp-3">{description}</p>
        </div>
      )}

      {location && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{location}</span>
        </div>
      )}
    </div>
  )
}
