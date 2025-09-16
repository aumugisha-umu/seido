"use client"

import { BaseConfirmationModal } from "./base-confirmation-modal"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { type InterventionAction } from "@/lib/intervention-actions-service"

interface ApproveConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  intervention: InterventionAction | null
  internalComment: string
  onInternalCommentChange: (comment: string) => void
  isLoading?: boolean
}

export const ApproveConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  intervention,
  internalComment,
  onInternalCommentChange,
  isLoading = false,
}: ApproveConfirmationModalProps) => {
  return (
    <BaseConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      intervention={intervention}
      title="Confirmer l'approbation"
      message="Êtes-vous sûr de vouloir approuver cette intervention ? Elle passera en phase de planification."
      confirmText="Confirmer l'approbation"
      confirmVariant="approve"
      isLoading={isLoading}
    >
      {/* Commentaire interne optionnel */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="space-y-2">
          <Label htmlFor="approve-internal-comment" className="text-sm font-medium text-amber-800">
            Commentaire interne (optionnel)
          </Label>
          <Textarea
            id="approve-internal-comment"
            value={internalComment}
            onChange={(e) => onInternalCommentChange(e.target.value)}
            placeholder="Ajoutez des notes internes sur cette approbation..."
            className="min-h-[80px] text-sm bg-white border-amber-300 focus:border-amber-500 focus:ring-amber-500"
          />
          <p className="text-xs text-amber-600">
            Ces notes ne seront visibles que par l'équipe de gestion.
          </p>
        </div>
      </div>
    </BaseConfirmationModal>
  )
}
