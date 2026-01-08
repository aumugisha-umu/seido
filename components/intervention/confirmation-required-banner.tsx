"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle, X, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface ConfirmationRequiredBannerProps {
  /** ID de l'intervention */
  interventionId: string
  /** Date prévue de l'intervention (optionnel) */
  scheduledDate?: string | null
  /** Heure prévue (optionnel) */
  scheduledTime?: string | null
  /** Callback après confirmation */
  onConfirm?: () => void
  /** Callback après rejet */
  onReject?: () => void
  /** État de chargement */
  isLoading?: boolean
}

export function ConfirmationRequiredBanner({
  interventionId,
  scheduledDate,
  scheduledTime,
  onConfirm,
  onReject,
  isLoading = false
}: ConfirmationRequiredBannerProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/intervention-confirm-participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interventionId,
          confirmed: true
        })
      })

      if (response.ok) {
        onConfirm?.()
      } else {
        console.error('Failed to confirm participation')
      }
    } catch (error) {
      console.error('Error confirming participation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/intervention-confirm-participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interventionId,
          confirmed: false,
          reason: rejectReason || undefined
        })
      })

      if (response.ok) {
        setShowRejectDialog(false)
        setRejectReason("")
        onReject?.()
      } else {
        console.error('Failed to reject participation')
      }
    } catch (error) {
      console.error('Error rejecting participation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Formater la date si disponible
  const formattedDate = scheduledDate
    ? (() => {
        try {
          const date = new Date(scheduledDate)
          return format(date, 'EEEE d MMMM yyyy', { locale: fr })
        } catch {
          return scheduledDate
        }
      })()
    : null

  return (
    <>
      {/* Bannière principale */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-full flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-amber-800 text-base">
              Confirmation requise
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              Vous devez confirmer votre disponibilité pour participer à cette intervention.
            </p>

            {/* Date/heure si disponible */}
            {formattedDate && (
              <div className="flex items-center gap-4 mt-2 text-sm text-amber-700">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formattedDate}</span>
                </div>
                {scheduledTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>à {scheduledTime}</span>
                  </div>
                )}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isSubmitting || isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Je confirme ma disponibilité
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                disabled={isSubmitting || isLoading}
                className="border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                <X className="h-4 w-4 mr-2" />
                Je ne suis pas disponible
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de rejet */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Décliner l&apos;intervention</DialogTitle>
            <DialogDescription>
              Expliquez brièvement pourquoi vous ne pouvez pas participer à cette intervention.
              Cette information sera partagée avec le gestionnaire.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              placeholder="Raison du refus (optionnel)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Bannière affichée après confirmation (succès)
 */
export function ConfirmationSuccessBanner() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h4 className="font-semibold text-green-800 text-base">
            Participation confirmée
          </h4>
          <p className="text-sm text-green-700">
            Vous avez confirmé votre disponibilité pour cette intervention.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Bannière affichée après rejet
 */
export function ConfirmationRejectedBanner() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-full flex-shrink-0">
          <X className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-700 text-base">
            Participation déclinée
          </h4>
          <p className="text-sm text-slate-600">
            Vous avez indiqué ne pas être disponible pour cette intervention.
            Vous pouvez toujours suivre son avancement.
          </p>
        </div>
      </div>
    </div>
  )
}
