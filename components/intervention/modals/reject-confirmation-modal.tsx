"use client"

import { BaseConfirmationModal } from "./base-confirmation-modal"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { type InterventionAction } from "@/lib/intervention-actions-service"

interface RejectConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  intervention: InterventionAction | null
  rejectionReason: string
  onRejectionReasonChange: (reason: string) => void
  internalComment: string
  onInternalCommentChange: (comment: string) => void
  isLoading?: boolean
}

export const RejectConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  intervention,
  rejectionReason,
  onRejectionReasonChange,
  internalComment,
  onInternalCommentChange,
  isLoading = false,
}: RejectConfirmationModalProps) => {
  
  const isFormValid = rejectionReason.trim().length > 0

  const handleConfirm = () => {
    if (isFormValid) {
      onConfirm()
    }
  }

  return (
    <BaseConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      intervention={intervention}
      title="Confirmer le rejet"
      message="Pourquoi rejetez-vous cette intervention ? Cette raison sera communiquée au locataire."
      confirmText="Confirmer le rejet"
      confirmVariant="reject"
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {/* Raison du rejet - OBLIGATOIRE */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-sm font-medium text-red-800">
              Raison du rejet (obligatoire) *
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectionReason}
              onChange={(e) => onRejectionReasonChange(e.target.value)}
              placeholder="Expliquez pourquoi cette intervention est rejetée (ex: informations insuffisantes, hors périmètre, etc.)..."
              className="min-h-[100px] text-sm bg-white border-red-300 focus:border-red-500 focus:ring-red-500"
              aria-required="true"
            />
            <p className="text-xs text-red-600">
              Cette raison sera visible par le locataire dans ses notifications.
            </p>
          </div>
        </div>

        {/* Commentaire interne - OPTIONNEL */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="space-y-2">
            <Label htmlFor="reject-internal-comment" className="text-sm font-medium text-amber-800">
              Commentaire interne (optionnel)
            </Label>
            <Textarea
              id="reject-internal-comment"
              value={internalComment}
              onChange={(e) => onInternalCommentChange(e.target.value)}
              placeholder="Ajoutez des notes internes sur ce rejet..."
              className="min-h-[80px] text-sm bg-white border-amber-300 focus:border-amber-500 focus:ring-amber-500"
            />
            <p className="text-xs text-amber-600">
              Ces notes ne seront visibles que par l'équipe de gestion.
            </p>
          </div>
        </div>

        {/* Validation d'erreur */}
        {!isFormValid && rejectionReason.length > 0 && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
            ⚠️ La raison du rejet ne peut pas être vide.
          </div>
        )}
      </div>
    </BaseConfirmationModal>
  )
}
