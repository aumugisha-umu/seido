"use client"

import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  action: "approve" | "reject" | null
  interventionTitle: string
}

export const SuccessModal = ({
  isOpen,
  onClose,
  action,
}: SuccessModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>{action === "approve" ? "Intervention approuvée" : "Intervention rejetée"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              {action === "approve"
                ? "L'intervention a été approuvée avec succès."
                : "La demande d'intervention a été rejetée."}
            </p>
            <p className="text-sm text-green-700 mt-2">
              Une notification vient d'être envoyée au locataire
              {action === "reject" ? " avec la raison du rejet" : ""}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
