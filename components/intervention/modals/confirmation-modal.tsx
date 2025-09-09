"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Confirmer l'action</span>
          </DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            className={
              action === "reject"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {action === "reject" ? "Confirmer le rejet" : "Confirmer l'approbation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
