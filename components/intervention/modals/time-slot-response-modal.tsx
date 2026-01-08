'use client'

/**
 * Time Slot Response Modal
 * Unified modal for users to accept or reject a time slot
 *
 * Used by all roles (manager, provider, tenant) to respond to proposed time slots
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertCircle, Calendar, Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  acceptTimeSlotAction,
  rejectTimeSlotAction,
  withdrawResponseAction
} from '@/app/actions/intervention-actions'

interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  notes?: string | null
}

type ResponseType = 'accepted' | 'rejected' | 'pending'

interface TimeSlotResponseModalProps {
  isOpen: boolean
  onClose: () => void
  slot: TimeSlot | null
  interventionId: string
  /** Current user's response to this slot (if any) */
  currentResponse?: ResponseType | null
  onSuccess?: () => void
}

export function TimeSlotResponseModal({
  isOpen,
  onClose,
  slot,
  interventionId,
  currentResponse,
  onSuccess
}: TimeSlotResponseModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<'accept' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Initialize selected response based on current response
  useEffect(() => {
    if (isOpen) {
      if (currentResponse === 'accepted') {
        setSelectedResponse('accept')
      } else if (currentResponse === 'rejected') {
        setSelectedResponse('reject')
      } else {
        setSelectedResponse(null)
      }
      setReason('')
      setError(null)
    }
  }, [isOpen, currentResponse])

  const handleSubmit = async () => {
    if (!slot || !selectedResponse) return

    // Validate reason if rejecting
    if (selectedResponse === 'reject') {
      if (!reason.trim()) {
        setError('Veuillez indiquer une raison pour le refus')
        return
      }
      if (reason.trim().length < 10) {
        setError('La raison doit contenir au moins 10 caractères')
        return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      // If user had a previous response, withdraw it first
      if (currentResponse && currentResponse !== 'pending') {
        const withdrawResult = await withdrawResponseAction(slot.id, interventionId)
        if (!withdrawResult.success) {
          toast.error(withdrawResult.error || 'Erreur lors de la modification de la réponse')
          setSubmitting(false)
          return
        }
      }

      // Submit new response
      let result
      if (selectedResponse === 'accept') {
        result = await acceptTimeSlotAction(slot.id, interventionId)
      } else {
        result = await rejectTimeSlotAction(slot.id, interventionId, reason.trim())
      }

      if (result.success) {
        const message = selectedResponse === 'accept'
          ? 'Créneau accepté avec succès'
          : 'Créneau refusé avec succès'
        toast.success(message)
        onClose()
        onSuccess?.()
        // Reload to show updated data
        window.location.reload()
      } else {
        toast.error(result.error || 'Erreur lors de l\'enregistrement de la réponse')
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      toast.error('Erreur lors de l\'enregistrement de la réponse')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setSelectedResponse(null)
      setReason('')
      setError(null)
      onClose()
    }
  }

  const handleReasonChange = (value: string) => {
    setReason(value)
    if (error && value.trim()) {
      setError(null)
    }
  }

  if (!slot) return null

  const isModifying = currentResponse && currentResponse !== 'pending'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-500/10 p-3">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>
                {isModifying ? 'Modifier ma réponse' : 'Répondre à ce créneau'}
              </DialogTitle>
              <DialogDescription>
                Indiquez votre disponibilité pour ce créneau
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

          {/* Response selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Votre réponse <span className="text-destructive">*</span>
            </Label>

            <RadioGroup
              value={selectedResponse || ''}
              onValueChange={(value) => setSelectedResponse(value as 'accept' | 'reject')}
              className="space-y-3"
            >
              {/* Accept option */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedResponse === 'accept'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="accept" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700">Accepter ce créneau</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Je confirme ma disponibilité pour cet horaire
                  </p>
                </div>
              </label>

              {/* Reject option */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedResponse === 'reject'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="reject" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-orange-700">Refuser ce créneau</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cet horaire ne me convient pas
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Reason input (only if rejecting) */}
          {selectedResponse === 'reject' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="reason" className="text-sm font-medium">
                Raison du refus <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Ex: Indisponibilité, créneau trop court, préférence pour un autre horaire..."
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value)}
                rows={3}
                className={error ? 'border-destructive' : ''}
                disabled={submitting}
              />
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Minimum 10 caractères
              </p>
            </div>
          )}

          {/* Info message */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Note:</strong> Votre réponse sera visible par les autres participants.
              {isModifying && ' Vous modifiez votre réponse précédente.'}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedResponse || (selectedResponse === 'reject' && !reason.trim())}
            className={
              selectedResponse === 'accept'
                ? 'bg-green-600 hover:bg-green-700'
                : selectedResponse === 'reject'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : ''
            }
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer ma réponse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
