"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Building2, Users, Search, Mail, Phone, MapPin, Edit, UserPlus, Send, AlertCircle, X, ChevronDown, ChevronUp, Eye, MoreHorizontal, Archive } from "lucide-react"
import ContentNavigator from "@/components/content-navigator"
import { useRouter } from "next/navigation"
import { ContactFormModal } from "@/components/contact-form-modal"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useContactsData } from "@/hooks/use-contacts-data"
import { contactService, teamService, contactInvitationService, determineAssignmentType } from "@/lib/database-service"
import { TeamCheckModal } from "@/components/team-check-modal"
import NavigationDebugPanel from "@/components/debug/navigation-debug"

export default function ContactsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  
  // ✅ NOUVEAU: Utiliser le hook optimisé avec système de cache
  const { 
    contacts, 
    pendingInvitations, 
    userTeam, 
    contactsInvitationStatus, 
    loading, 
    error: contactsError, 
    refetch: refetchContacts 
  } = useContactsData()
  
  // ✅ Toujours appeler tous les hooks, indépendamment du return early
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [filteredContacts, setFilteredContacts] = useState<any[]>([])
  const [filteredInvitations, setFilteredInvitations] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [resentInvitations, setResentInvitations] = useState<{[key: string]: {success: boolean, message?: string, magicLink?: string}}>({})
  const [resendingInvitations, setResendingInvitations] = useState<{[key: string]: boolean}>({})
  const [copiedLinks, setCopiedLinks] = useState<{[key: string]: boolean}>({})
  const [cancellingInvitations, setCancellingInvitations] = useState<{[key: string]: boolean}>({})
  const [isInvitationsExpanded, setIsInvitationsExpanded] = useState(true) // Pour stocker le statut d'invitation de chaque contact

  // Fonction pour obtenir le badge de statut d'invitation
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

  // ✅ Fonction pour obtenir le badge de statut d'invitation pour les contacts
  const getContactInvitationBadge = (email: string) => {
    const status = contactsInvitationStatus[email?.toLowerCase()]
    
    if (!status) {
      return null // Pas d'invitation envoyée
    }

    const configs = {
      pending: { label: 'En attente', class: 'bg-orange-100 text-orange-800' },
      accepted: { label: 'Actif', class: 'bg-green-100 text-green-800' }, // ✅ "Actif" au lieu de "Acceptée" pour les contacts
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

  // ✅ NOUVEAU: Fonction pour obtenir le badge "Vous" si c'est l'utilisateur connecté
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

  // ✅ Gérer les erreurs de contacts et les combiner avec les erreurs locales
  useEffect(() => {
    if (contactsError) {
      setError(contactsError)
    }
  }, [contactsError])

  // État pour les filtres
  const [filters, setFilters] = useState({
    role: "all",
    category: "all", 
    speciality: "all",
    invitationStatus: "all"
  })

  // ✅ Filtrer les contacts ET les invitations selon le terme de recherche ET les filtres
  useEffect(() => {
    // Filtrage des contacts
    let filteredContactsResult = contacts

    // Filtrage par terme de recherche
    if (searchTerm.trim() !== "") {
      filteredContactsResult = filteredContactsResult.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.speciality?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrage par rôle
    if (filters.role !== "all") {
      filteredContactsResult = filteredContactsResult.filter(contact => contact.role === filters.role)
    }

    // Filtrage par catégorie (provider_category)
    if (filters.category !== "all") {
      filteredContactsResult = filteredContactsResult.filter(contact => contact.provider_category === filters.category)
    }

    // Filtrage par spécialité
    if (filters.speciality !== "all") {
      filteredContactsResult = filteredContactsResult.filter(contact => contact.speciality === filters.speciality)
    }

    // Filtrage par statut d'invitation
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

    // Filtrage par terme de recherche
    if (searchTerm.trim() !== "") {
      filteredInvitationsResult = filteredInvitationsResult.filter(invitation => 
        invitation.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invitation.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invitation.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invitation.speciality?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrage par rôle
    if (filters.role !== "all") {
      filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.role === filters.role)
    }

    // Filtrage par catégorie (provider_category)
    if (filters.category !== "all") {
      filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.provider_category === filters.category)
    }

    // Filtrage par spécialité
    if (filters.speciality !== "all") {
      filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.speciality === filters.speciality)
    }

    // Pour les invitations, on peut filtrer par statut d'invitation directement
    if (filters.invitationStatus !== "all") {
      if (filters.invitationStatus === "no_account") {
        // Les invitations représentent des comptes en attente, donc on ne filtre pas sur "no_account"
        filteredInvitationsResult = []
      } else if (filters.invitationStatus === "active") {
        filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.status === "accepted")
      } else {
        filteredInvitationsResult = filteredInvitationsResult.filter(invitation => invitation.status === filters.invitationStatus)
      }
    }

    setFilteredInvitations(filteredInvitationsResult)
  }, [contacts, pendingInvitations, searchTerm, filters, contactsInvitationStatus])

  // ✅ Maintenant vérifier si on doit afficher la vérification d'équipe APRÈS tous les hooks
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  // ✅ NOUVEAU: Fonction pour charger les invitations séparément
  const loadPendingInvitations = async (teamId: string) => {
    try {
      setLoadingInvitations(true)
      console.log("📧 Loading invitations for team:", teamId)
      
      const invitations = await contactInvitationService.getPendingInvitations(teamId)
      console.log("✅ Invitations loaded:", invitations.length)
      // Note: maintenant les invitations sont gérées par useContactsData, 
      // cette fonction est gardée pour les actions spéciales si nécessaire
    } catch (invitationError) {
      console.error("❌ Error loading invitations:", invitationError)
    } finally {
      setLoadingInvitations(false)
    }
  }


  const handleResendInvitation = async (contactId: string) => {
    try {
      console.log("🔄 [CONTACTS-UI] Resending invitation for contact:", contactId)
      
      // Marquer cette invitation comme en cours de renvoi
      setResendingInvitations(prev => ({ ...prev, [contactId]: true }))
      
      console.log("📞 [CONTACTS-UI] Calling contactInvitationService.resendInvitation...")
      const result = await contactInvitationService.resendInvitation(contactId)
      
      console.log("📊 [CONTACTS-UI] Resend result:", {
        success: result.success,
        hasMessage: !!result.message,
        hasMagicLink: !!result.magicLink,
        error: result.error
      })
      
      if (result.success) {
        console.log("✅ [CONTACTS-UI] Invitation resent successfully!")
        console.log("📫 [CONTACTS-UI] Email should have been sent")
        console.log("🔗 [CONTACTS-UI] Magic link generated:", result.magicLink?.substring(0, 80) + '...')
        
        // Marquer cette invitation comme renvoyée avec succès
        // Le vrai magic link généré par Supabase est maintenant disponible
        setResentInvitations(prev => ({ 
          ...prev, 
          [contactId]: { 
            success: true,
            message: result.message || 'Email de confirmation renvoyé',
            magicLink: result.magicLink // Le vrai lien de Supabase
          } 
        }))
        
      } else {
        console.error("❌ [CONTACTS-UI] Failed to resend invitation:", {
          contactId,
          error: result.error
        })
        setError(`Erreur lors du renvoi de l'invitation: ${result.error}`)
        setResentInvitations(prev => ({ 
          ...prev, 
          [contactId]: { success: false } 
        }))
      }
      
    } catch (error) {
      console.error("❌ [CONTACTS-UI] Exception in resend:", {
        contactId,
        error: error instanceof Error ? error.message : String(error)
      })
      setError("Erreur lors du renvoi de l'invitation")
      setResentInvitations(prev => ({ 
        ...prev, 
        [contactId]: { success: false } 
      }))
    } finally {
      console.log("🏁 [CONTACTS-UI] Resend process finished for contact:", contactId)
      // Enlever l'état de chargement
      setResendingInvitations(prev => ({ ...prev, [contactId]: false }))
    }
  }

  // ✅ NOUVEAU: Fonction pour annuler une invitation
  const handleCancelInvitation = async (invitationId: string) => {
    try {
      console.log("🚫 [CONTACTS-UI] Cancelling invitation:", invitationId)
      
      // Trouver l'invitation dans la liste pour debug
      const invitationToCancel = pendingInvitations.find(inv => inv.id === invitationId)
      console.log("🔍 [CONTACTS-UI] Invitation details:", invitationToCancel)
      
      // Marquer cette invitation comme en cours d'annulation
      setCancellingInvitations(prev => ({ ...prev, [invitationId]: true }))
      
      const response = await fetch('/api/cancel-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId })
      })

      const result = await response.json()
      console.log("📥 [CONTACTS-UI] API Response:", { 
        status: response.status, 
        ok: response.ok, 
        result 
      })
      
      if (response.ok && result.success) {
        console.log("✅ [CONTACTS-UI] Invitation cancelled successfully!")
        
        // Rafraîchir la liste des invitations
        if (userTeam?.id) {
          loadPendingInvitations(userTeam.id)
        }
        
        // Afficher un message de succès
        setError(null)
        
      } else {
        const errorMessage = result.error || `Erreur HTTP ${response.status}`
        console.error("❌ [CONTACTS-UI] Failed to cancel invitation:", errorMessage)
        setError(`Erreur lors de l'annulation: ${errorMessage}`)
      }
      
    } catch (error: any) {
      console.error("❌ [CONTACTS-UI] Exception in cancel:", error)
      const errorMessage = error?.message || "Erreur inconnue"
      setError(`Erreur lors de l'annulation de l'invitation: ${errorMessage}`)
    } finally {
      // Enlever l'état de chargement
      setCancellingInvitations(prev => ({ ...prev, [invitationId]: false }))
    }
  }

  const handleCopyMagicLink = async (magicLink: string, contactId: string) => {
    try {
      await navigator.clipboard.writeText(magicLink)
      console.log("✅ Magic link copied to clipboard")
      
      // Marquer comme copié temporairement
      setCopiedLinks(prev => ({ ...prev, [contactId]: true }))
      
      // Enlever l'état de succès après 2 secondes
      setTimeout(() => {
        setCopiedLinks(prev => ({ ...prev, [contactId]: false }))
      }, 2000)
      
    } catch (error) {
      console.error("❌ Failed to copy magic link:", error)
      setError("Erreur lors de la copie du lien")
    }
  }

  const handleCloseSuccessState = (contactId: string) => {
    // Enlever l'état de succès pour revenir au bouton "Renvoyer"
    setResentInvitations(prev => {
      const newState = { ...prev }
      delete newState[contactId]
      return newState
    })
    
    // Enlever aussi l'état de copie
    setCopiedLinks(prev => {
      const newState = { ...prev }
      delete newState[contactId]
      return newState
    })
  }

  const handleContactSubmit = async (contactData: any) => {
    try {
      console.log("📞 [CONTACTS-PAGE] Creating contact:", contactData)
      console.log("📞 [CONTACTS-PAGE] User team:", userTeam)
      
      if (!userTeam?.id) {
        console.error("❌ [CONTACTS-PAGE] No team found")
        setError("Aucune équipe trouvée pour créer le contact")
        return
      }
      
      const dataWithTeam = {
        ...contactData,
        teamId: userTeam.id
      }
      
      console.log("📞 [CONTACTS-PAGE] Calling service with:", dataWithTeam)
      
      // Utiliser le service d'invitation qui gère la création du contact + invitation optionnelle
      const result = await contactInvitationService.createContactWithOptionalInvite(dataWithTeam)
      
      console.log("✅ [CONTACTS-PAGE] Service completed, result:", result)
      
      if (result.invitation) {
        if (result.invitation.success) {
          console.log("✅ [CONTACTS-PAGE] Invitation sent successfully to:", contactData.email)
        } else {
          console.warn("⚠️ [CONTACTS-PAGE] Contact created but invitation failed:", result.invitation.error)
          setError(`Contact créé mais l'invitation a échoué: ${result.invitation.error}`)
        }
      }
      
      console.log("🔄 [CONTACTS-PAGE] Reloading contacts...")
      // ✅ NOUVEAU: Utiliser le refetch du hook optimisé
      await refetchContacts()
      console.log("✅ [CONTACTS-PAGE] Contacts reloaded, closing modal")
      setIsContactModalOpen(false)
      
    } catch (error) {
      console.error("❌ [CONTACTS-PAGE] Error creating contact:", error)
      console.error("❌ [CONTACTS-PAGE] Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        contactData: contactData,
        userTeam: userTeam
      })
      setError("Erreur lors de la création du contact")
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    try {
      console.log("🗑️ Deleting contact:", contactId)
      await contactService.delete(contactId)
      
      // ✅ NOUVEAU: Utiliser le refetch du hook optimisé
      await refetchContacts()
      
    } catch (error) {
      console.error("❌ Error deleting contact:", error)
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

  // Fonction pour obtenir le type d'assignation basé sur role/provider_category
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
      'syndic': 'Syndic',
      'notary': 'Notaire',
      'insurance': 'Assurance',
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
      'syndic': 'bg-orange-100 text-orange-800',
      'notary': 'bg-gray-100 text-gray-800',
      'insurance': 'bg-red-100 text-red-800',
      'other': 'bg-gray-100 text-gray-600'
    }
    return styles[assignmentType as keyof typeof styles] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header - Harmonized */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                Gestion des Contacts
              </h1>
              <p className="text-slate-600">
                Gérez vos locataires, prestataires et autres contacts
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex items-center space-x-2"
                onClick={() => setIsContactModalOpen(true)}
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

        {/* Content Navigator avec nouveaux Tabs */}
        <ContentNavigator
          tabs={[
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
                        <Button onClick={() => setIsContactModalOpen(true)} className="mt-2">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Ajouter un contact
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-lg">
                                {contact.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-1">
                                <h3 className="font-medium text-slate-900">{contact.name}</h3>
                                {contact.role && (
                                  <Badge 
                                    variant="secondary" 
                                    className={`${getContactTypeBadgeStyle(contact)} text-xs font-medium`}
                                  >
                                    {getContactTypeLabel(contact)}
                                  </Badge>
                                )}
                                {getCurrentUserBadge(contact.email)}
                                {getContactInvitationBadge(contact.email)}
                                {contact.company && (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                                    {contact.company}
                                  </Badge>
                                )}
                                {contact.speciality && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                    {getSpecialityLabel(contact.speciality)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-slate-600">
                                <div className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{contact.email}</span>
                                </div>
                                {contact.phone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{contact.phone}</span>
                                  </div>
                                )}
                              </div>
                              {contact.address && (
                                <div className="flex items-center space-x-1 text-sm text-slate-500 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{contact.address}</span>
                                </div>
                              )}
                              {contact.notes && (
                                <div className="text-sm text-slate-500 mt-1">
                                  <span>{contact.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Bouton Détails */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                              onClick={() => router.push(`/gestionnaire/contacts/details/${contact.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Détails
                            </Button>
                            
                            {/* Menu contextuel */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-slate-600 hover:text-slate-700"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/gestionnaire/contacts/modifier/${contact.id}`)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
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
                                    // TODO: Implémenter l'archivage du contact
                                    console.log('Archiver contact:', contact.id)
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
                  <div className="space-y-3">
                    {filteredInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className={
                          resentInvitations[invitation.id]?.success 
                            ? 'p-3 rounded-lg border bg-green-50 border-green-200' 
                            : 'p-3 rounded-lg border bg-orange-50 border-orange-200'
                        }
                      >
                        {resentInvitations[invitation.id]?.success ? (
                          <div>
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                              <div>
                                <div className="font-medium text-green-800">
                                  Invitation renvoyée à {invitation.email}
                                </div>
                                <div className="text-xs text-green-600">
                                  {getContactTypeLabel(invitation)} • {invitation.name}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-green-700 mb-3">
                              <p className="font-medium mb-1">
                                ✅ Lien de connexion généré avec succès !
                              </p>
                              <p className="text-xs text-green-600 mb-2">
                                Un email de connexion a été envoyé à l'utilisateur.
                              </p>
                              {resentInvitations[invitation.id]?.magicLink && (
                                <p>
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
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const magicLink = resentInvitations[invitation.id]?.magicLink || '';
                                      handleCopyMagicLink(magicLink, invitation.id);
                                    }}
                                    disabled={copiedLinks[invitation.id]}
                                    className={
                                      copiedLinks[invitation.id] 
                                        ? 'text-green-700 bg-green-100 border-green-400' 
                                        : 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300'
                                    }
                                  >
                                    {copiedLinks[invitation.id] ? "✅ Copié !" : "📋 Copier le lien d'invitation"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCloseSuccessState(invitation.id)}
                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300"
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
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCloseSuccessState(invitation.id)}
                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300"
                                  >
                                    Fermer
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <Send className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900">{invitation.email}</span>
                                  {getStatusBadge(invitation.status || 'pending')}
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span>
                                    {getContactTypeLabel(invitation)} • {invitation.name}
                                  </span>
                                  {invitation.company && (
                                    <span>• {invitation.company}</span>
                                  )}
                                  <span>• Envoyée le {new Date(invitation.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {(invitation.status || 'pending') === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  disabled={resendingInvitations[invitation.id] || loadingInvitations}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  {resendingInvitations[invitation.id] ? "Génération..." : "Renvoyer invitation"}
                                </Button>
                              )}
                              
                              {(invitation.status || 'pending') === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  disabled={cancellingInvitations[invitation.id] || loadingInvitations}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  {cancellingInvitations[invitation.id] ? "Annulation..." : "Annuler invitation"}
                                </Button>
                              )}
                              
                              {(invitation.status && invitation.status !== 'pending') && (
                                <span className="text-sm text-gray-500 italic">
                                  {invitation.status === 'accepted' && "✅ Invitation acceptée"}
                                  {invitation.status === 'expired' && "⏱️ Invitation expirée"}
                                  {invitation.status === 'cancelled' && "🚫 Invitation annulée"}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )
            }
          ]}
          defaultTab="contacts"
          searchPlaceholder="Rechercher un contact..."
          filters={[
            {
              id: "role",
              label: "Rôle",
              options: [
                { value: "all", label: "Tous les rôles" },
                { value: "gestionnaire", label: "Gestionnaire" },
                { value: "locataire", label: "Locataire" },
                { value: "prestataire", label: "Prestataire" }
              ],
              defaultValue: "all"
            },
            {
              id: "category",
              label: "Catégorie",
              options: [
                { value: "all", label: "Toutes les catégories" },
                { value: "prestataire", label: "Prestataire général" },
                { value: "syndic", label: "Syndic" },
                { value: "notaire", label: "Notaire" },
                { value: "assurance", label: "Assurance" },
                { value: "proprietaire", label: "Propriétaire" },
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
              
              // Si on change le rôle et que ce n'est plus "prestataire", 
              // réinitialiser la catégorie et la spécialité
              if (filterId === 'role' && value !== 'prestataire') {
                newFilters.category = 'all'
                newFilters.speciality = 'all'
              }
              
              // Si on change la catégorie et que ce n'est plus "prestataire",
              // réinitialiser la spécialité
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

        {/* Section temporaire masquée - Pending Invitations */}
        {false && pendingInvitations.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle 
                className="flex items-center justify-between cursor-pointer hover:text-orange-600 transition-colors"
                onClick={() => setIsInvitationsExpanded(!isInvitationsExpanded)}
              >
                <div className="flex items-center space-x-2">
                  <Send className="h-5 w-5 text-orange-500" />
                  <span>Invitations en attente ({pendingInvitations.length})</span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isInvitationsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            {isInvitationsExpanded && (
              <CardContent className="pt-0">
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className={
                      resentInvitations[invitation.id]?.success 
                        ? 'p-3 rounded-lg border bg-green-50 border-green-200' 
                        : 'p-3 rounded-lg border bg-orange-50 border-orange-200'
                    }
                  >
                    {resentInvitations[invitation.id]?.success ? (
                      // État de succès avec magic link
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <div>
                            <div className="font-medium text-green-800">
                              Invitation renvoyée à {invitation.email}
                            </div>
                            <div className="text-xs text-green-600">
                              {getContactTypeLabel(invitation)} • {invitation.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-green-700 mb-3">
                          <p className="font-medium mb-1">
                            ✅ Lien de connexion généré avec succès !
                          </p>
                          <p className="text-xs text-green-600 mb-2">
                            Un email de connexion a été envoyé à l'utilisateur.
                          </p>
                          {resentInvitations[invitation.id]?.magicLink && (
                            <p>
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
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const magicLink = resentInvitations[invitation.id]?.magicLink || '';
                                  handleCopyMagicLink(magicLink, invitation.id);
                                }}
                                disabled={copiedLinks[invitation.id]}
                                className={
                                  copiedLinks[invitation.id] 
                                    ? 'text-green-700 bg-green-100 border-green-400' 
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300'
                                }
                              >
                                {copiedLinks[invitation.id] ? "✅ Copié !" : "📋 Copier le lien d'invitation"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCloseSuccessState(invitation.id)}
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300"
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
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCloseSuccessState(invitation.id)}
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300"
                              >
                                Fermer
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      // Affichage normal de l'invitation
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Send className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900">{invitation.email}</span>
                              {getStatusBadge(invitation.status || 'pending')}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>
                                {getContactTypeLabel(invitation)} • {invitation.name}
                              </span>
                              {invitation.company && (
                                <span>• {invitation.company}</span>
                              )}
                              <span>• Envoyée le {new Date(invitation.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Bouton Renvoyer - seulement pour les invitations pending */}
                          {(invitation.status || 'pending') === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvitation(invitation.id)}
                              disabled={resendingInvitations[invitation.id] || loadingInvitations}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {resendingInvitations[invitation.id] ? "Génération..." : "Renvoyer invitation"}
                            </Button>
                          )}
                          
                          {/* ✅ NOUVEAU: Bouton Annuler - seulement pour les invitations pending */}
                          {(invitation.status || 'pending') === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              disabled={cancellingInvitations[invitation.id] || loadingInvitations}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <X className="h-3 w-3 mr-1" />
                              {cancellingInvitations[invitation.id] ? "Annulation..." : "Annuler invitation"}
                            </Button>
                          )}
                          
                          {/* Message pour les invitations non-pending */}
                          {(invitation.status && invitation.status !== 'pending') && (
                            <span className="text-sm text-gray-500 italic">
                              {invitation.status === 'accepted' && "✅ Invitation acceptée"}
                              {invitation.status === 'expired' && "⏱️ Invitation expirée"}
                              {invitation.status === 'cancelled' && "🚫 Invitation annulée"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Section temporaire masquée - Contacts List */}
        {false && <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Contacts ({loading ? '...' : filteredContacts.length})</span>
              {userTeam && (
                <Badge variant="outline" className="ml-2">
                  Équipe : {userTeam.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
              <div className="text-center py-8">
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
                  <Button onClick={() => setIsContactModalOpen(true)} className="mt-2">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter un contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {contact.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-medium text-slate-900">{contact.name}</h3>
                          {contact.role && (
                            <Badge 
                              variant="secondary" 
                              className={`${getContactTypeBadgeStyle(contact)} text-xs font-medium`}
                            >
                              {getContactTypeLabel(contact)}
                            </Badge>
                          )}
                          {/* ✅ NOUVEAU: Badge "Vous" si c'est l'utilisateur connecté */}
                          {getCurrentUserBadge(contact.email)}
                          {/* ✅ Badge de statut d'invitation */}
                          {getContactInvitationBadge(contact.email)}
                          {contact.company && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                              {contact.company}
                            </Badge>
                          )}
                          {contact.speciality && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              {getSpecialityLabel(contact.speciality)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{contact.email}</span>
                          </div>
                          {contact.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                        {contact.address && (
                          <div className="flex items-center space-x-1 text-sm text-slate-500 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{contact.address}</span>
                          </div>
                        )}
                        {contact.notes && (
                          <div className="text-sm text-slate-500 mt-1">
                            <span>{contact.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Bouton Détails */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                        onClick={() => router.push(`/gestionnaire/contacts/details/${contact.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                      
                      {/* Menu contextuel */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-slate-600 hover:text-slate-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => router.push(`/gestionnaire/contacts/modifier/${contact.id}`)}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
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
                              // TODO: Implémenter l'archivage du contact
                              console.log('Archiver contact:', contact.id)
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>}
      </main>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        onSuccess={refetchContacts}
        defaultType="locataire"
      />

      {/* ✅ DEBUG PANEL - Avec toggle pour afficher/cacher */}
      <NavigationDebugPanel />
    </div>
  )
}