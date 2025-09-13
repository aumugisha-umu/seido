"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Users, Search, Mail, Phone, MapPin, Edit, UserPlus, Send, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContactFormModal } from "@/components/contact-form-modal"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { contactService, teamService, contactInvitationService } from "@/lib/database-service"
import { TeamCheckModal } from "@/components/team-check-modal"

export default function ContactsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  
  // ✅ Toujours appeler tous les hooks, indépendamment du return early
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [filteredContacts, setFilteredContacts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userTeam, setUserTeam] = useState<any>(null)
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [resentInvitations, setResentInvitations] = useState<{[key: string]: {success: boolean, message?: string, magicLink?: string}}>({})
  const [resendingInvitations, setResendingInvitations] = useState<{[key: string]: boolean}>({})
  const [copiedLinks, setCopiedLinks] = useState<{[key: string]: boolean}>({})

  // Récupérer les contacts quand l'utilisateur et l'équipe sont prêts
  useEffect(() => {
    if (user?.id && teamStatus === 'verified') {
      loadContacts()
    }
  }, [user?.id, teamStatus])

  // Filtrer les contacts selon le terme de recherche
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredContacts(contacts)
    } else {
      const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.speciality?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredContacts(filtered)
    }
  }, [contacts, searchTerm])

  // ✅ Maintenant vérifier si on doit afficher la vérification d'équipe APRÈS tous les hooks
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  const loadContacts = async () => {
    if (!user?.id) {
      setError("Utilisateur non connecté")
      setLoading(false)
      return
    }

    // Ne pas charger si l'équipe n'est pas encore vérifiée
    if (teamStatus !== 'verified') {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log("📞 Loading contacts for user:", user.id)
      
      // 1. Récupérer l'équipe de l'utilisateur
      const userTeams = await teamService.getUserTeams(user.id)
      if (!userTeams || userTeams.length === 0) {
        console.log("⚠️ No team found for user")
        setContacts([])
        setFilteredContacts([])
        setLoading(false)
        return
      }
      
      const team = userTeams[0]
      setUserTeam(team)
      console.log("🏢 Found team:", team.id, team.name)
      
      // 2. Récupérer les contacts de l'équipe
      const teamContacts = await contactService.getTeamContacts(team.id)
      console.log("✅ Contacts loaded:", teamContacts.length)
      
      setContacts(teamContacts)
      setFilteredContacts(teamContacts)
      
      // 3. Charger les invitations en attente maintenant que nous avons l'équipe
      try {
        const invitations = await contactInvitationService.getPendingInvitations(team.id)
        console.log("✅ Pending invitations loaded:", invitations.length)
        setPendingInvitations(invitations)
      } catch (invitationError) {
        console.error("❌ Error loading pending invitations:", invitationError)
        // Ne pas faire échouer le chargement principal pour les invitations
        setPendingInvitations([])
      }
      
    } catch (error) {
      console.error("❌ Error loading contacts:", error)
      setError("Erreur lors du chargement des contacts")
    } finally {
      setLoading(false)
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
      // Recharger la liste des contacts
      await loadContacts()
      // Note: les invitations en attente sont rechargées automatiquement dans loadContacts()
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
      
      // Recharger la liste des contacts
      await loadContacts()
      
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

  const getContactTypeLabel = (contactType: string) => {
    const types = {
      'locataire': 'Locataire',
      'prestataire': 'Prestataire',
      'gestionnaire': 'Gestionnaire',
      'syndic': 'Syndic',
      'notaire': 'Notaire',
      'assurance': 'Assurance',
      'autre': 'Autre'
    }
    return types[contactType as keyof typeof types] || 'Non défini'
  }

  const getContactTypeBadgeStyle = (contactType: string) => {
    const styles = {
      'locataire': 'bg-blue-100 text-blue-800',
      'prestataire': 'bg-green-100 text-green-800',
      'gestionnaire': 'bg-purple-100 text-purple-800',
      'syndic': 'bg-orange-100 text-orange-800',
      'notaire': 'bg-gray-100 text-gray-800',
      'assurance': 'bg-red-100 text-red-800',
      'autre': 'bg-gray-100 text-gray-600'
    }
    return styles[contactType as keyof typeof styles] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/gestionnaire/dashboard")}
                className="flex items-center space-x-2"
              >
                <Building2 className="h-5 w-5" />
                <span>← Retour au dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Contacts</h1>
              <p className="text-gray-600">Gérez vos locataires, prestataires et autres contacts</p>
            </div>
            <Button onClick={() => setIsContactModalOpen(true)} className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Ajouter un contact</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Rechercher un contact par nom, email, téléphone..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">Filtrer par type</Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5 text-orange-500" />
                <span>Utilisateurs en attente de connexion ({pendingInvitations.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className={`p-3 rounded-lg border ${resentInvitations[invitation.id]?.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-orange-50 border-orange-200'
                    }`}
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
                              {getContactTypeLabel(invitation.contact_type)} • {invitation.name}
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
                                onClick={() => handleCopyMagicLink(resentInvitations[invitation.id]?.magicLink || '', invitation.id)}
                                disabled={copiedLinks[invitation.id]}
                                className={`${copiedLinks[invitation.id] 
                                  ? 'text-green-700 bg-green-100 border-green-400' 
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300'
                                }`}
                              >
                                {copiedLinks[invitation.id] ? '✅ Copié !' : '📋 Copier le lien d'invitation'}
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
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                En attente
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>
                                {getContactTypeLabel(invitation.contact_type)} • {invitation.name}
                              </span>
                              {invitation.company && (
                                <span>• {invitation.company}</span>
                              )}
                              <span>• Envoyée le {new Date(invitation.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={resendingInvitations[invitation.id] || loadingInvitations}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            {resendingInvitations[invitation.id] ? 'Génération...' : 'Renvoyer invitation'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contacts List */}
        <Card>
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
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {contacts.length === 0 ? "Aucun contact" : "Aucun contact trouvé"}
                </h3>
                <p className="text-gray-500 mb-4">
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
                          <h3 className="font-medium text-gray-900">{contact.name}</h3>
                          {contact.contact_type && (
                            <Badge variant="secondary" className={`${getContactTypeBadgeStyle(contact.contact_type)} text-xs font-medium`}>
                              {getContactTypeLabel(contact.contact_type)}
                            </Badge>
                          )}
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
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                          <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{contact.address}</span>
                          </div>
                        )}
                        {contact.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            <span>{contact.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Contacter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:text-gray-700"
                        onClick={() => router.push(`/gestionnaire/contacts/${contact.id}/modifier`)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                      <DeleteConfirmModal
                        onConfirm={() => handleDeleteContact(contact.id)}
                        itemName={contact.name}
                        itemType="le contact"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        defaultType="locataire"
      />
    </div>
  )
}