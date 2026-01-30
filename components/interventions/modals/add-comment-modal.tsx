"use client"

import { useState } from "react"
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MessageSquarePlus, Loader2 } from "lucide-react"

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
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      preventCloseOnOutsideClick={isSubmitting}
      preventCloseOnEscape={isSubmitting}
    >
      <UnifiedModalHeader
        title="Ajouter un commentaire"
        subtitle="Ajoutez une note ou un commentaire sur cette intervention."
        icon={<MessageSquarePlus className="h-5 w-5" />}
      />

      <UnifiedModalBody>
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
      </UnifiedModalBody>

      <UnifiedModalFooter>
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ajout en cours...
            </>
          ) : (
            "Ajouter le commentaire"
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
