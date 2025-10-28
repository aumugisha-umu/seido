'use client'

/**
 * Execution Tab Component
 * Manages intervention time slots with selection
 * Shared across all user roles (gestionnaire, prestataire, locataire)
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, Clock, User, Check, Edit, X, Shield, Wrench, Home, CheckCircle, XCircle, RotateCcw, AlertCircle, Users } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  selectTimeSlotAction,
  acceptTimeSlotAction,
  withdrawResponseAction
} from '@/app/actions/intervention-actions'
import { getActionStyling } from '@/lib/intervention-action-styles'
import type { Database } from '@/lib/database.types'
import type { InterventionAction } from '@/lib/intervention-actions-service'

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
  responses?: TimeSlotResponse[]
}

type InterventionStatus = Database['public']['Enums']['intervention_status']

interface ExecutionTabProps {
  interventionId: string
  timeSlots: TimeSlot[]
  currentStatus: InterventionStatus
  intervention: InterventionAction
  onOpenProgrammingModal?: () => void
  onCancelSlot?: (slot: TimeSlot) => void
  onRejectSlot?: (slot: TimeSlot) => void
  currentUserId?: string
  userRole?: 'locataire' | 'gestionnaire' | 'prestataire'
}

export function ExecutionTab({
  interventionId,
  timeSlots,
  currentStatus,
  intervention,
  onOpenProgrammingModal,
  onCancelSlot,
  onRejectSlot,
  currentUserId,
  userRole
}: ExecutionTabProps) {
  const [selecting, setSelecting] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  // All users have same permissions based on intervention status
  // For prestataire, only show "Modifier la planification" if they have their own pending slots
  const canProposeSlots = (() => {
    const baseCondition = ['approuvee', 'demande_de_devis', 'planification'].includes(currentStatus)

    if (!baseCondition) return false

    // Special condition for prestataire: must have slots they created that are still pending/requested
    if (userRole === 'prestataire' && currentUserId) {
      const hasOwnPendingSlots = timeSlots.some(slot => {
        // Check if this slot was created by the current prestataire AND has status 'pending' or 'requested'
        // 'requested' = proposed by gestionnaire, 'pending' = proposed by prestataire/locataire
        return slot.proposed_by === currentUserId && (slot.status === 'pending' || slot.status === 'requested')
      })

      return hasOwnPendingSlots
    }

    // For other roles (gestionnaire, locataire), base condition is sufficient
    return true
  })()

  const canSelectSlot = currentStatus === 'planification'

  // Get button styling
  const actionStyles = getActionStyling('propose_slots', 'gestionnaire')

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

  // Handle slot selection
  const handleSelectSlot = async (slotId: string) => {
    setSelecting(slotId)
    try {
      const result = await selectTimeSlotAction(interventionId, slotId)
      if (result.success) {
        toast.success('Créneau sélectionné avec succès')
        window.location.reload()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error selecting slot:', error)
      toast.error('Erreur lors de la sélection du créneau')
    } finally {
      setSelecting(null)
    }
  }

  // Handle accept slot
  const handleAcceptSlot = async (slotId: string) => {
    console.log('🔵 [ExecutionTab] Accept slot clicked:', {
      slotId,
      interventionId,
      currentUserId,
      userRole,
      timestamp: new Date().toISOString()
    })

    setAccepting(slotId)
    try {
      console.log('🔵 [ExecutionTab] Calling acceptTimeSlotAction...')
      const result = await acceptTimeSlotAction(slotId, interventionId)

      console.log('🔵 [ExecutionTab] acceptTimeSlotAction result:', {
        success: result.success,
        error: result.error,
        data: result.data
      })

      if (result.success) {
        console.log('✅ [ExecutionTab] Slot accepted successfully, reloading page...')
        toast.success('Créneau accepté')
        window.location.reload()
      } else {
        console.error('❌ [ExecutionTab] Failed to accept slot:', result.error)
        toast.error(result.error || 'Erreur lors de l\'acceptation du créneau')
      }
    } catch (error) {
      console.error('❌ [ExecutionTab] Exception in handleAcceptSlot:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      toast.error('Erreur lors de l\'acceptation du créneau')
    } finally {
      console.log('🔵 [ExecutionTab] Setting accepting to null')
      setAccepting(null)
    }
  }

  // Handle withdraw response
  const handleWithdrawResponse = async (slotId: string) => {
    setWithdrawing(slotId)
    try {
      const result = await withdrawResponseAction(slotId, interventionId)
      if (result.success) {
        toast.success('Réponse retirée')
        window.location.reload()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error withdrawing response:', error)
      toast.error('Erreur lors du retrait de la réponse')
    } finally {
      setWithdrawing(null)
    }
  }

  // Get current user's response for a slot
  const getUserResponse = (slot: TimeSlot) => {
    if (!currentUserId || !slot.responses) return null
    return slot.responses.find(r => r.user_id === currentUserId)
  }

  // Get response statistics for a slot
  const getResponseStats = (slot: TimeSlot) => {
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

  // Check if slot can be finalized (meets validation requirements)
  const canBeFinalized = (slot: TimeSlot) => {
    if (!slot.responses || slot.responses.length === 0) return false

    const hasTenantAcceptance = slot.responses.some(
      r => r.user_role === 'locataire' && r.response === 'accepted'
    )
    const hasProviderAcceptance = slot.responses.some(
      r => r.user_role === 'prestataire' && r.response === 'accepted'
    )

    return hasTenantAcceptance && hasProviderAcceptance
  }

  // Get selected slot
  const selectedSlot = timeSlots.find(slot => slot.is_selected)

  // Group slots by date
  const groupedSlots = timeSlots.reduce((acc, slot) => {
    const date = format(new Date(slot.slot_date), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(slot)
    return acc
  }, {} as Record<string, TimeSlot[]>)

  return (
    <>
      <div className="space-y-6">
        {/* Header with action */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Créneaux horaires
              </CardTitle>
              {canProposeSlots && onOpenProgrammingModal && (
                <Button
                  onClick={onOpenProgrammingModal}
                  size="sm"
                  variant={actionStyles.variant}
                  className={`gap-2 ${actionStyles.className}`}
                >
                  {timeSlots.length > 0 ? (
                    <>
                      <Edit className="w-4 h-4" />
                      Modifier la planification
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Planifier
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {/* Status message */}
            {currentStatus === 'planifiee' && selectedSlot && (
              <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Intervention planifiée
                </p>
                <div className="flex items-center gap-4 text-sm text-green-700">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedSlot.slot_date), 'EEEE dd MMMM yyyy', { locale: fr })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedSlot.start_time} - {selectedSlot.end_time}
                  </span>
                </div>
              </div>
            )}

            {timeSlots.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  Aucun créneau proposé
                </p>
                <p className="text-sm text-muted-foreground">
                  Les créneaux horaires proposés apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSlots).map(([date, slots]) => (
                  <div key={date} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {format(new Date(date), 'EEEE dd MMMM yyyy', { locale: fr })}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {slots.map((slot) => {
                        const isNonCancellable = slot.status === 'selected' || slot.status === 'cancelled'
                        const canCancel = !isNonCancellable
                        const isProposer = currentUserId && slot.proposed_by === currentUserId
                        // Fallback: If proposed_by is NULL but slot is selected, check if user is a manager on this intervention
                        const isFixedSlotCreator = !slot.proposed_by && slot.is_selected &&
                          intervention.assignments?.some((a: any) => a.user_id === currentUserId && a.role === 'gestionnaire')
                        const isCreator = isProposer || isFixedSlotCreator
                        const canSelect = canSelectSlot && !isCreator && slot.status !== 'selected' && slot.status !== 'cancelled'

                        return (
                          <div
                            key={slot.id}
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
                              {slot.status !== 'selected' && slot.status !== 'cancelled' && slot.status !== 'rejected' && (
                                <div>
                                  {canBeFinalized(slot) ? (
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

                              {/* Detailed Response Badges */}
                              {(() => {
                                const stats = getResponseStats(slot)
                                const hasResponses = stats.accepted.length > 0 || stats.rejected.length > 0

                                if (!hasResponses) return null

                                return (
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
                                )
                              })()}

                              {/* Proposer */}
                              {slot.proposed_by_user && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  Proposé par {slot.proposed_by_user.name}
                                  <span className="text-muted-foreground/60">
                                    ({getRoleLabel(slot.proposed_by_user.role)})
                                  </span>
                                </div>
                              )}

                              {/* Notes */}
                              {slot.notes && (
                                <p className="text-sm text-muted-foreground">
                                  {slot.notes}
                                </p>
                              )}

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-2 pt-2">
                                {/* User's response status (if they responded) */}
                                {(() => {
                                  const userResponse = getUserResponse(slot)

                                  // Debug logging
                                  console.log('🔍 [ExecutionTab] Button rendering logic:', {
                                    slotId: slot.id,
                                    currentUserId,
                                    userResponse: userResponse ? {
                                      id: userResponse.id,
                                      response: userResponse.response,
                                      userId: userResponse.user_id
                                    } : null,
                                    isProposer,
                                    canSelectSlot,
                                    slotStatus: slot.status,
                                    hasResponses: !!slot.responses,
                                    responsesCount: slot.responses?.length || 0
                                  })

                                  // If user is the proposer/creator: show Modifier + Annuler
                                  if (isCreator) {
                                    return (
                                      <div className="flex gap-2 ml-auto">
                                        {slot.status !== 'cancelled' && onOpenProgrammingModal && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={onOpenProgrammingModal}
                                            className="gap-1"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                            Modifier
                                          </Button>
                                        )}
                                        {canCancel && onCancelSlot && (
                                          <Button
                                            size="sm"
                                            variant="outlined-danger"
                                            onClick={() => onCancelSlot(slot)}
                                            className="gap-1"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                            Annuler
                                          </Button>
                                        )}
                                      </div>
                                    )
                                  }

                                  // If user has responded
                                  if (userResponse) {
                                    // PENDING: User hasn't decided yet - show Accept/Reject buttons
                                    if (userResponse.response === 'pending') {
                                      return (
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAcceptSlot(slot.id)}
                                            disabled={accepting === slot.id}
                                            className="gap-1 border-green-300 hover:bg-green-50"
                                          >
                                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                            {accepting === slot.id ? 'Acceptation...' : 'Accepter ce créneau'}
                                          </Button>
                                          {onRejectSlot && (
                                            <Button
                                              size="sm"
                                              variant="outlined-danger"
                                              onClick={() => onRejectSlot(slot)}
                                              className="gap-1"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                              Rejeter ce créneau
                                            </Button>
                                          )}
                                        </div>
                                      )
                                    }

                                    // ACCEPTED or REJECTED: User has decided - show status + change mind options
                                    return (
                                      <div className="space-y-2">
                                        {/* Show current response status */}
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

                                        {/* Action buttons for changing mind */}
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleWithdrawResponse(slot.id)}
                                            disabled={withdrawing === slot.id}
                                            className="gap-1"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            {withdrawing === slot.id ? 'Retrait...' : 'Retirer ma réponse'}
                                          </Button>
                                          {userResponse.response === 'accepted' && onRejectSlot && (
                                            <Button
                                              size="sm"
                                              variant="outlined-danger"
                                              onClick={() => onRejectSlot(slot)}
                                              className="gap-1"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                              Rejeter à la place
                                            </Button>
                                          )}
                                          {userResponse.response === 'rejected' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleAcceptSlot(slot.id)}
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
                                  }

                                  // If user hasn't responded yet and can respond
                                  if (canSelectSlot && slot.status !== 'cancelled' && slot.status !== 'rejected') {
                                    return (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAcceptSlot(slot.id)}
                                          disabled={accepting === slot.id}
                                          className="flex-1 border-green-300 hover:bg-green-50"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                                          {accepting === slot.id ? 'Acceptation...' : 'Accepter'}
                                        </Button>
                                        {onRejectSlot && (
                                          <Button
                                            size="sm"
                                            variant="outlined-danger"
                                            onClick={() => onRejectSlot(slot)}
                                            className="flex-1"
                                          >
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Rejeter
                                          </Button>
                                        )}
                                      </div>
                                    )
                                  }

                                  return null
                                })()}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
