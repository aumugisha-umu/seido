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
import { Button } from '@/components/ui/button'
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
  Users,
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
  status: 'pending' | 'proposed' | 'responded' | 'scheduled' | 'completed',
  interventionStatus?: string,
  proposedCount?: number,
  schedulingType?: 'fixed' | 'slots' | 'flexible' | null
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
    case 'responded':
      return {
        icon: CheckCircle2,
        label: proposedCount && proposedCount > 1 ? `${proposedCount} créneaux` : '1 créneau',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: 'Vous avez répondu aux créneaux'
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
      // Mode flexible: les participants s'organisent entre eux
      if (schedulingType === 'flexible') {
        return {
          icon: Users,
          label: 'Coordination autonome',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          description: 'Les participants s\'organisent entre eux'
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
  status: 'none' | 'pending' | 'received' | 'approved',
  interventionStatus?: string,
  requestedCount: number = 0,
  receivedCount: number = 0
) => {
  switch (status) {
    case 'none':
      return {
        icon: FileText,
        label: 'Non requis',
        color: 'text-slate-500',
        bgColor: 'bg-slate-50'
      }
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
  onOpenSlotResponseModal?: () => void
  onOpenQuoteModal?: () => void
  pendingSlotsForUser?: number
  requiresQuote?: boolean
  hasSubmittedQuote?: boolean
  hideEstimation?: boolean
}

const PlanningStatusSection = ({ planning, interventionStatus, onNavigateToPlanning, onOpenSlotResponseModal, onOpenQuoteModal, pendingSlotsForUser, requiresQuote, hasSubmittedQuote, hideEstimation }: PlanningStatusSectionProps) => {
  const planningConfig = getPlanningStatusConfig(planning.status, interventionStatus, planning.proposedSlotsCount, planning.schedulingType)
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
    <div className="space-y-3 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">
          {hideEstimation ? 'Planning' : 'Planning et Estimations'}
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
          hideEstimation ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3',
          isClickable && 'cursor-pointer'
        )}
        onClick={isClickable ? onNavigateToPlanning : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => e.key === 'Enter' && onNavigateToPlanning?.() : undefined}
      >
        {/* Planning Status */}
        <div className={cn(
          'flex flex-col gap-2 p-3 rounded-lg transition-shadow border',
          (pendingSlotsForUser ?? 0) > 0
            ? 'border-l-4 border-l-amber-400 bg-amber-50 border-amber-200'
            : 'bg-white border-slate-200 shadow-sm',
          isClickable && !(pendingSlotsForUser && pendingSlotsForUser > 0) && 'hover:shadow'
        )}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0',
                planningConfig.bgColor
              )}
            >
              <PlanningIcon className={cn('h-5 w-5', planningConfig.color)} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Planning</p>
              {(pendingSlotsForUser ?? 0) > 0 ? (
                <p className="text-xs text-amber-700">
                  {pendingSlotsForUser} créneau{pendingSlotsForUser! > 1 ? 'x' : ''} en attente de votre réponse
                </p>
              ) : (planning.scheduledDate || planningConfig.description) && (
                <p className="text-xs text-muted-foreground truncate">
                  {planning.scheduledDate
                    ? `${formatDate(planning.scheduledDate)}${planning.scheduledStartTime
                        ? planning.isFixedScheduling
                          ? ` • ${formatTime(planning.scheduledStartTime)}`
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
          {/* CTA: Respond to slots (prestataire only, when pending) */}
          {(pendingSlotsForUser ?? 0) > 0 && onOpenSlotResponseModal && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onOpenSlotResponseModal() }}
              className="w-full text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Gérer planification
            </Button>
          )}
          {/* CTA: Modify responses (prestataire, all slots responded) */}
          {planning.status === 'responded' && onOpenSlotResponseModal && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onOpenSlotResponseModal() }}
              className="w-full text-green-700 border-green-300 hover:bg-green-100"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Modifier mes réponses
            </Button>
          )}
        </div>

        {/* Estimation Status — hidden for roles that shouldn't see it (e.g. locataire) */}
        {!hideEstimation && (
        <div className={cn(
          'flex flex-col gap-2 p-3 rounded-lg transition-shadow border',
          requiresQuote && !hasSubmittedQuote && !planning.selectedQuoteAmount
            ? 'border-l-4 border-l-blue-400 bg-blue-50 border-blue-200'
            : 'bg-white border-slate-200 shadow-sm',
          isClickable && !(requiresQuote && !hasSubmittedQuote) && 'hover:shadow'
        )}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0',
                quotesConfig.bgColor
              )}
            >
              <QuotesIcon className={cn('h-5 w-5', quotesConfig.color)} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Estimation</p>
              {planning.selectedQuoteAmount ? (
                <p className="text-xs text-muted-foreground truncate">
                  {formatAmount(planning.selectedQuoteAmount)}
                </p>
              ) : requiresQuote && !hasSubmittedQuote ? (
                <p className="text-xs text-blue-700">Estimation demandée</p>
              ) : hasSubmittedQuote && !planning.selectedQuoteAmount ? (
                <p className="text-xs text-muted-foreground">Estimation envoyée</p>
              ) : null}
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
          {/* CTA: Submit estimation (prestataire, quote requested, not yet submitted) */}
          {requiresQuote && !hasSubmittedQuote && !planning.selectedQuoteAmount && onOpenQuoteModal && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onOpenQuoteModal() }}
              className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Soumettre une estimation
            </Button>
          )}
          {/* CTA: Edit estimation (prestataire, already submitted, not yet approved) */}
          {hasSubmittedQuote && !planning.selectedQuoteAmount && onOpenQuoteModal && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onOpenQuoteModal() }}
              className="w-full text-muted-foreground border-slate-200 hover:bg-slate-100"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Modifier l&apos;estimation
            </Button>
          )}
        </div>
        )}
      </div>

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
  onOpenSlotResponseModal,
  onOpenQuoteModal,
  pendingSlotsForUser,
  requiresQuote,
  hasSubmittedQuote,
  sections,
  hideEstimation,
  className
}: InterventionDetailsCardProps) => {
  const showSection = (name: 'participants' | 'description' | 'location' | 'instructions' | 'planning' | 'creator') =>
    !sections || sections.includes(name)

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
        {showSection('participants') && hasParticipants && participants && (
          <ParticipantsRow
            participants={participants}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onOpenChat={onOpenChat}
          />
        )}

        {/* Description */}
        {showSection('description') && description && (
          <>
            {showSection('participants') && hasParticipants && <Separator />}
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground">
                Description
              </h4>
              <p className="text-sm leading-relaxed">{description}</p>
            </div>
          </>
        )}

        {/* Localisation détaillée (immeuble, lot, adresse) avec carte */}
        {showSection('location') && hasLocationDetails && (
          <>
            {(showSection('participants') && hasParticipants || showSection('description') && description) && <Separator />}
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
        {showSection('instructions') && instructions && (
          <>
            {(showSection('description') && description || showSection('location') && hasLocationDetails) && <Separator />}
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
        {showSection('location') && location && !hasLocationDetails && (
          <>
            {(showSection('description') && description || showSection('instructions') && instructions) && <Separator />}
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
        {showSection('planning') && planning && (
          <>
            {(showSection('description') && description || showSection('location') && hasLocationDetails || showSection('instructions') && instructions || showSection('location') && location) && <Separator />}
            <PlanningStatusSection
              planning={planning}
              interventionStatus={interventionStatus}
              onNavigateToPlanning={onNavigateToPlanning}
              onOpenSlotResponseModal={onOpenSlotResponseModal}
              onOpenQuoteModal={onOpenQuoteModal}
              pendingSlotsForUser={pendingSlotsForUser}
              requiresQuote={requiresQuote}
              hasSubmittedQuote={hasSubmittedQuote}
              hideEstimation={hideEstimation}
            />
          </>
        )}

        {/* Section Créateur et Date */}
        {showSection('creator') && (createdBy || createdAt) && (
          <>
            {(showSection('description') && description || showSection('location') && hasLocationDetails || showSection('instructions') && instructions || showSection('location') && location || showSection('planning') && planning) && <Separator />}
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
