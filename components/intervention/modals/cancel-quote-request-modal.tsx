"use client"

import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"

interface CancelQuoteRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  providerName: string
  isLoading?: boolean
}

export function CancelQuoteRequestModal({
  isOpen,
  onClose,
  onConfirm,
  providerName,
  isLoading = false
}: CancelQuoteRequestModalProps) {
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
        title="Annuler la demande d'estimation"
        icon={<AlertTriangle className="h-5 w-5" />}
        variant="warning"
      />

      <UnifiedModalBody>
        <div className="space-y-3">
          <p className="text-muted-foreground">
            Êtes-vous sûr de vouloir annuler la demande d&apos;estimation envoyée à{" "}
            <span className="font-semibold text-foreground">{providerName}</span> ?
          </p>
          <p className="text-sm text-amber-600">
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
