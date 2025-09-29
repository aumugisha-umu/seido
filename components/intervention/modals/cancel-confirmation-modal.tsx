"use client"

import { BaseConfirmationModal } from "./base-confirmation-modal"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"
import { type InterventionAction } from "@/lib/intervention-actions-service"

interface CancelConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  intervention: InterventionAction | null
  cancellationReason: string
  onCancellationReasonChange: (_reason: string) => void
  internalComment: string
  onInternalCommentChange: (_comment: string) => void
  isLoading?: boolean
  error?: string | null
}

export const CancelConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  intervention,
  cancellationReason,
  onCancellationReasonChange,
  internalComment,
  onInternalCommentChange,
  isLoading = false,
  error = null,
}: CancelConfirmationModalProps) => {
  
  const isFormValid = cancellationReason.trim().length > 0

  const handleConfirm = () => {
    if (isFormValid) {
      onConfirm()
    } else {
      // Forcer l'affichage de l'erreur si le formulaire n'est pas valide
      console.log('Form validation failed:', { 
        cancellationReason, 
        trimmed: cancellationReason.trim(), 
        length: cancellationReason.trim().length,
        isFormValid 
      })
    }
  }

  return (
    <BaseConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      intervention={intervention}
      title="Confirmer l'annulation"
      confirmText="Confirmer l'annulation"
      confirmVariant="reject"
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {/* Message d'avertissement */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="text-sm text-orange-700">
              <p className="font-medium mb-1">Action irréversible</p>
              <p>Une fois annulée, l'intervention ne pourra plus être restaurée. Une nouvelle demande devra être créée si nécessaire.</p>
            </div>
          </div>
        </div>

        {/* Motif d'annulation - OBLIGATOIRE */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium text-red-800">
              Motif de l'annulation (obligatoire) *
            </Label>
            <Textarea
              id="cancel-reason"
              value={cancellationReason}
              onChange={(e) => onCancellationReasonChange(e.target.value)}
              placeholder="Expliquez pourquoi cette intervention est annulée (ex: demande annulée par le locataire, problème résolu autrement, erreur de saisie, etc.)..."
              className="min-h-[100px] text-sm bg-white border-red-300 focus:border-red-500 focus:ring-red-500"
              aria-required="true"
              aria-describedby="cancel-reason-help"
            />
            <p id="cancel-reason-help" className="text-xs text-red-600">
              Cette raison sera visible par le locataire et le prestataire dans leurs notifications.
            </p>
          </div>
        </div>

        {/* Commentaire interne - OPTIONNEL */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-internal-comment" className="text-sm font-medium text-amber-800">
              Commentaire interne (optionnel)
            </Label>
            <Textarea
              id="cancel-internal-comment"
              value={internalComment}
              onChange={(e) => onInternalCommentChange(e.target.value)}
              placeholder="Ajoutez des notes internes sur cette annulation (contexte, décision, suivi nécessaire, etc.)..."
              className="min-h-[80px] text-sm bg-white border-amber-300 focus:border-amber-500 focus:ring-amber-500"
              aria-describedby="cancel-comment-help"
            />
            <p id="cancel-comment-help" className="text-xs text-amber-600">
              Ces notes ne seront visibles que par l'équipe de gestion interne.
            </p>
          </div>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Validation en temps réel */}
        {!isFormValid && cancellationReason.length > 0 && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Le motif d'annulation ne peut pas être vide.</span>
            </div>
          </div>
        )}

      </div>
    </BaseConfirmationModal>
  )
}
