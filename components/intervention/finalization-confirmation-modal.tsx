"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle } from "lucide-react"

interface FinalizationConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  action: 'validate' | 'contest'
  onConfirm: (data: ConfirmationData) => Promise<void>
  interventionRef: string
}

interface ConfirmationData {
  decision: 'validate' | 'reject'
  internalComments: string
  providerFeedback: string
  scheduleFollowUp: boolean
}

export function FinalizationConfirmationModal({
  isOpen,
  onClose,
  action,
  onConfirm,
  interventionRef
}: FinalizationConfirmationModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Form states
  const [internalComments, setInternalComments] = useState('')
  const [providerFeedback, setProviderFeedback] = useState('')
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false)

  const isValidate = action === 'validate'
  const title = isValidate ? 'Valider l\'intervention' : 'Contester l\'intervention'

  const handleConfirm = async () => {
    // Validation
    if (!internalComments.trim()) {
      toast({
        title: "Commentaire requis",
        description: "Veuillez saisir un commentaire interne",
        variant: "destructive"
      })
      return
    }

    if (!isValidate && !providerFeedback.trim()) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir un message pour le prestataire en cas de contestation",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      const confirmationData: ConfirmationData = {
        decision: isValidate ? 'validate' : 'reject',
        internalComments: internalComments.trim(),
        providerFeedback: isValidate ? '' : providerFeedback.trim(),
        scheduleFollowUp
      }

      await onConfirm(confirmationData)

      // Success toast
      toast({
        title: isValidate ? "Intervention validée" : "Intervention contestée",
        description: `L'intervention ${interventionRef} a été ${isValidate ? 'validée' : 'contestée'} avec succès`,
        variant: "default"
      })

      // Reset form and close
      setInternalComments('')
      setProviderFeedback('')
      setScheduleFollowUp(false)
      onClose()

    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la finalisation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setInternalComments('')
    setProviderFeedback('')
    setScheduleFollowUp(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isValidate ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Commentaire interne (obligatoire) */}
          <div className="space-y-2">
            <Label htmlFor="internal-comments" className="text-sm font-medium">
              Commentaire interne <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="internal-comments"
              placeholder="Vos notes pour l'équipe de gestion..."
              value={internalComments}
              onChange={(e) => setInternalComments(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Message pour le prestataire (si contestation) */}
          {!isValidate && (
            <div className="space-y-2">
              <Label htmlFor="provider-feedback" className="text-sm font-medium">
                Message pour le prestataire <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="provider-feedback"
                placeholder="Expliquez les raisons de la contestation..."
                value={providerFeedback}
                onChange={(e) => setProviderFeedback(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          )}

          {/* Programmer une nouvelle intervention */}
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="schedule-followup"
              checked={scheduleFollowUp}
              onCheckedChange={setScheduleFollowUp}
            />
            <Label htmlFor="schedule-followup" className="text-sm">
              Programmer une nouvelle intervention
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            className={`w-full sm:w-auto ${
              isValidate
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            disabled={loading}
          >
            {loading ? 'Traitement...' : `Confirmer ${isValidate ? 'la validation' : 'la contestation'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
