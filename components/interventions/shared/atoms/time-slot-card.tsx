'use client'

/**
 * TimeSlotCard - Carte affichant un créneau horaire
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  Clock,
  Check,
  X,
  User,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MoreVertical,
  Edit,
  CalendarCheck
} from 'lucide-react'
import { TimeSlot, UserRole } from '../types'
import { formatDateShort, formatTimeRange } from '../utils/helpers'
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
  /** Variante d'affichage */
  variant?: 'default' | 'compact'
  /** Classes CSS additionnelles */
  className?: string
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
  variant = 'default',
  className
}: TimeSlotCardProps) => {
  // Vérifie si l'utilisateur a déjà répondu à ce créneau
  const userResponse = slot.responses?.find(r => r.user_id === currentUserId)
  const hasResponded = !!userResponse

  // Vérifie si l'utilisateur courant est le proposant du créneau
  const isOwnSlot = slot.proposed_by === currentUserId

  // Vérifie le rôle du proposant pour déterminer les actions disponibles
  const proposerRole = slot.proposed_by_user?.name?.toLowerCase().includes('gestionnaire')
    ? 'manager'
    : slot.proposed_by_user?.name?.toLowerCase().includes('prestataire')
      ? 'provider'
      : undefined

  // Créneau actif (non annulé, non confirmé, non rejeté)
  const isActiveSlot = !['cancelled', 'selected', 'confirmed', 'rejected'].includes(slot.status)

  // Compte les réponses par type
  const responseCounts = {
    accepted: slot.responses?.filter(r => r.response === 'accepted').length || 0,
    rejected: slot.responses?.filter(r => r.response === 'rejected').length || 0,
    pending: slot.responses?.filter(r => r.response === 'pending').length || 0
  }

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
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {formatDateShort(slot.slot_date)}
          </span>
          <Clock className="h-3.5 w-3.5 text-muted-foreground ml-2" />
          <span className="text-sm">
            {formatTimeRange(slot.start_time, slot.end_time)}
          </span>
        </div>

        {/* Badge de statut */}
        {slot.status === 'confirmed' && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
            Confirmé
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        getBackgroundClass(),
        className
      )}
    >
      {/* En-tête: Date et heure */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDateShort(slot.slot_date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {formatTimeRange(slot.start_time, slot.end_time)}
            </span>
          </div>
        </div>

        {/* Badge de statut */}
        {slot.status === 'confirmed' && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmé
          </Badge>
        )}
        {slot.status === 'cancelled' && (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            Annulé
          </Badge>
        )}
      </div>

      {/* Proposé par */}
      {slot.proposed_by_user && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <User className="h-3 w-3" />
          <span>Proposé par {slot.proposed_by_user.name}</span>
        </div>
      )}

      {/* Indicateurs de réponses */}
      {slot.responses && slot.responses.length > 0 && (
        <div className="flex items-center gap-3 text-xs mb-3">
          {responseCounts.accepted > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{responseCounts.accepted}</span>
            </div>
          )}
          {responseCounts.rejected > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              <span>{responseCounts.rejected}</span>
            </div>
          )}
          {responseCounts.pending > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>{responseCounts.pending}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Locataire: peut sélectionner un créneau */}
        {permissions.canSelectTimeSlot(userRole) && onSelect && !hasResponded && isActiveSlot && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(slot.id)}
            className="flex-1"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Sélectionner
          </Button>
        )}

        {/* Manager: boutons Approuver/Rejeter pour créneaux proposés par d'autres */}
        {userRole === 'manager' && !isOwnSlot && isActiveSlot && (
          <>
            {onApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(slot.id)}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {onReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(slot.id)}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}

        {/* Provider: boutons Accepter/Rejeter pour créneaux proposés par gestionnaire */}
        {userRole === 'provider' && !isOwnSlot && !hasResponded && isActiveSlot && (
          <>
            {onApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(slot.id)}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Accepter
              </Button>
            )}
            {onReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(slot.id)}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Refuser
              </Button>
            )}
          </>
        )}

        {/* Actions sur ses propres créneaux (Modifier, Annuler) */}
        {isOwnSlot && isActiveSlot && (
          <>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(slot.id)}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Modifier
              </Button>
            )}
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(slot.id)}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Annuler
              </Button>
            )}
          </>
        )}

        {/* Indication si l'utilisateur a déjà répondu */}
        {hasResponded && (
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              userResponse?.response === 'accepted'
                ? 'bg-green-50 text-green-700 border-green-200'
                : userResponse?.response === 'rejected'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            {userResponse?.response === 'accepted' && 'Accepté'}
            {userResponse?.response === 'rejected' && 'Refusé'}
            {userResponse?.response === 'pending' && 'En attente'}
          </Badge>
        )}

        {/* Menu dropdown pour Manager: Choisir cet horaire */}
        {userRole === 'manager' && onChoose && isActiveSlot && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onChoose(slot.id)}>
                <CalendarCheck className="h-4 w-4 mr-2" />
                Choisir cet horaire
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
