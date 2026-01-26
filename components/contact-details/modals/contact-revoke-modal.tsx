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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirer l&apos;accès de {contact.name}</DialogTitle>
          <DialogDescription>
            Cette action révoquera définitivement l&apos;accès de{' '}
            <strong>{contact.name}</strong> à l&apos;application. Il ne pourra plus se connecter.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
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
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleOpenChange(false)
            }}
          >
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
