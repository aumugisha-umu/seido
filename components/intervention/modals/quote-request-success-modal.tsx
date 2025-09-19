"use client"

import { CheckCircle, FileText, User, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface QuoteRequestSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  providerName: string
  interventionTitle: string
}

export const QuoteRequestSuccessModal = ({
  isOpen,
  onClose,
  providerName,
  interventionTitle
}: QuoteRequestSuccessModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Demande de devis envoyée !
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-center">
          <p className="text-slate-600">
            Votre demande de devis a été envoyée avec succès à <strong>{providerName}</strong>
            pour l'intervention <strong>"{interventionTitle}"</strong>.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-slate-500" />
              <span>Le prestataire a été notifié par email</span>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-slate-500" />
              <span>L'intervention passe au statut "Demande de devis"</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Vous serez notifié lors de la réception du devis</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            L'intervention sera automatiquement mise à jour dans votre dashboard.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Compris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}