"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler la demande d'estimation</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Êtes-vous sûr de vouloir annuler la demande d'estimation envoyée à{" "}
              <span className="font-semibold text-slate-900">{providerName}</span> ?
            </span>
            <span className="block text-sm text-amber-600">
              Cette action est irréversible. Le prestataire ne pourra plus soumettre d'estimation pour cette demande.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block"></span>
                <span>Annulation...</span>
              </>
            ) : (
              "Confirmer l'annulation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
