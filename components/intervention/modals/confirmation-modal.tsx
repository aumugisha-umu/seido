"use client"

import { AlertTriangle, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { type InterventionAction } from "@/lib/intervention-actions-service"

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  intervention: InterventionAction | null
  action: "approve" | "reject" | null
  rejectionReason: string
  internalComment: string
  onConfirm: () => void
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  intervention,
  action,
  rejectionReason,
  internalComment,
  onConfirm,
}: ConfirmationModalProps) => {
  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="sm"
    >
      <UnifiedModalHeader
        title="Confirmer l'action"
        icon={<AlertTriangle className="h-5 w-5" />}
        variant={action === "reject" ? "danger" : "warning"}
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          <p className="text-gray-600">
            {action === "approve"
              ? "Êtes-vous sûr de vouloir approuver cette intervention ?"
              : "Êtes-vous sûr de vouloir rejeter cette intervention ?"}
          </p>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium text-sm text-gray-900">{intervention?.title}</p>
            <p className="text-sm text-gray-600">{intervention?.location}</p>
          </div>

          {action === "reject" && rejectionReason && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-red-800">Raison du rejet :</p>
              <p className="text-sm text-red-700">{rejectionReason}</p>
            </div>
          )}

          {internalComment && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">Commentaire interne :</p>
              <p className="text-sm text-yellow-700">{internalComment}</p>
            </div>
          )}
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={onConfirm}
          className={
            action === "reject"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }
        >
          {action === "reject" ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Confirmer le rejet
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirmer l&apos;approbation
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
