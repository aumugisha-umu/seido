"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  itemName?: string
  itemType?: string
  isLoading?: boolean
  danger?: boolean
}

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemType = "élément",
  isLoading = false,
  danger = true,
}: DeleteConfirmModalProps) => {
  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title={title}
        icon={<AlertTriangle className="h-5 w-5" />}
        variant="danger"
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          <p className="text-slate-600">
            {message}
          </p>

          {itemName && (
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-sm text-slate-900">{itemName}</p>
              <p className="text-sm text-slate-600 capitalize">{itemType}</p>
            </div>
          )}

          {danger && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800">Attention</p>
              <p className="text-sm text-red-700">
                Cette action est irréversible et supprimera définitivement cet {itemType}.
              </p>
            </div>
          )}
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
          variant="destructive"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Suppression...
            </>
          ) : (
            "Confirmer la suppression"
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
