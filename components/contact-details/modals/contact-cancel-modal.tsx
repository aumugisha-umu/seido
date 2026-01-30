'use client'

import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle } from 'lucide-react'
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
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      preventCloseOnOutsideClick={invitationLoading}
    >
      <UnifiedModalHeader
        title="Annuler l'invitation"
        subtitle={`L'invitation de ${contact.name} sera annulée. Vous pourrez envoyer une nouvelle invitation plus tard.`}
        icon={<XCircle className="h-5 w-5" />}
        variant="warning"
      />

      <UnifiedModalBody className="py-2" />

      <UnifiedModalFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Retour
        </Button>
        <Button variant="destructive" onClick={onCancelInvitation} disabled={invitationLoading}>
          {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Annuler l&apos;invitation
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
