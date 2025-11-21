"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MessageSquarePlus } from "lucide-react"

interface AddCommentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (content: string) => Promise<void>
  isSubmitting: boolean
}

export function AddCommentModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting
}: AddCommentModalProps) {
  const [content, setContent] = useState("")
  const MAX_LENGTH = 2000

  const handleSubmit = async () => {
    if (content.trim().length === 0) return

    try {
      await onSubmit(content.trim())
      // Reset content after successful submission
      setContent("")
    } catch (error) {
      // Error handling is done in parent component
      console.error("Error submitting comment:", error)
    }
  }

  const handleCancel = () => {
    setContent("")
    onOpenChange(false)
  }

  const remainingChars = MAX_LENGTH - content.length
  const isOverLimit = remainingChars < 0
  const isValid = content.trim().length > 0 && !isOverLimit

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Ajouter un commentaire
          </DialogTitle>
          <DialogDescription>
            Ajoutez une note ou un commentaire sur cette intervention.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire</Label>
            <Textarea
              id="comment"
              placeholder="Saisissez votre commentaire..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isSubmitting}
              autoFocus
            />
            <div className="flex justify-end">
              <span
                className={`text-xs ${
                  isOverLimit
                    ? "text-red-600 font-semibold"
                    : remainingChars < 100
                    ? "text-amber-600"
                    : "text-muted-foreground"
                }`}
              >
                {remainingChars} / {MAX_LENGTH}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                Ajout en cours...
              </>
            ) : (
              "Ajouter le commentaire"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
