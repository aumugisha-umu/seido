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

interface ContactResendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactWithCompany
  invitationLoading: boolean
  onResendInvitation: () => Promise<void>
}

/**
 * Modal for resending an invitation (pending or expired)
 */
export function ContactResendModal({
  open,
  onOpenChange,
  contact,
  invitationLoading,
  onResendInvitation
}: ContactResendModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relancer l&apos;invitation</DialogTitle>
          <DialogDescription>
            Un nouvel email d&apos;invitation sera envoyé à <strong>{contact.email}</strong>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onResendInvitation} disabled={invitationLoading}>
            {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Renvoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
