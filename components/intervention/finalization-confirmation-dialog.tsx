'use client'

/**
 * Modale de confirmation pour la finalisation d'intervention
 * Affichée quand l'utilisateur clique sur "Finaliser" ou "Refuser"
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface FinalizationConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  action: 'approve' | 'reject'
  interventionRef: string
  isLoading?: boolean
}

export function FinalizationConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  action,
  interventionRef,
  isLoading = false
}: FinalizationConfirmationDialogProps) {
  const [note, setNote] = useState('')

  const handleConfirm = () => {
    onConfirm(note)
    setNote('') // Reset for next time
  }

  const handleClose = () => {
    setNote('')
    onClose()
  }

  const isApprove = action === 'approve'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {isApprove ? (
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">
                {isApprove ? 'Finaliser l\'intervention' : 'Refuser la clôture'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Intervention {interventionRef}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning message for reject */}
          {!isApprove && (
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-medium mb-1">Attention</p>
                <p className="text-xs">
                  Le refus de clôture nécessitera une intervention corrective.
                  Assurez-vous de bien détailler les raisons dans votre note.
                </p>
              </div>
            </div>
          )}

          {/* Note field */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium">
              {isApprove ? 'Note de finalisation' : 'Raison du refus'}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id="note"
              placeholder={
                isApprove
                  ? "Ajoutez vos commentaires finaux sur cette intervention..."
                  : "Expliquez les raisons du refus et les actions correctives nécessaires..."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {note.length}/500 caractères
            </p>
          </div>

          {/* Summary of action */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-2">
              Cette action va :
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {isApprove ? (
                <>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Marquer l'intervention comme <strong>finalisée</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Archiver l'intervention dans l'historique</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Notifier toutes les parties prenantes</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Refuser la clôture de l'intervention</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Renvoyer au prestataire pour correction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Notifier le gestionnaire et le prestataire</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!note.trim() || isLoading}
            className={
              isApprove
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Traitement...
              </>
            ) : (
              <>
                {isApprove ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmer la finalisation
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirmer le refus
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
