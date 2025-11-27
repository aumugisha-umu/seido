"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
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

  // Synchroniser les états locaux avec les props quand elles changent
  useEffect(() => {
    setContacts(initialContacts)
    setPendingInvitations(initialInvitations)
    setCompanies(initialCompanies)
  }, [initialContacts, initialInvitations, initialCompanies])

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

  const handleDeleteContact = async (contactId: string) => {
    try {
      logger.info(`🗑️ Deleting contact: ${contactId}`)
      await contactService.delete(contactId, user?.id)
      await refetchContacts()
    } catch (error) {
      logger.error("❌ Error deleting contact:", error)
      setError("Erreur lors de la suppression du contact")
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="content-max-width flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                Contacts
              </h1>
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
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Content wrapper avec padding */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <ContactsNavigator
                contacts={contacts as any}
                invitations={pendingInvitations as any}
                companies={companies as any}
                loading={loading}
                onRefresh={refetchContacts}
                onResendInvitation={handleResendInvitation}
                onCancelInvitation={handleCancelInvitation}
                onDeleteContact={handleDeleteContact}
                className="bg-transparent border-0 shadow-none flex-1 flex flex-col min-h-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
