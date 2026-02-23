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
import { CheckCircle2, Circle } from 'lucide-react'

interface MarkAsProcessedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isConversation?: boolean
  /** 'process' = mark as traité, 'unprocess' = mark as non traité */
  mode?: 'process' | 'unprocess'
}

export function MarkAsProcessedDialog({
  open,
  onOpenChange,
  onConfirm,
  isConversation = false,
  mode = 'process'
}: MarkAsProcessedDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const isProcess = mode === 'process'
  const Icon = isProcess ? CheckCircle2 : Circle
  const title = isProcess ? 'Marquer comme traité' : 'Marquer comme non traité'
  const description = isProcess
    ? (isConversation
        ? 'Êtes-vous sûr de vouloir marquer cette conversation comme traitée ? Cela marquera tous les messages de la conversation comme traités.'
        : 'Êtes-vous sûr de vouloir marquer cet email comme traité ?')
    : (isConversation
        ? 'Êtes-vous sûr de vouloir marquer cette conversation comme non traitée ? Elle réapparaîtra dans les emails non traités.'
        : 'Êtes-vous sûr de vouloir marquer cet email comme non traité ? Il réapparaîtra dans les emails non traités.')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${isProcess ? 'text-green-600' : 'text-orange-500'}`} />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} className={isProcess ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}>
            <Icon className="mr-2 h-4 w-4" />
            {title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

