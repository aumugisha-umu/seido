"use client"

import { CheckCircle, FileText, User, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"

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
    <UnifiedModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="sm"
    >
      <UnifiedModalHeader
        title="Demande d'estimation envoyée !"
        icon={<CheckCircle className="h-5 w-5" />}
        variant="success"
      />

      <UnifiedModalBody>
        <div className="space-y-4 text-center">
          <p className="text-slate-600">
            Votre demande d&apos;estimation a été envoyée avec succès à <strong>{providerName}</strong>
            {" "}pour l&apos;intervention <strong>&ldquo;{interventionTitle}&rdquo;</strong>.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm text-left">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-slate-500" />
              <span>Le prestataire a été notifié par email</span>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-slate-500" />
              <span>L&apos;intervention passe au statut &ldquo;Demande d&apos;estimation&rdquo;</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Vous serez notifié lors de la réception de l&apos;estimation</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            L&apos;intervention sera automatiquement mise à jour dans votre dashboard.
          </p>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button onClick={onClose} className="w-full">
          Compris
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
