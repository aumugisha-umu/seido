"use client"

import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"

interface CancelQuoteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  providerName: string
  isLoading?: boolean
}

export function CancelQuoteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  providerName,
  isLoading = false
}: CancelQuoteConfirmModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onClose()
    }
  }

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      size="sm"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title="Annuler la demande d'estimation ?"
        icon={<AlertTriangle className="h-5 w-5" />}
        variant="warning"
      />

      <UnifiedModalBody>
        <div className="space-y-3">
          <p className="text-muted-foreground">
            Êtes-vous sûr de vouloir annuler la demande d&apos;estimation envoyée à{" "}
            <span className="font-semibold text-foreground">{providerName}</span> ?
          </p>

          <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">
              L&apos;intervention reviendra au statut &ldquo;En planification&rdquo;
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Le prestataire ne pourra plus soumettre d&apos;estimation pour cette demande.
          </p>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Retour
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Annulation...
            </>
          ) : (
            "Confirmer l'annulation"
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
