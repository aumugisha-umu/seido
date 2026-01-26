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
import { AlertTriangle } from "lucide-react"

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
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler la demande d'estimation ?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              Êtes-vous sûr de vouloir annuler la demande d'estimation envoyée à{" "}
              <span className="font-semibold text-slate-900">{providerName}</span> ?
            </span>

            <span className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                L'intervention reviendra au statut "En planification"
              </span>
            </span>

            <span className="block text-sm text-slate-500">
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
