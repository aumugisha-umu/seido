'use client'

/**
 * Reject Time Slot Modal
 * Allows users to reject a proposed time slot with mandatory reason
 */

import { useState } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, Calendar, Clock, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { rejectTimeSlotAction } from '@/app/actions/intervention-actions'

interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  notes?: string | null
}

interface RejectSlotModalProps {
  isOpen: boolean
  onClose: () => void
  slot: TimeSlot | null
  interventionId: string
  onSuccess?: () => void
}

export function RejectSlotModal({
  isOpen,
  onClose,
  slot,
  interventionId,
  onSuccess
}: RejectSlotModalProps) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!slot) return

    // Validate reason
    if (!reason.trim()) {
      setError('Veuillez indiquer une raison pour le rejet')
      return
    }

    if (reason.trim().length < 10) {
      setError('La raison doit contenir au moins 10 caractères')
      return
    }

    setRejecting(true)
    setError(null)

    try {
      const result = await rejectTimeSlotAction(slot.id, interventionId, reason.trim())

      if (result.success) {
        toast.success('Créneau rejeté avec succès')
        onClose()
        setReason('') // Reset form
        onSuccess?.()
        // Reload to show updated data
        window.location.reload()
      } else {
        toast.error(result.error || 'Erreur lors du rejet')
      }
    } catch (error) {
      console.error('Error rejecting slot:', error)
      toast.error('Erreur lors du rejet du créneau')
    } finally {
      setRejecting(false)
    }
  }

  const handleClose = () => {
    if (!rejecting) {
      setReason('')
      setError(null)
      onClose()
    }
  }

  const handleReasonChange = (value: string) => {
    setReason(value)
    // Clear error when user starts typing
    if (error && value.trim()) {
      setError(null)
    }
  }

  if (!slot) return null

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleClose}
      size="md"
      preventCloseOnOutsideClick={rejecting}
      preventCloseOnEscape={rejecting}
    >
      <UnifiedModalHeader
        title="Rejeter ce créneau"
        subtitle="Veuillez indiquer pourquoi ce créneau ne vous convient pas"
        icon={<X className="h-5 w-5" />}
        variant="warning"
      />

      <UnifiedModalBody>
        <div className="space-y-4">
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

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Raison du rejet <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex: Indisponibilité, créneau trop court, préférence pour un autre horaire..."
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              rows={4}
              className={error ? 'border-destructive' : ''}
              disabled={rejecting}
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 10 caractères. Cette raison sera visible par tous les participants.
            </p>
          </div>

          {/* Info message */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Note:</strong> Votre rejet sera enregistré et visible par les autres participants.
              Vous pourrez changer d'avis plus tard si vous le souhaitez.
            </p>
          </div>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={rejecting}
        >
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={rejecting || !reason.trim()}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {rejecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <X className="h-4 w-4 mr-2" />
              Rejeter ce créneau
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
