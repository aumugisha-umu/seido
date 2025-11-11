'use client'

/**
 * TimeSlotCard Component
 * Reusable time slot card with accept/reject/withdraw functionality
 * Extracted from ExecutionTab for use in modals and other contexts
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Clock,
  User,
  Check,
  Shield,
  Wrench,
  Home,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertCircle
} from 'lucide-react'
import type { Database } from '@/lib/database.types'

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
  responses?: TimeSlotResponse[]
}

interface TimeSlotCardProps {
  slot: TimeSlot
  currentUserId: string
  userRole?: 'locataire' | 'gestionnaire' | 'prestataire'
  onAccept: (slotId: string) => Promise<void>
  onReject: (slot: TimeSlot) => void
  onWithdraw: (slotId: string) => Promise<void>
  showActions?: boolean
  compact?: boolean // Mode compact pour modal
  accepting?: string | null
  withdrawing?: string | null
}

export function TimeSlotCard({
  slot,
  currentUserId,
  userRole,
  onAccept,
  onReject,
  onWithdraw,
  showActions = true,
  compact = false,
  accepting,
  withdrawing
}: TimeSlotCardProps) {

  // Helper: Get status badge variant
  const getStatusVariant = (status: TimeSlot['status']) => {
    switch (status) {
      case 'requested':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'selected':
        return 'success'
      case 'rejected':
        return 'destructive'
      case 'cancelled':
        return 'outline'
      default:
        return 'default'
    }
  }

  // Helper: Get status label
  const getStatusLabel = (status: TimeSlot['status']) => {
    switch (status) {
      case 'requested':
        return 'Demandé'
      case 'pending':
        return 'En attente'
      case 'selected':
        return 'Sélectionné'
      case 'rejected':
        return 'Rejeté'
      case 'cancelled':
        return 'Annulé'
      default:
        return status
    }
  }

  // Helper: Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'gestionnaire':
        return 'Gestionnaire'
      case 'prestataire':
        return 'Prestataire'
      case 'locataire':
        return 'Locataire'
      default:
        return role
    }
  }

  // Get current user's response for this slot
  const getUserResponse = () => {
    if (!currentUserId || !slot.responses) return null
    return slot.responses.find(r => r.user_id === currentUserId)
  }

  // Get response statistics
  const getResponseStats = () => {
    if (!slot.responses) {
      return {
        accepted: [],
        rejected: [],
        pending: []
      }
    }

    const accepted = slot.responses.filter(r => r.response === 'accepted')
    const rejected = slot.responses.filter(r => r.response === 'rejected')
    const pending = slot.responses.filter(r => r.response === 'pending')

    return { accepted, rejected, pending }
  }

  // Check if slot can be finalized
  const canBeFinalized = () => {
    if (!slot.responses || slot.responses.length === 0) return false

    const hasTenantAcceptance = slot.responses.some(
      r => r.user_role === 'locataire' && r.response === 'accepted'
    )
    const hasProviderAcceptance = slot.responses.some(
      r => r.user_role === 'prestataire' && r.response === 'accepted'
    )

    return hasTenantAcceptance && hasProviderAcceptance
  }

  const isProposer = currentUserId && slot.proposed_by === currentUserId
  const canSelectSlot = true // In modal context, always allow interaction
  const userResponse = getUserResponse()
  const stats = getResponseStats()
  const hasResponses = stats.accepted.length > 0 || stats.rejected.length > 0

  return (
    <div
      className={`
        p-4 rounded-lg border transition-colors
        ${slot.status === 'selected'
          ? 'bg-green-50 border-green-300'
          : slot.status === 'cancelled'
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : 'bg-card hover:bg-accent/50'
        }
      `}
    >
      <div className="space-y-3">
        {/* Header: Time + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">
              {slot.start_time} - {slot.end_time}
            </span>
          </div>
          <Badge variant={getStatusVariant(slot.status)} className="text-xs">
            {slot.status === 'selected' && <Check className="w-3 h-3 mr-1" />}
            {getStatusLabel(slot.status)}
          </Badge>
        </div>

        {/* Validation Indicator */}
        {!compact && slot.status !== 'selected' && slot.status !== 'cancelled' && slot.status !== 'rejected' && (
          <div>
            {canBeFinalized() ? (
              <Badge className="bg-green-50 border-green-300 text-green-800 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Prêt à finaliser
              </Badge>
            ) : (
              <Badge className="bg-amber-50 border-amber-300 text-amber-800 text-xs">
                <Clock className="w-3 h-3 mr-1" />
                En attente de validation
              </Badge>
            )}
          </div>
        )}

        {/* Response Stats */}
        {!compact && hasResponses && (
          <TooltipProvider>
            <div className="space-y-2">
              {/* Accepted responses */}
              {stats.accepted.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <div className="flex items-center gap-1 text-xs text-green-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Accepté par:
                  </div>
                  {stats.accepted.map((response) => (
                    <Badge
                      key={response.id}
                      variant="outline"
                      className="text-xs gap-1 border-green-300 bg-green-50 text-green-800"
                    >
                      {response.user?.name || 'Utilisateur'}
                      {response.user_role === 'gestionnaire' && <Shield className="w-3 h-3" />}
                      {response.user_role === 'prestataire' && <Wrench className="w-3 h-3" />}
                      {response.user_role === 'locataire' && <Home className="w-3 h-3" />}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Rejected responses with tooltips */}
              {stats.rejected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <div className="flex items-center gap-1 text-xs text-orange-700 font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    Rejeté par:
                  </div>
                  {stats.rejected.map((response) => (
                    <Tooltip key={response.id}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="text-xs gap-1 border-orange-300 bg-orange-50 text-orange-800 cursor-help"
                        >
                          {response.user?.name || 'Utilisateur'}
                          {response.user_role === 'gestionnaire' && <Shield className="w-3 h-3" />}
                          {response.user_role === 'prestataire' && <Wrench className="w-3 h-3" />}
                          {response.user_role === 'locataire' && <Home className="w-3 h-3" />}
                          <AlertCircle className="w-3 h-3" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">Raison du rejet:</p>
                        <p className="text-sm">{response.notes || 'Aucune raison fournie'}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}

              {/* Pending responses */}
              {stats.pending.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <div className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    En attente de réponse:
                  </div>
                  {stats.pending.map((response) => (
                    <Badge
                      key={response.id}
                      variant="outline"
                      className="text-xs gap-1 border-gray-300 bg-gray-50 text-gray-700"
                    >
                      {response.user?.name || 'Utilisateur'}
                      {response.user_role === 'gestionnaire' && <Shield className="w-3 h-3" />}
                      {response.user_role === 'prestataire' && <Wrench className="w-3 h-3" />}
                      {response.user_role === 'locataire' && <Home className="w-3 h-3" />}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Proposer (only in non-compact mode) */}
        {!compact && slot.proposed_by_user && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            Proposé par {slot.proposed_by_user.name}
            <span className="text-muted-foreground/60">
              ({getRoleLabel(slot.proposed_by_user.role)})
            </span>
          </div>
        )}

        {/* Notes */}
        {!compact && slot.notes && (
          <p className="text-sm text-muted-foreground">
            {slot.notes}
          </p>
        )}

        {/* Action Buttons */}
        {showActions && !isProposer && (
          <div className="flex flex-col gap-2 pt-2">
            {userResponse ? (
              // User has already responded
              userResponse.response === 'pending' ? (
                // PENDING: Show Accept/Reject
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAccept(slot.id)}
                    disabled={accepting === slot.id}
                    className="gap-1 border-green-300 hover:bg-green-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    {accepting === slot.id ? 'Acceptation...' : 'Accepter ce créneau'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outlined-danger"
                    onClick={() => onReject(slot)}
                    className="gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Rejeter ce créneau
                  </Button>
                </div>
              ) : (
                // ACCEPTED or REJECTED: Show status + change mind options
                <div className="space-y-2">
                  {/* Current response status */}
                  {userResponse.response === 'accepted' ? (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 border border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Vous avez accepté ce créneau</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50 border border-orange-200">
                        <XCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Vous avez rejeté ce créneau</span>
                      </div>
                      {userResponse.notes && (
                        <p className="text-xs text-muted-foreground pl-6">
                          Raison: {userResponse.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Change mind buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onWithdraw(slot.id)}
                      disabled={withdrawing === slot.id}
                      className="gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {withdrawing === slot.id ? 'Retrait...' : 'Retirer ma réponse'}
                    </Button>
                    {userResponse.response === 'accepted' && (
                      <Button
                        size="sm"
                        variant="outlined-danger"
                        onClick={() => onReject(slot)}
                        className="gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeter à la place
                      </Button>
                    )}
                    {userResponse.response === 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAccept(slot.id)}
                        disabled={accepting === slot.id}
                        className="gap-1 border-green-300 hover:bg-green-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        {accepting === slot.id ? 'Acceptation...' : 'Accepter à la place'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            ) : (
              // User hasn't responded yet
              canSelectSlot && slot.status !== 'cancelled' && slot.status !== 'rejected' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAccept(slot.id)}
                    disabled={accepting === slot.id}
                    className="flex-1 border-green-300 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                    {accepting === slot.id ? 'Acceptation...' : 'Accepter'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outlined-danger"
                    onClick={() => onReject(slot)}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rejeter
                  </Button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
