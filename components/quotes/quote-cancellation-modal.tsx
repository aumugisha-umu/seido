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
  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold text-slate-900">
                Annuler l'estimation
              </AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogDescription className="text-slate-600 mt-4">
          Êtes-vous sûr de vouloir annuler cette estimation ? Cette action est définitive et ne peut pas être annulée.
          <br /><br />
          Les gestionnaires seront automatiquement notifiés de l'annulation.
        </AlertDialogDescription>

        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel 
            onClick={onCancel}
            disabled={isLoading}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Annulation...
              </>
            ) : (
              'Confirmer l\'annulation'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
