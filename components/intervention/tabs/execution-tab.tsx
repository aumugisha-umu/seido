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
import { Calendar, Clock, User, Check, Edit, X, Shield, Wrench, Home } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { selectTimeSlotAction } from '@/app/actions/intervention-actions'
import { getActionStyling } from '@/lib/intervention-action-styles'
import type { Database } from '@/lib/database.types'
import type { InterventionAction } from '@/lib/intervention-actions-service'

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
}

type InterventionStatus = Database['public']['Enums']['intervention_status']

interface ExecutionTabProps {
  interventionId: string
  timeSlots: TimeSlot[]
  currentStatus: InterventionStatus
  intervention: InterventionAction
  onOpenProgrammingModal?: () => void
  onCancelSlot?: (slot: TimeSlot) => void
  currentUserId?: string
}

export function ExecutionTab({
  interventionId,
  timeSlots,
  currentStatus,
  intervention,
  onOpenProgrammingModal,
  onCancelSlot,
  currentUserId
}: ExecutionTabProps) {
  const [selecting, setSelecting] = useState<string | null>(null)

  // All users have same permissions based on intervention status
  const canProposeSlots = ['approuvee', 'demande_de_devis', 'planification'].includes(currentStatus)
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
                  <Edit className="w-4 h-4" />
                  Modifier la planification
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
                <p className="text-sm text-muted-foreground mb-4">
                  Les créneaux horaires proposés apparaîtront ici
                </p>
                {canProposeSlots && onOpenProgrammingModal && (
                  <Button
                    onClick={onOpenProgrammingModal}
                    variant={actionStyles.variant}
                    size="sm"
                    className={actionStyles.className}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier la planification
                  </Button>
                )}
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
                        const canSelect = canSelectSlot && !isProposer && slot.status !== 'selected' && slot.status !== 'cancelled'

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

                              {/* Validation Badges */}
                              {(slot.selected_by_manager || slot.selected_by_provider || slot.selected_by_tenant) && (
                                <div className="flex flex-wrap gap-1.5">
                                  {slot.selected_by_manager && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Shield className="w-3 h-3" />
                                      Gestionnaire
                                    </Badge>
                                  )}
                                  {slot.selected_by_provider && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Wrench className="w-3 h-3" />
                                      Prestataire
                                    </Badge>
                                  )}
                                  {slot.selected_by_tenant && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Home className="w-3 h-3" />
                                      Locataire
                                    </Badge>
                                  )}
                                </div>
                              )}

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
                              <div className="flex items-center justify-between gap-2 pt-2">
                                {/* Select button (if in planification status and not selected/cancelled and not proposer) */}
                                {canSelect && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSelectSlot(slot.id)}
                                    disabled={selecting === slot.id || !!selectedSlot}
                                    className="flex-1"
                                  >
                                    {selecting === slot.id ? 'Sélection...' : 'Sélectionner'}
                                  </Button>
                                )}

                                {/* Right-aligned action buttons */}
                                <div className="flex gap-2 ml-auto">
                                  {/* Modify button (if not cancelled) */}
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

                                  {/* Cancel button (if can cancel) */}
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
