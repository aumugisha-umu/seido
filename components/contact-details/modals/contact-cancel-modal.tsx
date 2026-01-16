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
import { Loader2 } from 'lucide-react'
import type { ContactWithCompany } from '../types'

interface ContactCancelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactWithCompany
  invitationLoading: boolean
  onCancelInvitation: () => Promise<void>
}

/**
 * Modal for cancelling a pending invitation
 */
export function ContactCancelModal({
  open,
  onOpenChange,
  contact,
  invitationLoading,
  onCancelInvitation
}: ContactCancelModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler l&apos;invitation</DialogTitle>
          <DialogDescription>
            L&apos;invitation de <strong>{contact.name}</strong> sera annulée. Vous pourrez
            toujours envoyer une nouvelle invitation plus tard.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Retour
          </Button>
          <Button variant="destructive" onClick={onCancelInvitation} disabled={invitationLoading}>
            {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Annuler l&apos;invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
