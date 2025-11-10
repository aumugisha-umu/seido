"use client"

import { AlertTriangle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface ContactDeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  contactName: string
  contactEmail: string
  contactType: 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire' | 'autre'
  context: 'immeuble' | 'lot'
  contextName?: string // Nom de l'immeuble ou référence du lot
  isLoading?: boolean
}

const CONTACT_TYPE_LABELS: Record<string, string> = {
  gestionnaire: 'Gestionnaire',
  locataire: 'Locataire',
  prestataire: 'Prestataire',
  proprietaire: 'Propriétaire',
  autre: 'Autre contact'
}

/**
 * ContactDeleteConfirmModal - Modale de confirmation de suppression de contact
 *
 * Utilisée dans les vues d'ensemble pour confirmer la suppression d'un contact
 * d'un immeuble ou d'un lot.
 *
 * Features:
 * - Affichage du nom et email du contact
 * - Contexte (immeuble ou lot)
 * - Message d'avertissement adapté
 * - Loading state pendant la suppression
 */
export function ContactDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  contactName,
  contactEmail,
  contactType,
  context,
  contextName,
  isLoading = false,
}: ContactDeleteConfirmModalProps) {
  const contactTypeLabel = CONTACT_TYPE_LABELS[contactType] || 'Contact'
  const contextLabel = context === 'immeuble' ? "de l'immeuble" : 'du lot'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Retirer le contact</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir retirer ce contact {contextLabel} ?
          </p>

          {/* Contact Card */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{contactName}</p>
                <p className="text-xs text-gray-600 truncate">{contactEmail}</p>
                <p className="text-xs text-gray-500 mt-1">{contactTypeLabel}</p>
              </div>
            </div>
          </div>

          {/* Context Info */}
          {contextName && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800">
                {context === 'immeuble' ? 'Immeuble' : 'Lot'} : {contextName}
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <p className="text-sm font-medium text-orange-800">⚠️ Attention</p>
            <p className="text-sm text-orange-700">
              {context === 'immeuble'
                ? "Ce contact ne sera plus associé à cet immeuble. Il restera accessible dans votre liste de contacts."
                : "Ce contact ne sera plus associé à ce lot. Il restera accessible dans votre liste de contacts."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Suppression...
              </>
            ) : (
              "Retirer le contact"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
