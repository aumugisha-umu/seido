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
  /** @deprecated Use quoteCount + providerNames instead */
  providerName?: string
  quoteCount?: number
  providerNames?: string[]
  isLoading?: boolean
}

export function CancelQuoteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  providerName,
  quoteCount = 1,
  providerNames = [],
  isLoading = false
}: CancelQuoteConfirmModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onClose()
    }
  }

  // Backwards-compatible: use providerName if providerNames is empty
  const names = providerNames.length > 0 ? providerNames : (providerName ? [providerName] : [])
  const count = quoteCount > 0 ? quoteCount : names.length
  const isPlural = count > 1

  const title = isPlural
    ? `Annuler les ${count} demandes d'estimation ?`
    : "Annuler la demande d'estimation ?"

  const namesText = names.length > 0
    ? names.join(', ')
    : 'ce prestataire'

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      size="sm"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title={title}
        icon={<AlertTriangle className="h-5 w-5" />}
        variant="warning"
      />

      <UnifiedModalBody>
        <div className="space-y-3">
          <p className="text-muted-foreground">
            {isPlural ? (
              <>
                Êtes-vous sûr de vouloir annuler les {count} demandes d&apos;estimation envoyées à{" "}
                <span className="font-semibold text-foreground">{namesText}</span> ?
              </>
            ) : (
              <>
                Êtes-vous sûr de vouloir annuler la demande d&apos;estimation envoyée à{" "}
                <span className="font-semibold text-foreground">{namesText}</span> ?
              </>
            )}
          </p>

          <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">
              L&apos;intervention reviendra au statut &ldquo;En planification&rdquo;
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {isPlural
              ? "Cette action est irréversible. Les prestataires ne pourront plus soumettre d'estimation pour cette demande."
              : "Cette action est irréversible. Le prestataire ne pourra plus soumettre d'estimation pour cette demande."
            }
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
