"use client"

import { AlertTriangle, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { type InterventionAction } from "@/lib/intervention-actions-service"

interface BaseConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  intervention: InterventionAction | null
  title: string
  message?: string
  confirmText: string
  confirmVariant?: "approve" | "reject" | "default"
  isLoading?: boolean
  children?: React.ReactNode // Pour du contenu additionnel
}

export const BaseConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  intervention,
  title,
  message,
  confirmText,
  confirmVariant = "default",
  isLoading = false,
  children,
}: BaseConfirmationModalProps) => {

  const getIcon = () => {
    switch (confirmVariant) {
      case "approve":
        return <Check className="h-5 w-5 text-green-500" />
      case "reject":
        return <X className="h-5 w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
    }
  }

  const getButtonStyle = () => {
    switch (confirmVariant) {
      case "approve":
        return "bg-green-600 hover:bg-green-700 focus:ring-green-500"
      case "reject":
        return "bg-red-600 hover:bg-red-700 focus:ring-red-500"
      default:
        return "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
    }
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Ne fermer que si explicitement demandé et pas en chargement
        if (!open && !isLoading && isOpen) {
          onClose()
        }
      }}
    >
      <DialogContent 
        className="max-w-md" 
        onPointerDownOutside={(event) => {
          // Empêcher la fermeture en cliquant en dehors pendant le chargement
          if (isLoading) {
            event.preventDefault()
            return
          }
        }}
        onEscapeKeyDown={(event) => {
          // Empêcher la fermeture avec Escape pendant le chargement
          if (isLoading) {
            event.preventDefault()
            return
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600 leading-relaxed">{message}</p>

          {/* Informations sur l'intervention */}
          {intervention && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="font-medium text-sm text-gray-900 mb-1">{intervention.title}</p>
              <p className="text-xs text-gray-500">
                Référence: #{intervention.reference}
              </p>
            </div>
          )}

          {/* Contenu additionnel personnalisable */}
          {children}
        </div>

        <DialogFooter className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`${getButtonStyle()} text-white`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Traitement...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
