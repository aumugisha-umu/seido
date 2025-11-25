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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Confirmer la sélection du créneau
          </DialogTitle>
          <DialogDescription>
            Vous vous apprêtez à planifier définitivement cette intervention.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                l'intervention indépendamment de la réponse du prestataire.
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

        <DialogFooter className="gap-2">
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
            className="gap-2"
          >
            {loading ? (
              <>Planification en cours...</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirmer et planifier
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

