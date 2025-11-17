"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Users, Mail, Phone, MapPin, Edit, UserPlus, Send, AlertCircle, X, ChevronDown, ChevronUp, Eye, MoreHorizontal, MoreVertical, Archive, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import ContentNavigator from "@/components/content-navigator"
import { useRouter } from "next/navigation"
import { determineAssignmentType, createContactService, createContactInvitationService } from '@/lib/services'
import { logger } from '@/lib/logger'

// Types for props
interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  companyLegacy?: string  // Legacy company field (string only, for backward compatibility)
  address?: string
  notes?: string
  role?: string
  provider_category?: string
  speciality?: string
  // Champs société
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

  // ✅ État local initialisé avec les props (pas de hooks de fetch)
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(initialInvitations)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [contactsInvitationStatus, setContactsInvitationStatus] = useState<Record<string, string>>(initialContactsInvitationStatus)
  const [loading, setLoading] = useState(false)

  // ✅ Synchroniser les états locaux avec les props quand elles changent (après router.refresh)
  useEffect(() => {
    setContacts(initialContacts)
    setPendingInvitations(initialInvitations)
    setCompanies(initialCompanies)
    setContactsInvitationStatus(initialContactsInvitationStatus)
  }, [initialContacts, initialInvitations, initialCompanies, initialContactsInvitationStatus])

  // ✅ Instancier les services nécessaires
  const contactService = createContactService()
  const contactInvitationService = createContactInvitationService()

  // ✅ États UI (inchangés)
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [filteredInvitations, setFilteredInvitations] = useState<Invitation[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [resentInvitations, setResentInvitations] = useState<{[key: string]: {success: boolean, message?: string, magicLink?: string}}>({})
  const [resendingInvitations, setResendingInvitations] = useState<{[key: string]: boolean}>({})
  const [copiedLinks, setCopiedLinks] = useState<{[key: string]: boolean}>({})
  const [cancellingInvitations, setCancellingInvitations] = useState<{[key: string]: boolean}>({})
  const [isInvitationsExpanded, setIsInvitationsExpanded] = useState(true)

  // Fonctions helper (inchangées)
  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: 'En attente', class: 'bg-orange-100 text-orange-800' },
      accepted: { label: 'Acceptée', class: 'bg-green-100 text-green-800' },
      expired: { label: 'Expirée', class: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Annulée', class: 'bg-red-100 text-red-800' }
    }
    const config = configs[status as keyof typeof configs] || configs.pending
    return (
      <Badge variant="secondary" className={`${config.class} text-xs`}>
        {config.label}
      </Badge>
    )
  }

  const getContactInvitationBadge = (email: string) => {
    const status = contactsInvitationStatus[email?.toLowerCase()]

    if (!status) {
      return null
    }

    const configs = {
      pending: { label: 'En attente', class: 'bg-orange-100 text-orange-800' },
      accepted: { label: 'Actif', class: 'bg-green-100 text-green-800' },
      expired: { label: 'Invitation expirée', class: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Invitation annulée', class: 'bg-red-100 text-red-800' }
    }

    const config = configs[status as keyof typeof configs] || configs.pending

    return (
      <Badge variant="secondary" className={`${config.class} text-xs font-medium`}>
        {config.label}
      </Badge>
    )
  }

  const getCurrentUserBadge = (email: string) => {
    if (!user?.email || !email) {
      return null
    }

    const isCurrentUser = user.email.toLowerCase() === email.toLowerCase()

    if (!isCurrentUser) {
      return null
    }

    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs font-medium">
        Vous
      </Badge>
    )
  }

  // ✅ OPTIMISATION: Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // État pour les filtres
  const [filters, setFilters] = useState({
    role: "all",
    category: "all",
    speciality: "all",
    invitationStatus: "all"
  })

  // ✅ Filtrer les contacts ET les invitations
  useEffect(() => {
    let filteredContactsResult = contacts

    if (debouncedSearchTerm.trim() !== "") {
      filteredContactsResult = filteredContactsResult.filter(contact =>
        contact.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.companyLegacy?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.speciality?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        // Recherche dans le nom de la société
        (contact.is_company && contact.company?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        // Recherche dans le numéro de TVA
        (contact.is_company && contact.company?.vat_number?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      )
    }

    if (filters.role !== "all") {
      filteredContactsResult = filteredContactsResult.filter(contact => contact.role === filters.role)
    }

    if (filters.category !== "all") {
      filteredContactsResult = filteredContactsResult.filter(contact => contact.provider_category === filters.category)
    }

    if (filters.speciality !== "all") {
      filteredContactsResult = filteredContactsResult.filter(contact => contact.speciality === filters.speciality)
    }

    if (filters.invitationStatus !== "all") {
      filteredContactsResult = filteredContactsResult.filter(contact => {
        const invitationStatus = contactsInvitationStatus[contact.email?.toLowerCase()]

        if (filters.invitationStatus === "no_account") {
          return !invitationStatus
        } else if (filters.invitationStatus === "active") {
          return invitationStatus === "accepted"
        } else {
          return invitationStatus === filters.invitationStatus
        }
      })
    }

    setFilteredContacts(filteredContactsResult)

    // Filtrage des invitations
    let filteredInvitationsResult = pendingInvitations

    if (debouncedSearchTerm.trim() !== "") {
      filteredInvitationsResult = filteredInvitationsResult.filter(invitation =>
        invitation.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        invitation.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        invitation.company?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        invitation.speciality?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    if (filters.role !== "all") {
      filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.role === filters.role)
    }

    if (filters.category !== "all") {
      filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.provider_category === filters.category)
    }

    if (filters.speciality !== "all") {
      filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.speciality === filters.speciality)
    }

    if (filters.invitationStatus !== "all") {
      if (filters.invitationStatus === "no_account") {
        filteredInvitationsResult = []
      } else if (filters.invitationStatus === "active") {
        filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.status === "accepted")
      } else {
        filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.status === filters.invitationStatus)
      }
    }

    setFilteredInvitations(filteredInvitationsResult)

    // Filtrage des sociétés
    let filteredCompaniesResult = companies

    if (debouncedSearchTerm.trim() !== "") {
      filteredCompaniesResult = filteredCompaniesResult.filter(company =>
        company.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        company.legal_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        company.vat_number?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        company.city?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    setFilteredCompanies(filteredCompaniesResult)
  }, [contacts, pendingInvitations, companies, debouncedSearchTerm, filters, contactsInvitationStatus])

  // ✅ Refetch via router.refresh() pour déclencher le re-render du Server Component
  const refetchContacts = async () => {
    try {
      setLoading(true)
      // Utiliser router.refresh() pour déclencher un nouveau render du Server Component
      // qui re-fetch les données côté serveur (pas besoin d'API route /api/contacts)
      router.refresh()
    } catch (error) {
      logger.error("❌ Error refetching contacts:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingInvitations = async (teamId: string) => {
    try {
      setLoadingInvitations(true)
      logger.info(`📧 Loading invitations for team: ${teamId}`)

      const contactInvitationServiceLocal = createContactInvitationService()
      const invitations = await contactInvitationServiceLocal.getPendingInvitations(teamId)
      logger.info(`✅ Invitations loaded: ${invitations.length}`)
      setPendingInvitations(invitations)
    } catch (invitationError) {
      logger.error("❌ Error loading invitations:", invitationError)
    } finally {
      setLoadingInvitations(false)
    }
  }

  const handleResendInvitation = async (contactId: string) => {
    try {
      logger.info(`🔄 [CONTACTS-UI] Resending invitation for contact: ${contactId}`)
      setResendingInvitations(prev => ({ ...prev, [contactId]: true }))

      const result = await contactInvitationService.resendInvitation(contactId)

      if (result.success) {
        logger.info("✅ [CONTACTS-UI] Invitation resent successfully!")
        setResentInvitations(prev => ({
          ...prev,
          [contactId]: {
            success: true,
            message: result.message || 'Email de confirmation renvoyé',
            magicLink: result.magicLink
          }
        }))
      } else {
        logger.error(`❌ [CONTACTS-UI] Failed to resend invitation: ${result.error}`)
        setError(`Erreur lors du renvoi de l'invitation: ${result.error}`)
        setResentInvitations(prev => ({
          ...prev,
          [contactId]: { success: false }
        }))
      }
    } catch (error) {
      logger.error("❌ [CONTACTS-UI] Exception in resend:", error)
      setError("Erreur lors du renvoi de l'invitation")
      setResentInvitations(prev => ({
        ...prev,
        [contactId]: { success: false }
      }))
    } finally {
      setResendingInvitations(prev => ({ ...prev, [contactId]: false }))
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      logger.info(`🚫 [CONTACTS-UI] Cancelling invitation: ${invitationId}`)
      setCancellingInvitations(prev => ({ ...prev, [invitationId]: true }))

      const response = await fetch('/api/cancel-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    } finally {
      setCancellingInvitations(prev => ({ ...prev, [invitationId]: false }))
    }
  }

  const handleCopyMagicLink = async (magicLink: string, contactId: string) => {
    try {
      await navigator.clipboard.writeText(magicLink)
      logger.info("✅ Magic link copied to clipboard")
      setCopiedLinks(prev => ({ ...prev, [contactId]: true }))
      setTimeout(() => {
        setCopiedLinks(prev => ({ ...prev, [contactId]: false }))
      }, 2000)
    } catch (error) {
      logger.error("❌ Failed to copy magic link:", error)
      setError("Erreur lors de la copie du lien")
    }
  }

  const handleCloseSuccessState = (contactId: string) => {
    setResentInvitations(prev => {
      const newState = { ...prev }
      delete newState[contactId]
      return newState
    })
    setCopiedLinks(prev => {
      const newState = { ...prev }
      delete newState[contactId]
      return newState
    })
  }


  const handleDeleteContact = async (contactId: string) => {
    try {
      logger.info(`🗑️ Deleting contact: ${contactId}`)
      await contactService.delete(contactId)
      await refetchContacts()
    } catch (error) {
      logger.error("❌ Error deleting contact:", error)
      setError("Erreur lors de la suppression du contact")
    }
  }

  const getSpecialityLabel = (speciality: string) => {
    const specialities = {
      'plomberie': 'Plomberie',
      'electricite': 'Électricité',
      'chauffage': 'Chauffage',
      'serrurerie': 'Serrurerie',
      'peinture': 'Peinture',
      'menage': 'Ménage',
      'jardinage': 'Jardinage',
      'autre': 'Autre'
    }
    return specialities[speciality as keyof typeof specialities] || speciality
  }

  const getAssignmentType = (contact: any): string => {
    if (!contact.role) return 'Non défini'

    const assignmentUser = {
      id: contact.id,
      role: contact.role,
      provider_category: contact.provider_category,
      speciality: contact.speciality
    }

    return determineAssignmentType(assignmentUser)
  }

  const getContactTypeLabel = (contact: any) => {
    const assignmentType = getAssignmentType(contact)

    const types = {
      'tenant': 'Locataire',
      'owner': 'Propriétaire',
      'provider': 'Prestataire',
      'manager': 'Gestionnaire',
      'other': 'Autre'
    }
    return types[assignmentType as keyof typeof types] || 'Non défini'
  }

  const getContactTypeBadgeStyle = (contact: any) => {
    const assignmentType = getAssignmentType(contact)

    const styles = {
      'tenant': 'bg-blue-100 text-blue-800',
      'owner': 'bg-emerald-100 text-emerald-800',
      'provider': 'bg-green-100 text-green-800',
      'manager': 'bg-purple-100 text-purple-800',
      'other': 'bg-gray-100 text-gray-600'
    }
    return styles[assignmentType as keyof typeof styles] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="layout-container flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                 Contacts
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/contacts/nouveau')}
              >
                <UserPlus className="h-4 w-4" />
                <span>Ajouter un contact</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content Navigator */}
        <ContentNavigator
          tabs={useMemo(() => [
            {
              id: "contacts",
              label: "Contacts",
              icon: Users,
              count: loading ? "..." : filteredContacts.length,
              content: (
                <>
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">
                        {contacts.length === 0 ? "Aucun contact" : "Aucun contact trouvé"}
                      </h3>
                      <p className="text-slate-500 mb-4">
                        {contacts.length === 0
                          ? "Commencez par ajouter vos premiers contacts."
                          : "Essayez de modifier votre recherche."}
                      </p>
                      {contacts.length === 0 && (
                        <Button onClick={() => router.push('/gestionnaire/contacts/nouveau')} className="mt-2">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Ajouter un contact
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredContacts.map((contact) => (
                        <Card
                          key={contact.id}
                          className="p-3 flex flex-col hover:shadow-md transition-shadow"
                        >
                          {/* Header avec avatar, nom, badges et actions */}
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-sm">
                                {contact.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-medium text-slate-900 text-base">{contact.name}</h3>
                                {contact.role && (
                                  <Badge
                                    variant="secondary"
                                    className={`${getContactTypeBadgeStyle(contact)} text-xs font-medium`}
                                  >
                                    {getContactTypeLabel(contact)}
                                  </Badge>
                                )}
                                {contact.is_company && contact.company && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {contact.company.name}
                                  </Badge>
                                )}
                                {getCurrentUserBadge(contact.email)}
                                {getContactInvitationBadge(contact.email)}
                                {!contact.is_company && contact.companyLegacy && (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                                    {contact.companyLegacy}
                                  </Badge>
                                )}
                                {contact.speciality && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                    {getSpecialityLabel(contact.speciality)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Actions standardisées: Edit → View → Menu */}
                            <div className="flex-shrink-0 flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                                onClick={() => router.push(`/gestionnaire/contacts/modifier/${contact.id}`)}
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                                onClick={() => router.push(`/gestionnaire/contacts/details/${contact.id}`)}
                                title="Voir détails"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                                    title="Plus d'actions"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                                    className="cursor-pointer"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Contacter
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      logger.info(`Archiver contact: ${contact.id}`)
                                      setError("Fonctionnalité d'archivage bientôt disponible")
                                    }}
                                    className="cursor-pointer text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archiver
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Détails empilés verticalement - flex-1 pour pousser le bouton en bas */}
                          <div className="space-y-1.5 text-sm text-slate-600 flex-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {!contact.is_company && contact.address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                <span className="text-slate-500">{contact.address}</span>
                              </div>
                            )}
                            {contact.notes && (
                              <div className="text-slate-500 pt-1.5 border-t mt-2">
                                <span>{contact.notes}</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )
            },
            {
              id: "invitations",
              label: "Invitations",
              icon: Send,
              count: loading ? "..." : filteredInvitations.length,
              content: (
                filteredInvitations.length === 0 ? (
                  <div className="text-center py-12">
                    <Send className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      {pendingInvitations.length === 0 ? "Aucune invitation en attente" : "Aucune invitation trouvée"}
                    </h3>
                    <p className="text-slate-500 mb-6">
                      {pendingInvitations.length === 0
                        ? "Les invitations que vous enverrez apparaîtront ici"
                        : "Essayez de modifier votre recherche ou vos filtres."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredInvitations.map((invitation) => (
                      <Card
                        key={invitation.id}
                        className={
                          resentInvitations[invitation.id]?.success
                            ? 'p-4 bg-green-50 border-green-200'
                            : 'p-4 bg-orange-50 border-orange-200'
                        }
                      >
                        {resentInvitations[invitation.id]?.success ? (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs">✓</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-green-800 text-sm truncate">
                                  Invitation renvoyée à {invitation.email}
                                </div>
                                <div className="text-xs text-green-600">
                                  {getContactTypeLabel(invitation)} • {invitation.name}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-green-700 mb-3">
                              <p className="font-medium mb-1 text-xs">
                                ✅ Lien de connexion généré avec succès !
                              </p>
                              <p className="text-xs text-green-600 mb-2">
                                Un email de connexion a été envoyé à l'utilisateur.
                              </p>
                              {resentInvitations[invitation.id]?.magicLink && (
                                <p className="text-xs">
                                  Vous pouvez également copier le lien de connexion ci-dessous pour l'envoyer manuellement :
                                </p>
                              )}
                            </div>
                            {resentInvitations[invitation.id]?.magicLink ? (
                              <>
                                <div className="bg-white border border-green-300 rounded p-2 mb-3">
                                  <code className="text-xs text-gray-600 break-all font-mono">
                                    {resentInvitations[invitation.id]?.magicLink}
                                  </code>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const magicLink = resentInvitations[invitation.id]?.magicLink || '';
                                      handleCopyMagicLink(magicLink, invitation.id);
                                    }}
                                    disabled={copiedLinks[invitation.id]}
                                    className={
                                      copiedLinks[invitation.id]
                                        ? 'text-green-700 bg-green-100 border-green-400 w-full'
                                        : 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300 w-full'
                                    }
                                  >
                                    {copiedLinks[invitation.id] ? "✅ Copié !" : "📋 Copier le lien"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCloseSuccessState(invitation.id);
                                    }}
                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300 w-full"
                                  >
                                    Fermer
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-white border border-green-300 rounded p-2 mb-3">
                                  <p className="text-xs text-gray-600">
                                    📧 L'email de connexion a été envoyé à <strong>{invitation.email}</strong>
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Le destinataire recevra un lien de connexion magique directement dans sa boîte mail.
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseSuccessState(invitation.id);
                                  }}
                                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300 w-full"
                                >
                                  Fermer
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Send className="h-4 w-4 text-orange-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate mb-1">{invitation.email}</div>
                                {getStatusBadge(invitation.status || 'pending')}
                              </div>
                            </div>

                            <div className="space-y-2 text-xs text-gray-600 mb-3">
                              <div>{getContactTypeLabel(invitation)} • {invitation.name}</div>
                              {invitation.company && (
                                <div>Société : {invitation.company}</div>
                              )}
                              <div className="text-gray-500">
                                Envoyée le {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              {(invitation.status || 'pending') === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResendInvitation(invitation.id);
                                    }}
                                    disabled={resendingInvitations[invitation.id] || loadingInvitations}
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 w-full"
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    {resendingInvitations[invitation.id] ? "Génération..." : "Renvoyer invitation"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelInvitation(invitation.id);
                                    }}
                                    disabled={cancellingInvitations[invitation.id] || loadingInvitations}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    {cancellingInvitations[invitation.id] ? "Annulation..." : "Annuler invitation"}
                                  </Button>
                                </>
                              )}

                              {(invitation.status && invitation.status !== 'pending') && (
                                <div className="text-sm text-gray-500 italic text-center py-2">
                                  {invitation.status === 'accepted' && "✅ Invitation acceptée"}
                                  {invitation.status === 'expired' && "⏱️ Invitation expirée"}
                                  {invitation.status === 'cancelled' && "🚫 Invitation annulée"}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )
              )
            },
            {
              id: "companies",
              label: "Sociétés",
              icon: Building2,
              count: loading ? "..." : filteredCompanies.length,
              content: (
                filteredCompanies.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      {companies.length === 0 ? "Aucune société" : "Aucune société trouvée"}
                    </h3>
                    <p className="text-slate-500 mb-6">
                      {companies.length === 0
                        ? "Les sociétés que vous créez apparaîtront ici"
                        : "Essayez de modifier votre recherche."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCompanies.map((company) => (
                      <Card
                        key={company.id}
                        className="p-3 flex flex-col hover:shadow-md transition-shadow"
                      >
                        {/* Header avec icône société, nom, badges et actions */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-medium text-slate-900 text-base">{company.name}</h3>
                              {company.is_active ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                                  Inactive
                                </Badge>
                              )}
                              {company.legal_name && company.legal_name !== company.name && (
                                <span className="text-xs text-gray-500 italic">
                                  ({company.legal_name})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions standardisées: Edit → View → Menu */}
                          <div className="flex-shrink-0 flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                              onClick={() => {
                                logger.info(`Modifier société: ${company.id}`)
                                setError("Page de modification société bientôt disponible")
                              }}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                              onClick={() => {
                                logger.info(`Voir détails société: ${company.id}`)
                                setError("Page de détails société bientôt disponible")
                              }}
                              title="Voir détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                                  title="Plus d'actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {company.email && (
                                  <DropdownMenuItem
                                    onClick={() => window.open(`mailto:${company.email}`, '_blank')}
                                    className="cursor-pointer"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Contacter
                                  </DropdownMenuItem>
                                )}
                                {company.website && (
                                  <DropdownMenuItem
                                    onClick={() => window.open(company.website!, '_blank')}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir le site web
                                  </DropdownMenuItem>
                                )}
                                {(company.email || company.website) && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                  onClick={() => {
                                    logger.info(`${company.is_active ? 'Désactiver' : 'Réactiver'} société: ${company.id}`)
                                    setError(`Fonctionnalité de ${company.is_active ? 'désactivation' : 'réactivation'} bientôt disponible`)
                                  }}
                                  className={`cursor-pointer ${
                                    company.is_active
                                      ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                      : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                  }`}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  {company.is_active ? 'Désactiver' : 'Réactiver'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Détails empilés verticalement - flex-1 pour pousser le bouton en bas */}
                        <div className="space-y-1.5 text-sm text-slate-600 flex-1">
                          {company.vat_number && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <span className="font-mono text-sm">TVA: {company.vat_number}</span>
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{company.email}</span>
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <span>{company.phone}</span>
                            </div>
                          )}
                          {company.city && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-500">
                                {company.street && `${company.street}`}
                                {company.street_number && ` ${company.street_number}`}
                                {(company.street || company.street_number) && ', '}
                                {company.postal_code && `${company.postal_code} `}
                                {company.city}
                                {company.country && `, ${company.country}`}
                              </span>
                            </div>
                          )}
                          {company.notes && (
                            <div className="text-slate-500 pt-1.5 border-t mt-2">
                              <span>{company.notes}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              )
            }
          ], [loading, filteredContacts, filteredInvitations, filteredCompanies, contacts, pendingInvitations, companies, copiedLinks, resendingInvitations, cancellingInvitations, resentInvitations, loadingInvitations, router])}
          searchPlaceholder="Rechercher un contact..."
          filters={[
            {
              id: "role",
              label: "Rôle",
              options: [
                { value: "all", label: "Tous les rôles" },
                { value: "gestionnaire", label: "Gestionnaire" },
                { value: "locataire", label: "Locataire" },
                { value: "proprietaire", label: "Propriétaire" },
                { value: "prestataire", label: "Prestataire" }
              ],
              defaultValue: "all"
            },
            {
              id: "category",
              label: "Catégorie",
              options: [
                { value: "all", label: "Toutes les catégories" },
                { value: "prestataire", label: "Prestataire" },
                { value: "autre", label: "Autre" }
              ],
              defaultValue: "all"
            },
            {
              id: "speciality",
              label: "Spécialité",
              options: [
                { value: "all", label: "Toutes les spécialités" },
                { value: "plomberie", label: "Plomberie" },
                { value: "electricite", label: "Électricité" },
                { value: "chauffage", label: "Chauffage" },
                { value: "serrurerie", label: "Serrurerie" },
                { value: "peinture", label: "Peinture" },
                { value: "menage", label: "Ménage" },
                { value: "jardinage", label: "Jardinage" },
                { value: "autre", label: "Autre" }
              ],
              defaultValue: "all"
            },
            {
              id: "invitationStatus",
              label: "Statut d'invitation",
              options: [
                { value: "all", label: "Tous les statuts" },
                { value: "no_account", label: "Pas de compte" },
                { value: "pending", label: "Invitation envoyée" },
                { value: "expired", label: "Expirée" },
                { value: "cancelled", label: "Annulée" },
                { value: "active", label: "Actif" }
              ],
              defaultValue: "all"
            }
          ]}
          onSearch={(value) => setSearchTerm(value)}
          onFilterChange={(filterId, value) => {
            setFilters(prev => {
              const newFilters = {
                ...prev,
                [filterId]: value
              }

              if (filterId === 'role' && value !== 'prestataire') {
                newFilters.category = 'all'
                newFilters.speciality = 'all'
              }

              if (filterId === 'category' && value !== 'prestataire') {
                newFilters.speciality = 'all'
              }

              return newFilters
            })
          }}
          onResetFilters={() => {
            setFilters({
              role: "all",
              category: "all",
              speciality: "all",
              invitationStatus: "all"
            })
          }}
          filterValues={filters}
        />
    </div>
  )
}
