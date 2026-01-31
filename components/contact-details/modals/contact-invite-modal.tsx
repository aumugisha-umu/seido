'use client'

import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail } from 'lucide-react'
import type { ContactWithCompany } from '../types'

interface ContactInviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactWithCompany
  emailInput: string
  emailError: string | null
  invitationLoading: boolean
  onEmailChange: (email: string) => void
  onClearError: () => void
  onSendInvitation: () => Promise<void>
}

/**
 * Modal for inviting a new contact to the application
 * Handles cases where contact may or may not have an email
 */
export function ContactInviteModal({
  open,
  onOpenChange,
  contact,
  emailInput,
  emailError,
  invitationLoading,
  onEmailChange,
  onClearError,
  onSendInvitation
}: ContactInviteModalProps) {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      onEmailChange('')
      onClearError()
    }
  }

  const subtitle = contact.email
    ? `Un email d'invitation sera envoyé à ${contact.email} pour créer son compte.`
    : "Ce contact n'a pas d'adresse email. Veuillez en saisir une."

  return (
    <UnifiedModal
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      preventCloseOnOutsideClick={invitationLoading}
    >
      <UnifiedModalHeader
        title={`Inviter ${contact.name}`}
        subtitle={subtitle}
        icon={<Mail className="h-5 w-5" />}
      />

      <UnifiedModalBody>
        {/* Conditional email input when contact has no email */}
        {!contact.email && (
          <div className="space-y-2">
            <Label htmlFor="invitation-email" className="text-sm font-medium">
              Adresse email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invitation-email"
              type="email"
              placeholder="exemple@email.com"
              value={emailInput}
              onChange={(e) => {
                onEmailChange(e.target.value)
                onClearError()
              }}
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          </div>
        )}
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={() => handleOpenChange(false)}>
          Annuler
        </Button>
        <Button
          onClick={onSendInvitation}
          disabled={invitationLoading || (!contact.email && !emailInput.trim())}
        >
          {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Envoyer l&apos;invitation
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
