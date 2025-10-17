"use client"

import { useState } from "react"
import { XCircle, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ScheduleRejectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduledDate?: string
  scheduledTime?: string
  onConfirm: (reason: string) => Promise<void>
}

export function ScheduleRejectionModal({
  open,
  onOpenChange,
  scheduledDate,
  scheduledTime,
  onConfirm
}: ScheduleRejectionModalProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Veuillez indiquer le motif du refus")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm(reason.trim())
      // Reset form on success
      setReason("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du refus de la planification")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setReason("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Refuser la planification proposée
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date/heure proposée */}
          {scheduledDate && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Créneau proposé</span>
              </div>
              <div className="text-slate-900 font-semibold">
                {new Date(scheduledDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                {scheduledTime && ` à ${scheduledTime}`}
              </div>
            </div>
          )}

          {/* Motif du refus */}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason" className="text-sm font-medium">
              Motif du refus <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Ex: Déjà engagé sur un autre chantier, équipement non disponible, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500">
              Expliquez pourquoi ce créneau ne vous convient pas
            </p>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info message */}
          <Alert>
            <AlertDescription className="text-sm">
              Le gestionnaire sera notifié de votre refus et pourra proposer une nouvelle planification.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? "En cours..." : "Confirmer le refus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
