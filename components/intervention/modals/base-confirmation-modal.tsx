"use client"

import { AlertTriangle, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
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
        return <Check className="h-5 w-5" />
      case "reject":
        return <X className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getVariant = (): "default" | "success" | "warning" | "danger" => {
    switch (confirmVariant) {
      case "approve":
        return "success"
      case "reject":
        return "danger"
      default:
        return "warning"
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
    <UnifiedModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading && isOpen) {
          onClose()
        }
      }}
      size="md"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title={title}
        icon={getIcon()}
        variant={getVariant()}
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          {message && (
            <p className="text-gray-600 leading-relaxed">{message}</p>
          )}

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
      </UnifiedModalBody>

      <UnifiedModalFooter>
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
          className={`${getButtonStyle()} text-white`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            confirmText
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
