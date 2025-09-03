"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteConfirmModalProps {
  itemName: string
  itemType: string
  onConfirm: () => void
  trigger?: React.ReactNode
}

export function DeleteConfirmModal({ itemName, itemType, onConfirm, trigger }: DeleteConfirmModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      setIsOpen(false)
    } catch (error) {
      console.error("Error deleting item:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
      onClick={() => setIsOpen(true)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )

  return (
    <>
      {trigger ? <div onClick={() => setIsOpen(true)}>{trigger}</div> : defaultTrigger}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <span>Confirmer la suppression</span>
            </DialogTitle>
            <DialogDescription className="text-left">
              Êtes-vous sûr de vouloir supprimer {itemType} <strong>{itemName}</strong> ?
              <br />
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
