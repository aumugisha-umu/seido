'use client'

import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ShieldOff } from 'lucide-react'
import type { ContactWithCompany } from '../types'

interface ContactRevokeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactWithCompany
  revokeConfirmChecked: boolean
  invitationLoading: boolean
  onConfirmChange: (checked: boolean) => void
  onRevokeAccess: () => Promise<void>
}

/**
 * Modal for revoking access from an accepted invitation
 * Requires explicit confirmation via checkbox
 */
export function ContactRevokeModal({
  open,
  onOpenChange,
  contact,
  revokeConfirmChecked,
  invitationLoading,
  onConfirmChange,
  onRevokeAccess
}: ContactRevokeModalProps) {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      onConfirmChange(false)
    }
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      preventCloseOnOutsideClick={invitationLoading}
    >
      <UnifiedModalHeader
        title={`Retirer l'accès de ${contact.name}`}
        subtitle={`Cette action révoquera définitivement l'accès de ${contact.name} à l'application.`}
        icon={<ShieldOff className="h-5 w-5" />}
        variant="danger"
      />

      <UnifiedModalBody>
        <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Checkbox
            id="revoke-confirm"
            checked={revokeConfirmChecked}
            onCheckedChange={(checked) => onConfirmChange(checked === true)}
          />
          <label
            htmlFor="revoke-confirm"
            className="text-sm font-medium text-amber-800 cursor-pointer"
          >
            Je confirme vouloir révoquer l&apos;accès de ce contact
          </label>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={() => handleOpenChange(false)}>
          Annuler
        </Button>
        <Button
          variant="destructive"
          onClick={onRevokeAccess}
          disabled={!revokeConfirmChecked || invitationLoading}
        >
          {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Retirer l&apos;accès
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
