"use client"

import { useState, useEffect, useMemo } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Upload, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ContactsNavigator } from "@/components/contacts/contacts-navigator"
import { useRouter } from "next/navigation"
import { createContactService, createContactInvitationService } from '@/lib/services'
import { logger } from '@/lib/logger'

// Types for props
interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  companyLegacy?: string
  address?: string
  notes?: string
  role?: string
  provider_category?: string
  speciality?: string
  is_company?: boolean
  company_id?: string | null
  company?: {
    id: string
    name: string
    vat_number?: string | null
    street?: string | null
    street_number?: string | null
    postal_code?: string | null
    city?: string | null
    country?: string | null
  } | null
}

interface Invitation {
  id: string
  email: string
  name?: string
  company?: string
  speciality?: string
  provider_category?: string
  role?: string
  status?: string
  created_at: string
}

interface Company {
  id: string
  name: string
  legal_name?: string | null
  vat_number?: string | null
  email?: string | null
  phone?: string | null
  street?: string | null
  street_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  notes?: string | null
  website?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface UserTeam {
  id: string
  name?: string
}

interface User {
  id: string
  email?: string
}

interface ContactsPageClientProps {
  initialContacts: Contact[]
  initialInvitations: Invitation[]
  initialCompanies: Company[]
  initialContactsInvitationStatus: Record<string, string>
  userTeam: UserTeam
  user: User
}

export function ContactsPageClient({
  initialContacts,
  initialInvitations,
  initialCompanies,
  initialContactsInvitationStatus,
  userTeam,
  user
}: ContactsPageClientProps) {
  const router = useRouter()

  // État local initialisé avec les props
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(initialInvitations)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // États pour les modales de confirmation d'invitation
  const [invitationModalOpen, setInvitationModalOpen] = useState(false)
  const [invitationModalAction, setInvitationModalAction] = useState<'send' | 'resend' | 'cancel' | 'revoke' | null>(null)
  const [invitationModalContact, setInvitationModalContact] = useState<(Contact & { invitationStatus?: string }) | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(false)

  // Synchroniser les états locaux avec les props quand elles changent
  useEffect(() => {
    setContacts(initialContacts)
    setPendingInvitations(initialInvitations)
    setCompanies(initialCompanies)
  }, [initialContacts, initialInvitations, initialCompanies])

  // ✅ Enrichir les contacts avec leur statut d'invitation
  const contactsWithInvitationStatus = useMemo(() => {
    return contacts.map(contact => ({
      ...contact,
      invitationStatus: contact.email
        ? initialContactsInvitationStatus[contact.email.toLowerCase()] || null
        : null
    }))
  }, [contacts, initialContactsInvitationStatus])

  // Instancier les services nécessaires
  const contactService = createContactService()
  const contactInvitationService = createContactInvitationService()

  // Refetch via router.refresh()
  const refetchContacts = async () => {
    try {
      setLoading(true)
      router.refresh()
    } catch (error) {
      logger.error("❌ Error refetching contacts:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingInvitations = async (teamId: string) => {
    try {
      logger.info(`📧 Loading invitations for team: ${teamId}`)
      const contactInvitationServiceLocal = createContactInvitationService()
      const invitations = await contactInvitationServiceLocal.getPendingInvitations(teamId)
      setPendingInvitations(invitations)
    } catch (invitationError) {
      logger.error("❌ Error loading invitations:", invitationError)
    }
  }

  const handleResendInvitation = async (contactId: string) => {
    try {
      logger.info(`🔄 [CONTACTS-UI] Resending invitation for contact: ${contactId}`)
      const result = await contactInvitationService.resendInvitation(contactId)

      if (result.success) {
        logger.info("✅ [CONTACTS-UI] Invitation resent successfully!")
        // Note: Success feedback is handled by global toast or alert in a real app, 
        // here we might want to add a toast notification system later.
      } else {
        logger.error(`❌ [CONTACTS-UI] Failed to resend invitation: ${result.error}`)
        setError(`Erreur lors du renvoi de l'invitation: ${result.error}`)
      }
    } catch (error) {
      logger.error("❌ [CONTACTS-UI] Exception in resend:", error)
      setError("Erreur lors du renvoi de l'invitation")
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      logger.info(`🚫 [CONTACTS-UI] Cancelling invitation: ${invitationId}`)
      const response = await fetch('/api/cancel-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        logger.info("✅ [CONTACTS-UI] Invitation cancelled successfully!")
        if (userTeam?.id) {
          loadPendingInvitations(userTeam.id)
        }
        setError(null)
      } else {
        const errorMessage = result.error || `Erreur HTTP ${response.status}`
        logger.error(`❌ [CONTACTS-UI] Failed to cancel invitation: ${errorMessage}`)
        setError(`Erreur lors de l'annulation: ${errorMessage}`)
      }
    } catch (error: unknown) {
      logger.error("❌ [CONTACTS-UI] Exception in cancel:", error)
      const errorMessage = (error as any)?.message || "Erreur inconnue"
      setError(`Erreur lors de l'annulation de l'invitation: ${errorMessage}`)
    }
  }

  const handleArchiveContact = async (contactId: string) => {
    try {
      logger.info(`📦 Archiving contact: ${contactId}`)
      await contactService.delete(contactId, user?.id)
      toast.success("Contact archivé avec succès")
      await refetchContacts()
    } catch (error) {
      logger.error("❌ Error archiving contact:", error)
      toast.error("Erreur lors de l'archivage du contact")
    }
  }

  // ============================================================================
  // HANDLERS D'INVITATION AVEC MODALES DE CONFIRMATION
  // ============================================================================

  // Ouvrir la modale pour une action d'invitation
  const openInvitationModal = (action: 'send' | 'resend' | 'cancel' | 'revoke', contact: Contact & { invitationStatus?: string }) => {
    if (action === 'send' && !contact.email) {
      toast.error("Ce contact n'a pas d'email")
      return
    }
    setInvitationModalAction(action)
    setInvitationModalContact(contact)
    setInvitationModalOpen(true)
  }

  // Fermer la modale
  const closeInvitationModal = () => {
    setInvitationModalOpen(false)
    setInvitationModalAction(null)
    setInvitationModalContact(null)
  }

  // Confirmer l'action d'invitation
  const confirmInvitationAction = async () => {
    if (!invitationModalContact || !invitationModalAction) return

    setInvitationLoading(true)
    try {
      switch (invitationModalAction) {
        case 'send':
          await executeSendInvitation(invitationModalContact)
          break
        case 'resend':
          await executeResendInvitation(invitationModalContact)
          break
        case 'cancel':
          await executeCancelInvitation(invitationModalContact)
          break
        case 'revoke':
          await executeRevokeAccess(invitationModalContact)
          break
      }
    } finally {
      setInvitationLoading(false)
      closeInvitationModal()
    }
  }

  // Exécuter l'envoi d'invitation
  const executeSendInvitation = async (contact: Contact & { invitationStatus?: string }) => {
    try {
      logger.info(`📧 Sending invitation to contact: ${contact.email}`)
      const response = await fetch('/api/send-existing-contact-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          email: contact.email,
          name: contact.name,
          role: contact.role || 'locataire',
          teamId: userTeam?.id
        })
      })
      const result = await response.json()
      if (response.ok && result.success) {
        toast.success("Invitation envoyée avec succès")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de l'envoi de l'invitation")
      }
    } catch (error) {
      logger.error("❌ Error sending invitation:", error)
      toast.error("Erreur lors de l'envoi de l'invitation")
    }
  }

  // Exécuter le renvoi d'invitation
  const executeResendInvitation = async (contact: Contact & { invitationStatus?: string }) => {
    try {
      logger.info(`🔄 Resending invitation for contact: ${contact.id}`)
      const result = await contactInvitationService.resendInvitation(contact.id)
      if (result.success) {
        toast.success("Invitation relancée avec succès")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors du renvoi de l'invitation")
      }
    } catch (error) {
      logger.error("❌ Error resending invitation:", error)
      toast.error("Erreur lors du renvoi de l'invitation")
    }
  }

  // Exécuter l'annulation d'invitation
  const executeCancelInvitation = async (contact: Contact & { invitationStatus?: string }) => {
    const invitation = pendingInvitations.find(
      inv => inv.email?.toLowerCase() === contact.email?.toLowerCase()
    )
    if (!invitation) {
      toast.error("Invitation non trouvée")
      return
    }
    try {
      logger.info(`🚫 Cancelling invitation for contact: ${contact.email}`)
      const response = await fetch('/api/cancel-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: invitation.id })
      })
      const result = await response.json()
      if (response.ok && result.success) {
        toast.success("Invitation annulée avec succès")
        if (userTeam?.id) {
          loadPendingInvitations(userTeam.id)
        }
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de l'annulation")
      }
    } catch (error) {
      logger.error("❌ Error cancelling invitation:", error)
      toast.error("Erreur lors de l'annulation de l'invitation")
    }
  }

  // Exécuter le retrait d'accès
  const executeRevokeAccess = async (contact: Contact & { invitationStatus?: string }) => {
    try {
      logger.info(`🔒 Revoking access for contact: ${contact.id}`)
      const response = await fetch('/api/revoke-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id })
      })
      const result = await response.json()
      if (response.ok && result.success) {
        toast.success("Accès retiré avec succès")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors du retrait de l'accès")
      }
    } catch (error) {
      logger.error("❌ Error revoking access:", error)
      toast.error("Erreur lors du retrait de l'accès")
    }
  }

  // Handlers passés au navigator (ouvrent la modale)
  const handleSendContactInvitation = (contact: Contact & { invitationStatus?: string }) => openInvitationModal('send', contact)
  const handleResendContactInvitation = (contact: Contact & { invitationStatus?: string }) => openInvitationModal('resend', contact)
  const handleCancelContactInvitation = (contact: Contact & { invitationStatus?: string }) => openInvitationModal('cancel', contact)
  const handleRevokeContactAccess = (contact: Contact & { invitationStatus?: string }) => openInvitationModal('revoke', contact)

  // Configuration des modales par action
  const getInvitationModalConfig = () => {
    if (!invitationModalContact) return null
    const configs = {
      send: {
        title: "Envoyer une invitation",
        description: `Voulez-vous envoyer une invitation à ${invitationModalContact.name} (${invitationModalContact.email}) pour accéder à l'application ?`,
        confirmText: "Envoyer",
        variant: "default" as const
      },
      resend: {
        title: "Relancer l'invitation",
        description: `Voulez-vous renvoyer l'invitation à ${invitationModalContact.name} (${invitationModalContact.email}) ?`,
        confirmText: "Relancer",
        variant: "default" as const
      },
      cancel: {
        title: "Annuler l'invitation",
        description: `Voulez-vous annuler l'invitation envoyée à ${invitationModalContact.name} (${invitationModalContact.email}) ? Cette action est irréversible.`,
        confirmText: "Annuler l'invitation",
        variant: "destructive" as const
      },
      revoke: {
        title: "Retirer l'accès",
        description: `Voulez-vous retirer l'accès de ${invitationModalContact.name} (${invitationModalContact.email}) à l'application ? Cette personne ne pourra plus se connecter.`,
        confirmText: "Retirer l'accès",
        variant: "destructive" as const
      }
    }
    return invitationModalAction ? configs[invitationModalAction] : null
  }

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="content-max-width flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl mb-2">
                Contacts
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/biens/import')}
              >
                <Upload className="h-4 w-4" />
                <span>Importer</span>
              </Button>
              <Button
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/contacts/nouveau')}
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau contact</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4 flex-shrink-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Card wrapper - Structure exacte du dashboard */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-lg border border-border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Content wrapper avec padding */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <ContactsNavigator
                contacts={contactsWithInvitationStatus as any}
                invitations={pendingInvitations as any}
                companies={companies as any}
                loading={loading}
                onRefresh={refetchContacts}
                // Invitation tab actions
                onResendInvitation={handleResendInvitation}
                onCancelInvitation={handleCancelInvitation}
                // Contact actions
                onArchiveContact={handleArchiveContact}
                // Contact invitation actions
                onSendContactInvitation={handleSendContactInvitation as any}
                onResendContactInvitation={handleResendContactInvitation as any}
                onCancelContactInvitation={handleCancelContactInvitation as any}
                onRevokeContactAccess={handleRevokeContactAccess as any}
                className="bg-transparent border-0 shadow-none flex-1 flex flex-col min-h-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modale de confirmation pour les actions d'invitation */}
      <AlertDialog open={invitationModalOpen} onOpenChange={setInvitationModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getInvitationModalConfig()?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getInvitationModalConfig()?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeInvitationModal} disabled={invitationLoading}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmInvitationAction}
              disabled={invitationLoading}
              className={getInvitationModalConfig()?.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getInvitationModalConfig()?.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
