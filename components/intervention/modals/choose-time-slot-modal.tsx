'use client'

/**
 * Choose Time Slot Modal
 * Confirmation modal for managers to choose a specific time slot
 * and schedule the intervention
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, CheckCircle, AlertTriangle, Calendar, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { chooseTimeSlotAsManagerAction } from '@/app/actions/intervention-actions'
import type { Database } from '@/lib/database.types'

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row']

interface ChooseTimeSlotModalProps {
  slot: TimeSlot
  interventionId: string
  hasActiveQuotes: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const ChooseTimeSlotModal = ({
  slot,
  interventionId,
  hasActiveQuotes,
  open,
  onOpenChange,
  onSuccess
}: ChooseTimeSlotModalProps) => {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await chooseTimeSlotAsManagerAction(slot.id, interventionId)
      
      if (result.success) {
        toast.success('Créneau sélectionné avec succès', {
          description: 'L\'intervention a été planifiée'
        })
        onOpenChange(false)
        if (onSuccess) {
          onSuccess()
        }
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        toast.error(result.error || 'Erreur lors de la sélection du créneau')
      }
    } catch (error) {
      console.error('Error choosing time slot:', error)
      toast.error('Erreur lors de la sélection du créneau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      preventCloseOnOutsideClick={loading}
      preventCloseOnEscape={loading}
    >
      <UnifiedModalHeader
        title="Confirmer la sélection du créneau"
        subtitle="Vous vous apprêtez à planifier définitivement cette intervention."
        icon={<CheckCircle className="h-5 w-5" />}
        variant="success"
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          {/* Selected slot details */}
          <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(slot.slot_date), 'EEEE d MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock className="h-4 w-4" />
              <span>
                {slot.start_time} - {slot.end_time}
              </span>
            </div>
            {slot.notes && (
              <p className="text-sm text-slate-600 mt-2">
                {slot.notes}
              </p>
            )}
          </div>

          {/* Warning if active quotes */}
          {hasActiveQuotes && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                ⚠️ Une demande de devis est en cours. En validant ce créneau, vous planifiez
                l&apos;intervention indépendamment de la réponse du prestataire.
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation message */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-900">
              En confirmant, cette intervention sera <strong>planifiée</strong> et les autres
              créneaux proposés seront automatiquement <strong>rejetés</strong>.
            </p>
          </div>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Planification en cours...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmer et planifier
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}

