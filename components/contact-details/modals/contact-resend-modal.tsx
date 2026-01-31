'use client'

import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
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
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      preventCloseOnOutsideClick={invitationLoading}
    >
      <UnifiedModalHeader
        title="Relancer l'invitation"
        subtitle={`Un nouvel email d'invitation sera envoyé à ${contact.email}.`}
        icon={<RefreshCw className="h-5 w-5" />}
      />

      <UnifiedModalBody className="py-2" />

      <UnifiedModalFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button onClick={onResendInvitation} disabled={invitationLoading}>
          {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Renvoyer
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
