'use client'

/**
 * Modify Choice Modal
 * Allows users to change their accept/reject decision on a time slot
 */

import { useState, useEffect } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, Calendar, Clock, Edit3, Check, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { acceptTimeSlotAction, rejectTimeSlotAction } from '@/app/actions/intervention-actions'

interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  notes?: string | null
}

interface ModifyChoiceModalProps {
  isOpen: boolean
  onClose: () => void
  slot: TimeSlot | null
  currentResponse: 'accepted' | 'rejected'
  interventionId: string
  onSuccess?: () => void
}

export function ModifyChoiceModal({
  isOpen,
  onClose,
  slot,
  currentResponse,
  interventionId,
  onSuccess
}: ModifyChoiceModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<'accepted' | 'rejected'>(currentResponse)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setSelectedChoice(currentResponse)
      setReason('')
      setError(null)
    }
  }, [isOpen, currentResponse])

  const handleConfirm = async () => {
    if (!slot) return

    // If rejecting, validate reason
    if (selectedChoice === 'rejected') {
      if (!reason.trim()) {
        setError('Veuillez indiquer une raison pour le rejet')
        return
      }
      if (reason.trim().length < 10) {
        setError('La raison doit contenir au moins 10 caractères')
        return
      }
    }

    // Check if choice actually changed
    if (selectedChoice === currentResponse && selectedChoice === 'accepted') {
      toast.info('Aucun changement effectué')
      handleClose()
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let result
      if (selectedChoice === 'accepted') {
        result = await acceptTimeSlotAction(slot.id, interventionId)
      } else {
        result = await rejectTimeSlotAction(slot.id, interventionId, reason.trim())
      }

      if (result.success) {
        toast.success('Choix modifié avec succès')
        onClose()
        setReason('')
        onSuccess?.()
      } else {
        toast.error(result.error || 'Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Error modifying choice:', error)
      toast.error('Erreur lors de la modification du choix')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
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

  const isRejectSelected = selectedChoice === 'rejected'
  const hasChanges = selectedChoice !== currentResponse || (isRejectSelected && reason.trim().length > 0)

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleClose}
      size="md"
      preventCloseOnOutsideClick={submitting}
      preventCloseOnEscape={submitting}
    >
      <UnifiedModalHeader
        title="Modifier votre choix"
        subtitle="Changez votre décision pour ce créneau"
        icon={<Edit3 className="h-5 w-5" />}
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
          </div>

          {/* Current choice indicator */}
          <div className={`rounded-lg p-3 text-sm ${
            currentResponse === 'accepted'
              ? 'bg-green-500/10 text-green-700 border border-green-500/20'
              : 'bg-red-500/10 text-red-700 border border-red-500/20'
          }`}>
            <span className="font-medium">Choix actuel : </span>
            {currentResponse === 'accepted' ? 'Accepté' : 'Rejeté'}
          </div>

          {/* Choice selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Nouveau choix
            </Label>
            <RadioGroup
              value={selectedChoice}
              onValueChange={(value) => setSelectedChoice(value as 'accepted' | 'rejected')}
              className="gap-3"
            >
              {/* Accept option */}
              <div
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedChoice === 'accepted'
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedChoice('accepted')}
              >
                <RadioGroupItem value="accepted" id="choice-accepted" />
                <Label htmlFor="choice-accepted" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Check className={`w-4 h-4 ${selectedChoice === 'accepted' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={selectedChoice === 'accepted' ? 'text-green-700 font-medium' : ''}>
                    Accepter ce créneau
                  </span>
                </Label>
              </div>

              {/* Reject option */}
              <div
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedChoice === 'rejected'
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedChoice('rejected')}
              >
                <RadioGroupItem value="rejected" id="choice-rejected" />
                <Label htmlFor="choice-rejected" className="flex-1 cursor-pointer flex items-center gap-2">
                  <X className={`w-4 h-4 ${selectedChoice === 'rejected' ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={selectedChoice === 'rejected' ? 'text-red-700 font-medium' : ''}>
                    Rejeter ce créneau
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reason input - only visible when rejecting */}
          {isRejectSelected && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="reason" className="text-sm font-medium">
                Raison du rejet <span className="text-destructive">*</span>
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
                Minimum 10 caractères. Cette raison sera visible par tous les participants.
              </p>
            </div>
          )}

          {/* Info message */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Note :</strong> Votre modification sera enregistrée et visible par les autres participants.
            </p>
          </div>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
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
          onClick={handleConfirm}
          disabled={submitting || (isRejectSelected && !reason.trim())}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Modification...
            </>
          ) : (
            'Confirmer'
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
