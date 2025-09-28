"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  User, 
  Briefcase, 
  Shield, 
  FileCheck, 
  Car, 
  MoreHorizontal, 
  Plus, 
  X, 
  Search, 
  Loader2, 
  Users 
} from "lucide-react"
import ContactFormModal from "@/components/contact-form-modal"
import { contactService, contactInvitationService, determineAssignmentType } from "@/lib/database-service"

// Types de contacts avec leurs configurations visuelles
const contactTypes = [
  { key: "tenant", label: "Locataire", icon: User, color: "text-blue-600" },
  { key: "provider", label: "Prestataire", icon: Briefcase, color: "text-green-600" },
  { key: "syndic", label: "Syndic", icon: Shield, color: "text-purple-600" },
  { key: "notary", label: "Notaire", icon: FileCheck, color: "text-orange-600" },
  { key: "insurance", label: "Assurance", icon: Car, color: "text-red-600" },
  { key: "other", label: "Autre", icon: MoreHorizontal, color: "text-gray-600" },
]

// Interface pour un contact
interface Contact {
  id: string
  name: string
  email: string
  type: string
  phone?: string
  speciality?: string
}

// Props du composant principal (interface simplifiée et centralisée)
interface ContactSelectorProps {
  // ID de l'équipe pour charger les contacts
  teamId?: string
  // Mode d'affichage : compact pour immeuble, full pour lot
  displayMode?: "compact" | "full"
  // Titre principal
  title?: string
  // Description
  description?: string
  // Types de contacts autorisés (tous par défaut)
  allowedContactTypes?: string[]
  // Contacts déjà sélectionnés/assignés (pour affichage)
  selectedContacts?: {[contactType: string]: Contact[]}
  // Callback quand un contact est sélectionné - AVEC CONTEXTE
  onContactSelected?: (contact: Contact, contactType: string, context?: { lotId?: string }) => void
  // Callback quand un contact est retiré - AVEC CONTEXTE
  onContactRemoved?: (contactId: string, contactType: string, context?: { lotId?: string }) => void
  // Callback quand un nouveau contact est créé - AVEC CONTEXTE
  onContactCreated?: (contact: any, contactType: string, context?: { lotId?: string }) => void
  // Classe CSS personnalisée
  className?: string
  // Si true, ne pas afficher le titre
  hideTitle?: boolean
  // NOUVEAU : Contexte pour identifier le lot (optionnel)
  lotId?: string
}

// Interface pour les méthodes exposées via ref
export interface ContactSelectorRef {
  openContactModal: (contactType: string, lotId?: string) => void
}

export const ContactSelector = forwardRef<ContactSelectorRef, ContactSelectorProps>(({
  teamId,
  displayMode = "full",
  title = "Assignation des contacts",
  description = "Assignez des contacts à vos lots (optionnel)",
  allowedContactTypes = contactTypes.map(type => type.key),
  selectedContacts = {},
  onContactSelected,
  onContactRemoved,
  onContactCreated,
  className = "",
  hideTitle = false,
  lotId  // NOUVEAU : contexte pour identifier le lot
}, ref) => {
  // États pour le modal de sélection
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedContactType, setSelectedContactType] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [existingContacts, setExistingContacts] = useState<any[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  // NOUVEAU : État pour stocker le lotId temporaire lors de l'ouverture externe
  const [externalLotId, setExternalLotId] = useState<string | undefined>(undefined)
  
  // États pour le modal de création
  const [isContactFormModalOpen, setIsContactFormModalOpen] = useState(false)
  const [prefilledContactType, setPrefilledContactType] = useState<string>("")

  // Filtrer les types de contacts autorisés
  const filteredContactTypes = contactTypes.filter(type => 
    allowedContactTypes.includes(type.key)
  )

  // Fonction interne pour ouvrir le modal (sera utilisée par le composant et exposée via ref)
  const handleOpenContactModal = async (contactType: string) => {
    console.log('🚀 [ContactSelector] openContactModal appelé avec type:', contactType)
    setSelectedContactType(contactType)
    setSearchTerm("")
    setIsContactModalOpen(true)
    
    // Charger les contacts existants du type correspondant
    if (teamId) {
      setIsLoadingContacts(true)
      try {
        console.log('📞 [ContactSelector] Loading contacts for team:', teamId)
        const teamContacts = await contactService.getTeamContacts(teamId)
        
        console.log('✅ [ContactSelector] Loaded', teamContacts?.length, 'contacts')
        console.log('📋 [ContactSelector] Sample contact:', JSON.stringify(teamContacts?.[0], null, 2))
        
        // Filtrer selon le type de contact demandé (logique centralisée)
        const filteredContacts = teamContacts.filter(contact => {
          // Convertir les noms de rôles français (BDD) vers anglais (interface TypeScript)
          const mappedRole = (() => {
            switch(contact.role) {
              case 'gestionnaire': return 'manager'
              case 'locataire': return 'tenant'  
              case 'prestataire': return 'provider'
              case 'admin': return 'admin'
              default: return contact.role
            }
          })()

          // Convertir les catégories françaises (BDD) vers anglaises (interface TypeScript)
          const mappedProviderCategory = (() => {
            switch(contact.provider_category) {
              case 'prestataire': return 'service'
              case 'assurance': return 'insurance'
              case 'notaire': return 'legal'
              case 'proprietaire': return 'owner'
              case 'autre': return 'other'
              case 'syndic': return 'syndic'  // Reste pareil
              default: return contact.provider_category
            }
          })()

          const assignmentUser = {
            id: contact.id,
            role: mappedRole as any,
            provider_category: mappedProviderCategory as any,
            speciality: (contact.speciality || undefined) as string | undefined  // Convertir null en undefined
          }
          
          console.log('🧪 [ContactSelector] Processing:', contact?.name, 'DB role:', contact?.role, '→ mapped:', mappedRole, 'DB category:', contact?.provider_category, '→ mapped:', mappedProviderCategory)
          
          const assignmentType = determineAssignmentType(assignmentUser)
          const matches = assignmentType === contactType
          
          console.log('🧪 [ContactSelector] AssignmentType:', assignmentType, 'matches', contactType, '?', matches)
          
          return matches
        })
        
        console.log('🎯 [ContactSelector] Filtered:', filteredContacts.length, '/', teamContacts.length, 'contacts')
        setExistingContacts(filteredContacts)
      } catch (error) {
        console.error("❌ [ContactSelector] Error loading contacts:", error)
        setExistingContacts([])
      } finally {
        setIsLoadingContacts(false)
      }
    } else {
      console.log('⚠️ [ContactSelector] No teamId provided')
    }
  }

  // Exposer les méthodes publiques via ref
  useImperativeHandle(ref, () => ({
    openContactModal: (contactType: string, contextLotId?: string) => {
      console.log('🎯 [ContactSelector] External openContactModal called:', contactType, 'lotId:', contextLotId)
      setExternalLotId(contextLotId)
      handleOpenContactModal(contactType)
    }
  }), [teamId, handleOpenContactModal])

  // [SUPPRIMÉ] Ancienne fonction openContactModal remplacée par handleOpenContactModal

  // Ouvrir le modal de création de contact
  const openContactFormModal = (type: string) => {
    setPrefilledContactType(type)
    setIsContactFormModalOpen(true)
    setIsContactModalOpen(false)
  }

  // Ajouter un contact existant (callback centralisé)
  const handleAddExistingContact = (contact: any) => {
    const newContact: Contact = {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      type: selectedContactType,
      phone: contact.phone,
      speciality: contact.speciality,
    }
    
    // Déterminer le lotId à utiliser : externe (ouverture ref) ou prop directe
    const contextLotId = externalLotId || lotId
    
    console.log('✅ [ContactSelector] Contact selected:', newContact.name, 'type:', selectedContactType, 'lotId:', contextLotId)
    
    // Appeler le callback parent avec contexte
    if (onContactSelected) {
      onContactSelected(newContact, selectedContactType, { lotId: contextLotId })
    } else {
      console.error('❌ [ContactSelector] onContactSelected callback is missing!')
    }
    
    setIsContactModalOpen(false)
    setSearchTerm("")
    setExternalLotId(undefined)  // Nettoyer le contexte externe
  }

  // Créer un contact (logique centralisée)
  const handleContactCreated = async (contactData: any) => {
    try {
      if (!teamId) {
        console.error("❌ [ContactSelector] No teamId provided")
        return
      }

      console.log('🆕 [ContactSelector] Creating contact:', contactData.firstName, contactData.lastName, 'type:', selectedContactType)

      // Utiliser le service d'invitation pour créer le contact
      const result = await contactInvitationService.createContactWithOptionalInvite({
        type: contactData.type,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        address: contactData.address,
        speciality: contactData.speciality,
        notes: contactData.notes,
        inviteToApp: contactData.inviteToApp,
        teamId: teamId
      })

      // Créer le contact pour l'état local
      const newContact: Contact = {
        id: result.contact.id,
        name: result.contact.name,
        email: result.contact.email,
        type: selectedContactType,
        phone: result.contact.phone,
        speciality: result.contact.speciality,
      }
      
      console.log('✅ [ContactSelector] Contact created:', newContact.name)
      
      // Appeler les callbacks parent
      if (onContactSelected) {
        onContactSelected(newContact, selectedContactType)
      }
      
      if (onContactCreated) {
        onContactCreated(result.contact, selectedContactType)
      }
      
      setIsContactFormModalOpen(false)
      cleanContactContext()
      
    } catch (error) {
      console.error("❌ Erreur lors de la création du contact:", error)
    }
  }

  // Nettoyer le contexte de sélection
  const cleanContactContext = () => {
    setSelectedContactType("")
    setPrefilledContactType("")
  }

  // Filtrer les contacts selon le terme de recherche
  const getFilteredContacts = () => {
    return !searchTerm.trim() ? existingContacts : existingContacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchTerm))
    )
  }

  // Obtenir les informations du type de contact sélectionné
  const getSelectedContactTypeInfo = () => {
    return contactTypes.find(type => type.key === selectedContactType) || contactTypes[0]
  }

  // Obtenir les contacts sélectionnés pour un type donné (centralisé)
  const getSelectedContactsByType = (contactType: string): Contact[] => {
    return selectedContacts[contactType] || []
  }

  // Rendu en mode compact (pour création d'immeuble)
  const renderCompactMode = () => (
    <div className={`space-y-4 ${className}`}>
      {!hideTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-orange-900 text-sm">{title}</span>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
              {Object.values(selectedContacts).flat().length}
            </Badge>
          </div>
          {description && (
            <p className="text-xs text-gray-600">{description}</p>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {filteredContactTypes.map((type) => {
          const Icon = type.icon
          const contacts = getSelectedContactsByType(type.key)

          return (
            <div key={type.key} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${type.color}`} />
                <span className="font-medium text-xs">{type.label}</span>
              </div>

              <div className="space-y-1.5">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2 bg-white rounded border text-xs"
                  >
                    <span className="truncate flex-1 mr-2">{contact.name || contact.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onContactRemoved?.(contact.id, type.key)}
                      className="text-red-500 hover:text-red-700 h-5 w-5 p-0 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenContactModal(type.key)}
                  className="w-full text-xs py-1.5 h-7"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Ajouter
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // Rendu en mode étendu (pour création de lot)
  const renderFullMode = () => (
    <div className={`space-y-6 ${className}`}>
      {!hideTitle && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredContactTypes.map((type) => {
          const Icon = type.icon
          const contacts = getSelectedContactsByType(type.key)

          return (
            <Card key={type.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Icon className="h-4 w-4" />
                  <span>{type.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <span className="text-sm">{contact.name || contact.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onContactRemoved?.(contact.id, type.key)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOpenContactModal(type.key)} 
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter {type.label.toLowerCase()}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      {displayMode === "compact" ? renderCompactMode() : renderFullMode()}

      {/* Contact Selection Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedContactType === 'tenant' && <User className="w-5 h-5" />}
              {selectedContactType === 'provider' && <Briefcase className="w-5 h-5" />}
              {selectedContactType === 'syndic' && <Shield className="w-5 h-5" />}
              {selectedContactType === 'notary' && <FileCheck className="w-5 h-5" />}
              {selectedContactType === 'insurance' && <Car className="w-5 h-5" />}
              {selectedContactType === 'other' && <MoreHorizontal className="w-5 h-5" />}
              Sélectionner un {getSelectedContactTypeInfo().label.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {selectedContactType === 'tenant' && 'Personne qui occupe le logement'}
              {selectedContactType === 'provider' && 'Prestataire pour les interventions'}
              {selectedContactType === 'syndic' && 'Syndic de copropriété'}
              {selectedContactType === 'notary' && 'Notaire pour les actes'}
              {selectedContactType === 'insurance' && 'Compagnie d\'assurance'}
              {selectedContactType === 'other' && 'Autre type de contact'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder={`Rechercher un ${getSelectedContactTypeInfo().label.toLowerCase()} par nom, email, téléphone...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Loading state */}
            {isLoadingContacts && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Chargement des contacts...</span>
              </div>
            )}

            {/* Contacts list */}
            {!isLoadingContacts && (
              <div className="max-h-64 overflow-y-auto">
                {getFilteredContacts().length > 0 ? (
                  <div className="space-y-2">
                    {getFilteredContacts().map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-gray-500">{contact.email}</div>
                          {contact.phone && (
                            <div className="text-xs text-gray-400">{contact.phone}</div>
                          )}
                          {contact.speciality && (
                            <div className="text-xs text-green-600 capitalize mt-1">
                              {contact.speciality}
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={() => handleAddExistingContact(contact)} 
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          size="sm"
                        >
                          Sélectionner
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {selectedContactType === 'tenant' && <User className="w-8 h-8 text-blue-600" />}
                      {selectedContactType === 'provider' && <Briefcase className="w-8 h-8 text-green-600" />}
                      {selectedContactType === 'syndic' && <Shield className="w-8 h-8 text-purple-600" />}
                      {selectedContactType === 'notary' && <FileCheck className="w-8 h-8 text-orange-600" />}
                      {selectedContactType === 'insurance' && <Car className="w-8 h-8 text-red-600" />}
                      {selectedContactType === 'other' && <MoreHorizontal className="w-8 h-8 text-gray-600" />}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {searchTerm ? 'Aucun contact trouvé' : `Aucun ${getSelectedContactTypeInfo().label.toLowerCase()} enregistré`}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {searchTerm 
                        ? `Aucun contact ne correspond à "${searchTerm}"`
                        : `Vous n'avez pas encore de ${getSelectedContactTypeInfo().label.toLowerCase()} dans votre équipe`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between pt-4 border-t gap-3">
              <Button
                variant="ghost"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
                onClick={() => openContactFormModal(selectedContactType)}
              >
                <Plus className="w-4 h-4" />
                Ajouter un {getSelectedContactTypeInfo().label.toLowerCase()}
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => {
                setIsContactModalOpen(false)
                cleanContactContext()
              }}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactFormModalOpen}
        onClose={() => {
          setIsContactFormModalOpen(false)
          cleanContactContext()
        }}
        onSubmit={handleContactCreated}
        defaultType={prefilledContactType}
      />
    </>
  )
})

// Définir le displayName pour le debug (bonne pratique avec forwardRef)
ContactSelector.displayName = 'ContactSelector'

export default ContactSelector
