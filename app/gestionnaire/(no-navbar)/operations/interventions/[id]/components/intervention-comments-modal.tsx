'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MessageSquareText } from 'lucide-react'
import { CommentsCard, type Comment as SharedComment } from '@/components/interventions/shared'

interface InterventionCommentsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  comments: SharedComment[]
  onAddComment: (content: string) => Promise<void>
}

export function InterventionCommentsModal({
  isOpen,
  onOpenChange,
  comments,
  onAddComment,
}: InterventionCommentsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] h-[500px] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-medium">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            Commentaires
            {comments.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                ({comments.length})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <CommentsCard
          comments={comments}
          onAddComment={onAddComment}
          className="flex-1 min-h-0"
          showHeader={false}
        />
      </DialogContent>
    </Dialog>
  )
}
