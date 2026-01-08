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
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import {
  FileText,
  ListChecks,
  MapPin,
  Building2,
  Home,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  XCircle,
  HelpCircle
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
const getQuotesStatusConfig = (
  status: 'pending' | 'received' | 'approved',
  requestedCount: number = 0,
  receivedCount: number = 0
) => {
  switch (status) {
    case 'approved':
      return {
        icon: CheckCircle2,
        label: 'Devis validé',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      }
    case 'received':
      // Il y a des devis reçus (envoyés par prestataires)
      return {
        icon: FileText,
        label: `${receivedCount} devis reçu${receivedCount > 1 ? 's' : ''}`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      }
    default:
      // Seulement des demandes en attente ou rien
      if (requestedCount > 0) {
        return {
          icon: Clock,
          label: `${requestedCount} demande${requestedCount > 1 ? 's' : ''} en attente`,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50'
        }
      }
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
  const quotesConfig = getQuotesStatusConfig(
    planning.quotesStatus,
    planning.requestedQuotesCount || 0,
    planning.receivedQuotesCount || 0
  )
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
          {/* Badges container */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                planningConfig.bgColor,
                planningConfig.color,
                'border-transparent'
              )}
              aria-label={`Statut planning: ${planningConfig.label}`}
            >
              {planningConfig.label}
            </Badge>

            {/* Badge réponses avec HoverCard */}
            {planning.responseStats && planning.responseStats.totalExpectedResponses > 0 && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-xs bg-slate-100 text-slate-700 border-transparent cursor-help"
                    aria-label={`${planning.responseStats.maxResponsesReceived} réponses sur ${planning.responseStats.totalExpectedResponses}`}
                  >
                    {planning.responseStats.maxResponsesReceived}/{planning.responseStats.totalExpectedResponses} ✓
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-3" align="end">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Réponses par créneau</p>
                    {planning.responseStats.slotDetails.map((slot, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-muted-foreground truncate">
                          {formatDate(slot.slotDate)} {slot.startTime.substring(0, 5)}-{slot.endTime.substring(0, 5)}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {slot.accepted > 0 && (
                            <span className="text-green-600 flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              {slot.accepted}
                            </span>
                          )}
                          {slot.rejected > 0 && (
                            <span className="text-red-600 flex items-center gap-0.5">
                              <XCircle className="h-3 w-3" aria-hidden="true" />
                              {slot.rejected}
                            </span>
                          )}
                          {slot.pending > 0 && (
                            <span className="text-amber-600 flex items-center gap-0.5">
                              <HelpCircle className="h-3 w-3" aria-hidden="true" />
                              {slot.pending}
                            </span>
                          )}
                          {slot.accepted === 0 && slot.rejected === 0 && slot.pending === 0 && (
                            <span className="text-slate-400 text-xs">Aucune</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
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
          ) : planning.receivedQuotesCount && planning.receivedQuotesCount > 0 ? (
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-600 border-transparent shrink-0"
              aria-label={`${planning.receivedQuotesCount} devis reçu${planning.receivedQuotesCount > 1 ? 's' : ''}`}
            >
              {planning.receivedQuotesCount} reçu{planning.receivedQuotesCount > 1 ? 's' : ''}
            </Badge>
          ) : planning.requestedQuotesCount && planning.requestedQuotesCount > 0 ? (
            <Badge
              variant="outline"
              className="text-xs bg-amber-50 text-amber-600 border-transparent shrink-0"
              aria-label={`${planning.requestedQuotesCount} demande${planning.requestedQuotesCount > 1 ? 's' : ''} en attente`}
            >
              {planning.requestedQuotesCount} demande{planning.requestedQuotesCount > 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs bg-slate-100 text-slate-500 border-transparent shrink-0"
              aria-label="Aucun devis"
            >
              Aucun
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
  title: _title, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for future use
  description,
  instructions,
  location,
  locationDetails,
  planning,
  createdBy,
  createdAt,
  onNavigateToPlanning,
  className
}: InterventionDetailsCardProps) => {
  const hasLocationDetails = locationDetails?.buildingName || locationDetails?.lotReference || locationDetails?.fullAddress
  const hasContent = description || instructions || location || hasLocationDetails || planning || createdBy || createdAt

  if (!hasContent) {
    return null
  }

  return (
    <Card className={cn('w-full', className)}>

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

        {/* Localisation détaillée (immeuble, lot, adresse) */}
        {hasLocationDetails && (
          <>
            {description && <Separator />}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Localisation
              </h4>
              {/* Desktop: une ligne | Mobile: plusieurs lignes */}
              <div className="flex items-center gap-1.5 text-sm flex-wrap">
                {/* Immeuble */}
                {locationDetails?.buildingName && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium">{locationDetails.buildingName}</span>
                  </div>
                )}
                {/* Séparateur */}
                {locationDetails?.buildingName && locationDetails?.lotReference && (
                  <span className="text-muted-foreground">›</span>
                )}
                {/* Lot */}
                {locationDetails?.lotReference && (
                  <div className="flex items-center gap-1.5">
                    <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <span>Lot {locationDetails.lotReference}</span>
                  </div>
                )}
                {/* Séparateur adresse */}
                {(locationDetails?.buildingName || locationDetails?.lotReference) && locationDetails?.fullAddress && (
                  <span className="text-muted-foreground hidden sm:inline">•</span>
                )}
                {/* Adresse complète */}
                {locationDetails?.fullAddress && (
                  <div className="flex items-center gap-1.5 text-muted-foreground w-full sm:w-auto">
                    <MapPin className="h-4 w-4 flex-shrink-0 sm:hidden" aria-hidden="true" />
                    <span>{locationDetails.fullAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Instructions pour le prestataire */}
        {instructions && (
          <>
            {(description || hasLocationDetails) && <Separator />}
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                Instructions
              </h4>
              <p className="text-sm leading-relaxed">{instructions}</p>
            </div>
          </>
        )}

        {/* Localisation simple (fallback si pas de locationDetails) */}
        {location && !hasLocationDetails && (
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
            {(description || hasLocationDetails || instructions || location) && <Separator />}
            <PlanningStatusSection
              planning={planning}
              onNavigateToPlanning={onNavigateToPlanning}
            />
          </>
        )}

        {/* Section Créateur et Date */}
        {(createdBy || createdAt) && (
          <>
            {(description || hasLocationDetails || instructions || location || planning) && <Separator />}
            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Créé par</span>
              {createdBy && (
                <span className="font-medium text-foreground">{createdBy}</span>
              )}
              {createdAt && (
                <>
                  <span>le</span>
                  <span className="font-medium text-foreground">{formatDate(createdAt)}</span>
                </>
              )}
            </div>
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
