"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600">
            {message}
          </p>

          {itemName && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-sm text-gray-900">{itemName}</p>
              <p className="text-sm text-gray-600 capitalize">{itemType}</p>
            </div>
          )}

          {danger && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800">⚠️ Attention</p>
              <p className="text-sm text-red-700">
                Cette action est irréversible et supprimera définitivement cet {itemType}.
              </p>
            </div>
          )}
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
              "Confirmer la suppression"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
