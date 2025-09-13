"use client"

import { useState, useEffect } from "react"
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
import { contactService, contactInvitationService } from "@/lib/database-service"

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

// Props du composant principal
interface ContactSelectorProps {
  // Mode d'affichage : compact pour immeuble, full pour lot
  displayMode?: "compact" | "full"
  // Titre principal
  title?: string
  // Description
  description?: string
  // Équipe de l'utilisateur
  userTeam: any | null
  // Contacts assignés par type
  assignedContacts: {[contactType: string]: Contact[]}
  // Callback pour ajouter un contact
  onContactAdd: (contactType: string, contact: Contact) => void
  // Callback pour retirer un contact
  onContactRemove: (contactType: string, contactId: string) => void
  // Callback pour la création d'un contact
  onContactCreate?: (contactData: any) => void
  // Types de contacts à afficher (tous par défaut)
  allowedContactTypes?: string[]
  // Classe CSS personnalisée
  className?: string
  // Si true, ne pas afficher le titre
  hideTitle?: boolean
}

export const ContactSelector = ({
  displayMode = "full",
  title = "Assignation des contacts",
  description = "Assignez des contacts à vos lots (optionnel)",
  userTeam,
  assignedContacts,
  onContactAdd,
  onContactRemove,
  onContactCreate,
  allowedContactTypes = contactTypes.map(type => type.key),
  className = "",
  hideTitle = false
}: ContactSelectorProps) => {
  // États pour le modal de sélection
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedContactType, setSelectedContactType] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [existingContacts, setExistingContacts] = useState<any[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  
  // États pour le modal de création
  const [isContactFormModalOpen, setIsContactFormModalOpen] = useState(false)
  const [prefilledContactType, setPrefilledContactType] = useState<string>("")

  // Filtrer les types de contacts autorisés
  const filteredContactTypes = contactTypes.filter(type => 
    allowedContactTypes.includes(type.key)
  )

  // Ouvrir le modal de sélection de contact
  const openContactModal = async (contactType: string) => {
    setSelectedContactType(contactType)
    setSearchTerm("")
    setIsContactModalOpen(true)
    
    // Charger les contacts existants du type correspondant
    if (userTeam?.id) {
      setIsLoadingContacts(true)
      try {
        const teamContacts = await contactService.getTeamContacts(userTeam.id)
        
        // Filtrer selon le type de contact demandé
        let filteredContacts = teamContacts
        if (contactType === 'provider') {
          filteredContacts = teamContacts.filter(contact => contact.speciality)
        } else if (contactType === 'tenant') {
          filteredContacts = teamContacts.filter(contact => 
            contact.contact_type === 'locataire' || (!contact.speciality || contact.speciality === 'autre')
          )
        } else if (contactType === 'syndic') {
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'syndic')
        } else if (contactType === 'notary') {
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'notaire')
        } else if (contactType === 'insurance') {
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'assurance')
        } else if (contactType === 'other') {
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'autre')
        }
        
        setExistingContacts(filteredContacts)
      } catch (error) {
        console.error("❌ Error loading team contacts:", error)
        setExistingContacts([])
      } finally {
        setIsLoadingContacts(false)
      }
    }
  }

  // Ouvrir le modal de création de contact
  const openContactFormModal = (type: string) => {
    setPrefilledContactType(type)
    setIsContactFormModalOpen(true)
    setIsContactModalOpen(false)
  }

  // Ajouter un contact existant
  const handleAddExistingContact = (contact: any) => {
    const newContact: Contact = {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      type: selectedContactType,
      phone: contact.phone,
      speciality: contact.speciality,
    }
    
    onContactAdd(selectedContactType, newContact)
    setIsContactModalOpen(false)
    setSearchTerm("")
  }

  // Créer un contact
  const handleContactCreated = async (contactData: any) => {
    try {
      if (!userTeam?.id) {
        console.error("❌ No team found for user")
        return
      }

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
        teamId: userTeam.id
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
      
      // Ajouter le contact créé
      onContactAdd(selectedContactType, newContact)
      
      // Callback optionnel pour informer le parent
      if (onContactCreate) {
        onContactCreate(result.contact)
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
    if (!searchTerm.trim()) return existingContacts
    
    return existingContacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchTerm))
    )
  }

  // Obtenir les informations du type de contact sélectionné
  const getSelectedContactTypeInfo = () => {
    return contactTypes.find(type => type.key === selectedContactType) || contactTypes[0]
  }

  // Obtenir les contacts assignés pour un type donné
  const getAssignedContactsByType = (contactType: string): Contact[] => {
    return assignedContacts[contactType] || []
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
              {Object.values(assignedContacts).flat().length}
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
          const contacts = getAssignedContactsByType(type.key)

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
                      onClick={() => onContactRemove(type.key, contact.id)}
                      className="text-red-500 hover:text-red-700 h-5 w-5 p-0 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openContactModal(type.key)}
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
          const contacts = getAssignedContactsByType(type.key)

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
                      onClick={() => onContactRemove(type.key, contact.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openContactModal(type.key)} 
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
}

export default ContactSelector
