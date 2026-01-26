'use client'

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { isValidEmail } from '@/lib/validation/patterns'
import type { ContactWithCompany, InvitationStatus } from '../types'

/**
 * Hook parameters for contact invitation management
 */
interface UseContactInvitationParams {
  contact: ContactWithCompany
  contactId: string
  teamId: string
  initialInvitationStatus?: string | null
}

/**
 * Return type for the invitation hook
 */
export interface UseContactInvitationReturn {
  // State
  invitationStatus: InvitationStatus
  invitationLoading: boolean
  invitationId: string | null

  // Modal state
  showInviteModal: boolean
  showResendModal: boolean
  showCancelModal: boolean
  showRevokeModal: boolean
  revokeConfirmChecked: boolean

  // Email input for invite
  emailInput: string
  emailError: string | null

  // Modal setters
  setShowInviteModal: (show: boolean) => void
  setShowResendModal: (show: boolean) => void
  setShowCancelModal: (show: boolean) => void
  setShowRevokeModal: (show: boolean) => void
  setRevokeConfirmChecked: (checked: boolean) => void
  setEmailInput: (email: string) => void

  // Actions
  handleInvitationAction: (action: string) => Promise<void>
  handleSendInvitation: () => Promise<void>
  handleResendInvitation: () => Promise<void>
  handleCancelInvitation: () => Promise<void>
  handleRevokeAccess: () => Promise<void>
  loadInvitationStatus: () => Promise<void>
}

/**
 * Custom hook for managing contact invitation lifecycle
 * Handles sending, resending, cancelling, and revoking invitations
 */
export function useContactInvitation({
  contact,
  contactId,
  teamId,
  initialInvitationStatus
}: UseContactInvitationParams): UseContactInvitationReturn {
  const { toast } = useToast()

  // ============================================================================
  // STATE
  // ============================================================================

  const [invitationStatus, setInvitationStatus] = useState<InvitationStatus>(
    (initialInvitationStatus as InvitationStatus) ?? null
  )
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [invitationId, setInvitationId] = useState<string | null>(null)

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showResendModal, setShowResendModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [revokeConfirmChecked, setRevokeConfirmChecked] = useState(false)

  // Email input for invitation when email is missing
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Load current invitation status from API
   */
  const loadInvitationStatus = useCallback(async () => {
    try {
      setInvitationLoading(true)
      logger.info("Loading invitation status for contact:", contactId)

      const response = await fetch(`/api/contact-invitation-status?contactId=${contactId}`)

      if (response.ok) {
        const { status, invitationId: fetchedId } = await response.json()
        setInvitationStatus(status)
        setInvitationId(fetchedId)
        logger.info("Invitation status loaded:", status)
      } else {
        logger.info("No invitation found for this contact")
        setInvitationStatus(null)
        setInvitationId(null)
      }
    } catch (error) {
      logger.error("Error loading invitation status:", error)
      setInvitationStatus(null)
      setInvitationId(null)
    } finally {
      setInvitationLoading(false)
    }
  }, [contactId])

  /**
   * Send invitation to contact
   */
  const handleSendInvitation = async () => {
    if (!contact?.id) return

    // Validation if email is missing
    const emailToUse = contact.email || emailInput.trim()

    if (!emailToUse) {
      setEmailError('L\'email est requis pour envoyer une invitation')
      return
    }

    if (!contact.email && !isValidEmail(emailInput)) {
      setEmailError('Format d\'email invalide')
      return
    }

    try {
      setInvitationLoading(true)
      logger.info("Sending invitation to existing contact:", contact.id)

      const response = await fetch("/api/send-existing-contact-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          // Send email only if it's a new email (contact without email)
          ...((!contact.email && emailInput) && { email: emailInput.trim() })
        }),
      })

      if (response.ok) {
        const { invitationId: newInvitationId, isNewAuthUser } = await response.json()
        setInvitationId(newInvitationId)
        logger.info("Invitation sent successfully", { isNewAuthUser })

        toast({
          title: "Invitation envoyée",
          description: isNewAuthUser
            ? `Une invitation a été envoyée à ${emailToUse}`
            : `${contact.first_name || contact.name} a été ajouté à votre équipe (compte existant)`,
          variant: "default"
        })

        await loadInvitationStatus()
      } else {
        const error = await response.json()
        logger.error("Failed to send invitation:", error)
        toast({
          title: "Erreur",
          description: error.error || "Impossible d'envoyer l'invitation",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error("Error sending invitation:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setInvitationLoading(false)
      setShowInviteModal(false)
      setEmailInput('')
      setEmailError(null)
    }
  }

  /**
   * Resend existing invitation
   */
  const handleResendInvitation = async () => {
    if (!invitationId) {
      toast({
        title: "Erreur",
        description: "ID d'invitation manquant",
        variant: "destructive"
      })
      return
    }

    try {
      setInvitationLoading(true)
      logger.info("Resending invitation:", invitationId)

      const response = await fetch("/api/resend-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      })

      if (response.ok) {
        logger.info("Invitation resent successfully")
        toast({
          title: "Invitation renvoyée",
          description: `Un nouvel email a été envoyé à ${contact.email}`,
          variant: "default"
        })
        await loadInvitationStatus()
      } else {
        const error = await response.json()
        logger.error("Failed to resend invitation:", error)
        toast({
          title: "Erreur",
          description: error.error || "Impossible de renvoyer l'invitation",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error("Error resending invitation:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setInvitationLoading(false)
      setShowResendModal(false)
    }
  }

  /**
   * Cancel pending invitation
   */
  const handleCancelInvitation = async () => {
    if (!invitationId) {
      logger.error("No invitation ID available")
      toast({
        title: "Erreur",
        description: "ID d'invitation introuvable",
        variant: "destructive"
      })
      return
    }

    try {
      setInvitationLoading(true)
      logger.info("Cancelling invitation:", invitationId)

      const response = await fetch("/api/cancel-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      })

      if (response.ok) {
        logger.info("Invitation cancelled successfully")
        toast({
          title: "Invitation annulée",
          description: `L'invitation de ${contact.first_name || contact.name} a été annulée`,
          variant: "default"
        })
        await loadInvitationStatus()
      } else {
        const error = await response.json()
        logger.error("Failed to cancel invitation:", error)
        toast({
          title: "Erreur",
          description: error.error || "Impossible d'annuler l'invitation",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error("Error cancelling invitation:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setInvitationLoading(false)
      setShowCancelModal(false)
    }
  }

  /**
   * Revoke access for accepted invitation
   */
  const handleRevokeAccess = async () => {
    if (!contact?.id) return
    if (!revokeConfirmChecked) return

    try {
      setInvitationLoading(true)
      logger.info("Revoking access for contact:", contact.id)

      const response = await fetch("/api/revoke-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          teamId: contact.team_id || teamId
        }),
      })

      if (response.ok) {
        logger.info("Access revoked successfully")
        toast({
          title: "Accès révoqué",
          description: `${contact.first_name || contact.name} ne peut plus se connecter à l'application`,
          variant: "default"
        })
        await loadInvitationStatus()
      } else {
        const error = await response.json()
        logger.error("Failed to revoke access:", error)
        toast({
          title: "Erreur",
          description: error.error || "Impossible de révoquer l'accès",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error("Error revoking access:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setInvitationLoading(false)
      setRevokeConfirmChecked(false)
      setShowRevokeModal(false)
    }
  }

  /**
   * Handle invitation action routing
   */
  const handleInvitationAction = async (action: string) => {
    if (!contact?.id) return

    logger.info("Invitation action:", action, "for contact:", contact.id)

    switch (action) {
      case "open-chat":
        logger.info("Opening chat with contact:", contact.id)
        break
      case "send-invitation":
        await handleSendInvitation()
        break
      case "resend-invitation":
        await handleResendInvitation()
        break
      case "revoke-invitation":
        await handleRevokeAccess()
        break
      default:
        logger.info("Unknown invitation action:", action)
    }
  }

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load invitation status when component mounts
  useEffect(() => {
    loadInvitationStatus()
  }, [loadInvitationStatus])

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    invitationStatus,
    invitationLoading,
    invitationId,

    // Modal state
    showInviteModal,
    showResendModal,
    showCancelModal,
    showRevokeModal,
    revokeConfirmChecked,

    // Email input
    emailInput,
    emailError,

    // Modal setters
    setShowInviteModal,
    setShowResendModal,
    setShowCancelModal,
    setShowRevokeModal,
    setRevokeConfirmChecked,
    setEmailInput,

    // Actions
    handleInvitationAction,
    handleSendInvitation,
    handleResendInvitation,
    handleCancelInvitation,
    handleRevokeAccess,
    loadInvitationStatus
  }
}
