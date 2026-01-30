"use client"

import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle } from "lucide-react"

interface QuoteCancellationModalProps {
  isOpen: boolean
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function QuoteCancellationModal({
  isOpen,
  isLoading,
  onConfirm,
  onCancel
}: QuoteCancellationModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onCancel()
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
        title="Annuler l'estimation"
        icon={<AlertTriangle className="h-5 w-5" />}
        variant="danger"
      />

      <UnifiedModalBody>
        <p className="text-slate-600">
          Êtes-vous sûr de vouloir annuler cette estimation ? Cette action est définitive et ne peut pas être annulée.
        </p>
        <p className="text-slate-600 mt-3">
          Les gestionnaires seront automatiquement notifiés de l&apos;annulation.
        </p>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
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
