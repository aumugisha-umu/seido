'use client'

/**
 * Time Slots Tab Component
 * Manages intervention time slots with selection
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Check, Plus } from 'lucide-react'
// Time slot list will be handled inline, time slots form uses the time-slot-proposer component
import { TimeSlotProposer } from '@/components/interventions/time-slot-proposer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { selectTimeSlotAction } from '@/app/actions/intervention-actions'
import type { Database } from '@/lib/database.types'

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
}

type InterventionStatus = Database['public']['Enums']['intervention_status']

interface TimeSlotsTabProps {
  interventionId: string
  timeSlots: TimeSlot[]
  currentStatus: InterventionStatus
  canManage?: boolean
}

export function TimeSlotsTab({
  interventionId,
  timeSlots,
  currentStatus,
  canManage = false
}: TimeSlotsTabProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)

  // Check if slots can be proposed
  const canProposeSlots = ['approuvee', 'demande_de_devis', 'planification'].includes(currentStatus)
  const canSelectSlot = canManage && currentStatus === 'planification'

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
              {canProposeSlots && (
                <Button
                  onClick={() => setFormOpen(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Proposer des créneaux
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
                {canProposeSlots && (
                  <Button
                    onClick={() => setFormOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Proposer des créneaux
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
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`
                            p-4 rounded-lg border transition-colors
                            ${slot.is_selected
                              ? 'bg-green-50 border-green-300'
                              : 'bg-card hover:bg-accent/50'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {slot.start_time} - {slot.end_time}
                                </span>
                                {slot.is_selected && (
                                  <Badge variant="success" className="text-xs">
                                    <Check className="w-3 h-3 mr-1" />
                                    Sélectionné
                                  </Badge>
                                )}
                              </div>

                              {slot.proposed_by_user && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  Proposé par {slot.proposed_by_user.name}
                                </div>
                              )}

                              {slot.notes && (
                                <p className="text-sm text-muted-foreground">
                                  {slot.notes}
                                </p>
                              )}
                            </div>

                            {canSelectSlot && !slot.is_selected && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectSlot(slot.id)}
                                disabled={selecting === slot.id || !!selectedSlot}
                              >
                                {selecting === slot.id ? 'Sélection...' : 'Sélectionner'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time slots form dialog */}
      {formOpen && (
        <TimeSlotProposer
          interventionId={interventionId}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSuccess={() => {
            setFormOpen(false)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}