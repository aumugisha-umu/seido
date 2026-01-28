'use client'

/**
 * TimeSlotCard - Carte affichant un créneau horaire
 *
 * Layout compact avec HoverCard pour afficher les détails des réponses
 *
 * @example
 * <TimeSlotCard
 *   slot={timeSlot}
 *   userRole="manager"
 *   onApprove={() => handleApprove(slot.id)}
 * />
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Calendar,
  Clock,
  Check,
  X,
  User,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit,
  CalendarCheck
} from 'lucide-react'
import { TimeSlot, UserRole } from '../types'
import { formatDateShort, formatTimeRange, formatTime } from '../utils/helpers'
import { permissions } from '../utils/permissions'

export interface TimeSlotCardProps {
  /** Créneau horaire */
  slot: TimeSlot
  /** Rôle de l'utilisateur courant */
  userRole: UserRole
  /** ID de l'utilisateur courant (pour vérifier s'il a déjà répondu) */
  currentUserId?: string
  /** Callback pour sélectionner le créneau */
  onSelect?: (slotId: string) => void
  /** Callback pour approuver le créneau */
  onApprove?: (slotId: string) => void
  /** Callback pour rejeter le créneau */
  onReject?: (slotId: string) => void
  /** Callback pour modifier le créneau */
  onEdit?: (slotId: string) => void
  /** Callback pour annuler le créneau */
  onCancel?: (slotId: string) => void
  /** Callback pour choisir définitivement ce créneau (manager) */
  onChoose?: (slotId: string) => void
  /** Callback pour ouvrir la modale de réponse */
  onOpenResponseModal?: (slotId: string) => void
  /** Variante d'affichage */
  variant?: 'default' | 'compact'
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Composant interne pour afficher les indicateurs de réponses avec HoverCard
 */
const ResponseIndicators = ({ slot }: { slot: TimeSlot }) => {
  const responses = slot.responses || []

  // Séparer les réponses par type
  const acceptedResponses = responses.filter(r => r.response === 'accepted')
  const rejectedResponses = responses.filter(r => r.response === 'rejected')
  const pendingResponses = responses.filter(r => r.response === 'pending')

  const responseCounts = {
    accepted: acceptedResponses.length,
    rejected: rejectedResponses.length,
    pending: pendingResponses.length
  }

  // Si aucune réponse, ne rien afficher
  if (responses.length === 0) {
    return null
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          className="flex items-center gap-2 text-sm hover:bg-slate-100 rounded px-2 py-1 cursor-pointer transition-colors min-h-[36px]"
          aria-label="Voir les détails des réponses"
        >
          {responseCounts.accepted > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {responseCounts.accepted}
            </span>
          )}
          {responseCounts.pending > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              {responseCounts.pending}
            </span>
          )}
          {responseCounts.rejected > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {responseCounts.rejected}
            </span>
          )}
        </button>
      </HoverCardTrigger>

      <HoverCardContent className="w-72" align="end" side="top">
        <div className="space-y-3">
          <p className="text-sm font-semibold border-b pb-2">Réponses au créneau</p>

          {/* Accepté */}
          {acceptedResponses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Ont accepté ({acceptedResponses.length})
              </p>
              {acceptedResponses.map(r => (
                <p key={r.user_id} className="text-sm text-slate-600 pl-5">
                  {r.user?.name || 'Utilisateur'}
                </p>
              ))}
            </div>
          )}

          {/* En attente */}
          {pendingResponses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                En attente ({pendingResponses.length})
              </p>
              {pendingResponses.map(r => (
                <p key={r.user_id} className="text-sm text-slate-600 pl-5">
                  {r.user?.name || 'Utilisateur'}
                </p>
              ))}
            </div>
          )}

          {/* Refusé */}
          {rejectedResponses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-red-700 flex items-center gap-1.5">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Ont refusé ({rejectedResponses.length})
              </p>
              {rejectedResponses.map(r => (
                <p key={r.user_id} className="text-sm text-slate-600 pl-5">
                  {r.user?.name || 'Utilisateur'}
                </p>
              ))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

/**
 * Carte de créneau horaire avec actions contextuelles
 */
export const TimeSlotCard = ({
  slot,
  userRole,
  currentUserId,
  onSelect,
  onApprove,
  onReject,
  onEdit,
  onCancel,
  onChoose,
  onOpenResponseModal,
  variant = 'default',
  className
}: TimeSlotCardProps) => {
  // Vérifie si l'utilisateur a déjà répondu à ce créneau
  const userResponse = slot.responses?.find(r => r.user_id === currentUserId)
  // hasResponded = true si l'utilisateur a une réponse (même 'pending')
  const hasResponded = !!userResponse
  // hasActiveResponse = true seulement si l'utilisateur a vraiment répondu (accepted/rejected, pas 'pending')
  const hasActiveResponse = userResponse && userResponse.response !== 'pending'

  // Vérifie si l'utilisateur courant est le proposant du créneau
  const isOwnSlot = slot.proposed_by === currentUserId

  // Créneau actif (non annulé, non confirmé, non rejeté)
  const isActiveSlot = !['cancelled', 'selected', 'confirmed', 'rejected'].includes(slot.status)

  // Détermine la couleur de fond selon le statut
  const getBackgroundClass = () => {
    switch (slot.status) {
      case 'confirmed':
      case 'selected':
        return 'bg-green-50 border-green-200'
      case 'rejected':
      case 'cancelled':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-white border-slate-200'
    }
  }

  // Variante compacte
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-2 rounded-lg border',
          getBackgroundClass(),
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">
            {formatDateShort(slot.slot_date)}
          </span>
          <span className="text-slate-300">•</span>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm">
            {/* Mode date fixe (selected_by_manager): afficher seulement l'heure de début */}
            {slot.selected_by_manager
              ? formatTime(slot.start_time)
              : formatTimeRange(slot.start_time, slot.end_time)
            }
          </span>
        </div>

        {/* Badge de statut */}
        {slot.status === 'confirmed' && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs" aria-label="Créneau confirmé">
            Confirmé
          </Badge>
        )}
      </div>
    )
  }

  // Variante default - layout compact avec HoverCard
  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        getBackgroundClass(),
        className
      )}
    >
      {/* Ligne 1: Date + Heure + Badge statut */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">{formatDateShort(slot.slot_date)}</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">
              {/* Mode date fixe (selected_by_manager): afficher seulement l'heure de début */}
              {slot.selected_by_manager
                ? formatTime(slot.start_time)
                : formatTimeRange(slot.start_time, slot.end_time)
              }
            </span>
          </div>
        </div>

        {/* Badge de statut (confirmé/annulé) */}
        {slot.status === 'confirmed' && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
            Confirmé
          </Badge>
        )}
        {slot.status === 'cancelled' && (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
            <XCircle className="h-3 w-3 mr-1" aria-hidden="true" />
            Annulé
          </Badge>
        )}
      </div>

      {/* Ligne 2: Proposé par + Indicateurs réponses (avec hover) */}
      <div className="flex items-center justify-between mb-2">
        {slot.proposed_by_user && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{slot.proposed_by_user.name}</span>
          </div>
        )}
        {!slot.proposed_by_user && <div />}

        {/* HoverCard pour les réponses */}
        <ResponseIndicators slot={slot} />
      </div>

      {/* Ligne 3: Ma réponse - bandeau visible si l'utilisateur a répondu */}
      {hasResponded && (
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md mb-2 text-sm',
            userResponse?.response === 'accepted'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : userResponse?.response === 'rejected'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
          )}
        >
          {userResponse?.response === 'accepted' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
          {userResponse?.response === 'rejected' && <XCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
          {userResponse?.response === 'pending' && <HelpCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
          <span className="font-medium">
            Ma réponse : {userResponse?.response === 'accepted' && 'Accepté'}
            {userResponse?.response === 'rejected' && 'Refusé'}
            {userResponse?.response === 'pending' && 'En attente'}
          </span>
        </div>
      )}

      {/* Ligne 4: Actions simplifiées */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Cas 1: A déjà répondu activement (accepted/rejected) → bouton "Modifier réponse" + "Choisir" (manager) */}
        {hasActiveResponse && isActiveSlot && (
          <>
            {onOpenResponseModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenResponseModal(slot.id)}
                aria-label="Modifier ma réponse"
              >
                <Edit className="h-4 w-4 mr-1" aria-hidden="true" />
                Modifier réponse
              </Button>
            )}

            {/* Manager uniquement: Choisir ce créneau (bouton visible) */}
            {userRole === 'manager' && onChoose && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChoose(slot.id)}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
                aria-label="Choisir ce créneau pour planifier l'intervention"
              >
                <CalendarCheck className="h-4 w-4 mr-1" aria-hidden="true" />
                Choisir
              </Button>
            )}
          </>
        )}

        {/* Cas 2: Pas encore répondu activement (pending ou pas de réponse) → boutons Accepter/Refuser */}
        {!hasActiveResponse && isActiveSlot && (
          <>
            {onApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('🟡 [DEBUG] TimeSlotCard Accepter button clicked:', { slotId: slot.id })
                  onApprove(slot.id)
                }}
                className="text-green-700 border-green-300 hover:bg-green-50"
                aria-label="Accepter ce créneau"
              >
                <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                Accepter
              </Button>
            )}
            {onReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(slot.id)}
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
                aria-label="Refuser ce créneau"
              >
                <X className="h-4 w-4 mr-1" aria-hidden="true" />
                Refuser
              </Button>
            )}
          </>
        )}

        {/* Manager: bouton Choisir même si pas encore répondu activement */}
        {!hasActiveResponse && userRole === 'manager' && onChoose && isActiveSlot && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChoose(slot.id)}
            className="text-blue-700 border-blue-300 hover:bg-blue-50"
            aria-label="Choisir ce créneau pour planifier l'intervention"
          >
            <CalendarCheck className="h-4 w-4 mr-1" aria-hidden="true" />
            Choisir
          </Button>
        )}
      </div>
    </div>
  )
}
