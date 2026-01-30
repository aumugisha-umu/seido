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
import { formatDate, formatAmount, formatTime, formatTimeRange } from '../utils/helpers'
import { GoogleMapPreview } from '@/components/google-maps/google-map-preview'
import { ParticipantsRow } from '../layout/participants-row'

/**
 * Configuration du statut planning
 * @param status - Statut du planning (pending, proposed, scheduled, completed)
 * @param interventionStatus - Statut de l'intervention pour affichage contextuel
 * @param proposedCount - Nombre de créneaux proposés
 */
const getPlanningStatusConfig = (
  status: 'pending' | 'proposed' | 'scheduled' | 'completed',
  interventionStatus?: string,
  proposedCount?: number
) => {
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
      // Statut 'pending' - Affichage contextuel selon le statut de l'intervention
      if (interventionStatus === 'demande') {
        return {
          icon: HelpCircle,
          label: 'Après approbation',
          color: 'text-slate-500',
          bgColor: 'bg-slate-50',
          description: null // Pas de description redondante
        }
      }
      if (interventionStatus === 'rejetee') {
        return {
          icon: XCircle,
          label: 'Non applicable',
          color: 'text-slate-500',
          bgColor: 'bg-slate-50',
          description: null // Pas de description redondante
        }
      }
      // Statuts approuvee, planification, planifiee, etc.
      return {
        icon: AlertCircle,
        label: 'En attente',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        description: null // Pas de description redondante
      }
  }
}

/**
 * Configuration du statut estimation
 * @param status - Statut des devis (pending, received, approved)
 * @param interventionStatus - Statut de l'intervention pour affichage contextuel
 * @param requestedCount - Nombre de demandes de devis en attente
 * @param receivedCount - Nombre de devis reçus
 */
const getQuotesStatusConfig = (
  status: 'pending' | 'received' | 'approved',
  interventionStatus?: string,
  requestedCount: number = 0,
  receivedCount: number = 0
) => {
  switch (status) {
    case 'approved':
      return {
        icon: CheckCircle2,
        label: 'Estimation validée',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      }
    case 'received':
      // Il y a des estimations reçues (envoyées par prestataires)
      return {
        icon: FileText,
        label: `${receivedCount} estimation${receivedCount > 1 ? 's' : ''} reçue${receivedCount > 1 ? 's' : ''}`,
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
      // Affichage contextuel selon le statut de l'intervention
      if (interventionStatus === 'demande') {
        return {
          icon: HelpCircle,
          label: 'Après approbation',
          color: 'text-slate-500',
          bgColor: 'bg-slate-50'
        }
      }
      if (interventionStatus === 'rejetee') {
        return {
          icon: XCircle,
          label: 'Non applicable',
          color: 'text-slate-500',
          bgColor: 'bg-slate-50'
        }
      }
      // Statuts approuvee, planification, planifiee, etc.
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
  interventionStatus?: string
  onNavigateToPlanning?: () => void
}

const PlanningStatusSection = ({ planning, interventionStatus, onNavigateToPlanning }: PlanningStatusSectionProps) => {
  const planningConfig = getPlanningStatusConfig(planning.status, interventionStatus, planning.proposedSlotsCount)
  const quotesConfig = getQuotesStatusConfig(
    planning.quotesStatus,
    interventionStatus,
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
          Planning et Estimations
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
            {(planning.scheduledDate || planningConfig.description) && (
              <p className="text-xs text-muted-foreground truncate">
                {planning.scheduledDate
                  ? `${formatDate(planning.scheduledDate)}${planning.scheduledStartTime
                      ? planning.isFixedScheduling
                        ? ` • ${formatTime(planning.scheduledStartTime)}`  // Mode date fixe: seulement l'heure de début
                        : planning.scheduledEndTime
                          ? ` • ${formatTimeRange(planning.scheduledStartTime, planning.scheduledEndTime)}`
                          : ` • ${formatTime(planning.scheduledStartTime)}`
                      : ''}`
                  : planningConfig.description}
              </p>
            )}
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

        {/* Estimation Status */}
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
            <p className="text-sm font-medium">Estimation</p>
            {planning.selectedQuoteAmount && (
              <p className="text-xs text-muted-foreground truncate">
                {formatAmount(planning.selectedQuoteAmount)}
              </p>
            )}
          </div>
          {planning.selectedQuoteAmount ? (
            <Badge
              variant="outline"
              className="text-xs bg-green-50 text-green-600 border-transparent shrink-0"
              aria-label="Estimation validée"
            >
              Validée
            </Badge>
          ) : planning.receivedQuotesCount && planning.receivedQuotesCount > 0 ? (
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-600 border-transparent shrink-0"
              aria-label={`${planning.receivedQuotesCount} estimation${planning.receivedQuotesCount > 1 ? 's' : ''} reçue${planning.receivedQuotesCount > 1 ? 's' : ''}`}
            >
              {planning.receivedQuotesCount} reçue{planning.receivedQuotesCount > 1 ? 's' : ''}
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
              className={cn(
                'text-xs border-transparent shrink-0',
                quotesConfig.bgColor,
                quotesConfig.color
              )}
              aria-label={quotesConfig.label}
            >
              {quotesConfig.label}
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
  interventionStatus,
  planning,
  participants,
  currentUserId,
  currentUserRole,
  onOpenChat,
  createdBy,
  createdAt,
  onNavigateToPlanning,
  className
}: InterventionDetailsCardProps) => {
  const hasLocationDetails = locationDetails?.buildingName || locationDetails?.lotReference || locationDetails?.fullAddress
  const hasParticipants = participants && (
    participants.managers.length > 0 ||
    participants.providers.length > 0 ||
    participants.tenants.length > 0
  )
  const hasContent = hasParticipants || description || instructions || location || hasLocationDetails || planning || createdBy || createdAt

  if (!hasContent) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
        {/* Participants */}
        {hasParticipants && participants && (
          <ParticipantsRow
            participants={participants}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onOpenChat={onOpenChat}
          />
        )}

        {/* Description */}
        {description && (
          <>
            {hasParticipants && <Separator />}
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground">
                Description
              </h4>
              <p className="text-sm leading-relaxed">{description}</p>
            </div>
          </>
        )}

        {/* Localisation détaillée (immeuble, lot, adresse) avec carte */}
        {hasLocationDetails && (
          <>
            {(hasParticipants || description) && <Separator />}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Localisation
              </h4>
              {/* Infos texte : Immeuble, Lot, Adresse */}
              <div className="flex items-center gap-1.5 text-sm flex-wrap">
                {locationDetails?.buildingName && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium">{locationDetails.buildingName}</span>
                  </div>
                )}
                {locationDetails?.buildingName && locationDetails?.lotReference && (
                  <span className="text-muted-foreground">›</span>
                )}
                {locationDetails?.lotReference && (
                  <div className="flex items-center gap-1.5">
                    <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <span>Lot {locationDetails.lotReference}</span>
                  </div>
                )}
                {(locationDetails?.buildingName || locationDetails?.lotReference) && locationDetails?.fullAddress && (
                  <span className="text-muted-foreground hidden sm:inline">•</span>
                )}
                {locationDetails?.fullAddress && (
                  <div className="flex items-center gap-1.5 text-muted-foreground w-full sm:w-auto">
                    <MapPin className="h-4 w-4 flex-shrink-0 sm:hidden" aria-hidden="true" />
                    <span>{locationDetails.fullAddress}</span>
                  </div>
                )}
              </div>
              {/* Carte Google Maps pleine largeur */}
              {locationDetails?.latitude && locationDetails?.longitude &&
               !(locationDetails.latitude === 0 && locationDetails.longitude === 0) && (
                <GoogleMapPreview
                  latitude={locationDetails.latitude}
                  longitude={locationDetails.longitude}
                  address={locationDetails.fullAddress || undefined}
                  height={180}
                  showOpenButton={true}
                />
              )}
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
              interventionStatus={interventionStatus}
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
    </div>
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
