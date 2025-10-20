'use client'

/**
 * Cancel Time Slot Confirmation Modal
 * Confirms cancellation of a proposed time slot
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { cancelTimeSlotAction } from '@/app/actions/intervention-actions'

interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  notes?: string | null
}

interface CancelSlotModalProps {
  isOpen: boolean
  onClose: () => void
  slot: TimeSlot | null
  interventionId: string
  onSuccess?: () => void
}

export function CancelSlotModal({
  isOpen,
  onClose,
  slot,
  interventionId,
  onSuccess
}: CancelSlotModalProps) {
  const [cancelling, setCancelling] = useState(false)

  const handleConfirm = async () => {
    if (!slot) return

    setCancelling(true)
    try {
      const result = await cancelTimeSlotAction(slot.id, interventionId)

      if (result.success) {
        toast.success('Créneau annulé avec succès')
        onClose()
        onSuccess?.()
        // Reload to show updated data
        window.location.reload()
      } else {
        toast.error(result.error || 'Erreur lors de l\'annulation')
      }
    } catch (error) {
      console.error('Error cancelling slot:', error)
      toast.error('Erreur lors de l\'annulation du créneau')
    } finally {
      setCancelling(false)
    }
  }

  const handleClose = () => {
    if (!cancelling) {
      onClose()
    }
  }

  if (!slot) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>Annuler ce créneau?</DialogTitle>
              <DialogDescription>
                Cette action ne peut pas être annulée
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Slot information */}
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(slot.slot_date), 'EEEE dd MMMM yyyy', { locale: fr })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {slot.start_time} - {slot.end_time}
              </span>
            </div>

            {slot.notes && (
              <div className="text-sm text-muted-foreground pt-2 border-t">
                <p className="font-medium mb-1">Note:</p>
                <p>{slot.notes}</p>
              </div>
            )}
          </div>

          {/* Warning message */}
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm text-destructive">
              <strong>Attention:</strong> Ce créneau sera marqué comme annulé et ne sera plus disponible
              pour sélection. Vous pourrez toujours proposer de nouveaux créneaux ultérieurement.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={cancelling}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={cancelling}
          >
            {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
