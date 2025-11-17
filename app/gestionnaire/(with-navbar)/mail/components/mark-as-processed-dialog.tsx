'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

interface MarkAsProcessedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isConversation?: boolean
}

export function MarkAsProcessedDialog({
  open,
  onOpenChange,
  onConfirm,
  isConversation = false
}: MarkAsProcessedDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Mark as Processed
          </DialogTitle>
          <DialogDescription>
            {isConversation
              ? 'Are you sure you want to mark this conversation as processed? This will mark all messages in the conversation as processed.'
              : 'Are you sure you want to mark this email as processed?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as Processed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

