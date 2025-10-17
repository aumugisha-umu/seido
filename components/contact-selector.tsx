"use client"

import { useState, useCallback, forwardRef, useImperativeHandle } from "react"
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
  Users,
  Home
} from "lucide-react"
import ContactFormModal from "@/components/contact-form-modal"


import { determineAssignmentType, createContactInvitationService } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
import { useTeamContacts } from '@/hooks/use-team-contacts'

const contactInvitationService = createContactInvitationService()

// Types de contacts avec leurs configurations visuelles
const contactTypes = [
  { key: "tenant", label: "Locataire", icon: User, color: "text-blue-600" },
  { key: "provider", label: "Prestataire", icon: Briefcase, color: "text-green-600" },
  { key: "owner", label: "Propriétaire", icon: Home, color: "text-amber-600" },
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
  // Callback pour suppression directe (depuis l'interface des lots)
  onDirectContactRemove?: (contactId: string, contactType: string, lotId?: string) => void
  // Callback quand un nouveau contact est créé - AVEC CONTEXTE
  onContactCreated?: (contact: Contact, contactType: string, context?: { lotId?: string }) => void
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
  onDirectContactRemove,
  onContactCreated,
  className = "",
  hideTitle = false,
  lotId  // NOUVEAU : contexte pour identifier le lot
}, ref) => {
  // États pour le modal de sélection
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedContactType, setSelectedContactType] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  // NOUVEAU : État pour stocker le lotId temporaire lors de l'ouverture externe
  const [externalLotId, setExternalLotId] = useState<string | undefined>(undefined)

  // États pour le modal de création
  const [isContactFormModalOpen, setIsContactFormModalOpen] = useState(false)
  const [prefilledContactType, setPrefilledContactType] = useState<string>("")

  // ✅ Hook SWR pour fetcher les contacts avec cache intelligent
  const { data: teamContacts, isLoading: isLoadingContacts, error: loadingError } = useTeamContacts(teamId)

  // ✅ Plus besoin de refs pour le chargement - SWR gère tout

  // Filtrer les types de contacts autorisés
  const filteredContactTypes = contactTypes.filter(type =>
    allowedContactTypes.includes(type.key)
  )

  // ✅ Fonction simplifiée pour ouvrir le modal - Les données sont déjà en cache via SWR!
  const handleOpenContactModal = useCallback((_contactType: string) => {
    logger.info('🚀 [ContactSelector] Opening modal for:', _contactType)

    // Initialiser l'état du modal
    setSelectedContactType(_contactType)
    setSearchTerm("")
    setIsContactModalOpen(true)

    // ✅ Pas d'appel API - SWR a déjà chargé les données!
    // ✅ Pas de timeout - les données sont instantanées depuis le cache
    // ✅ Pas de loading state manuel - SWR gère isLoading automatiquement
  }, [])

  // Exposer les méthodes publiques via ref
  useImperativeHandle(ref, () => ({
    openContactModal: (contactType: string, contextLotId?: string) => {
      logger.info('🎯 [ContactSelector] External openContactModal called:', contactType, 'lotId:', contextLotId)
      setExternalLotId(contextLotId)
      handleOpenContactModal(contactType)
    }
  }), [handleOpenContactModal])

  // [SUPPRIMÉ] Ancienne fonction openContactModal remplacée par handleOpenContactModal

  // Ouvrir le modal de création de contact
  const openContactFormModal = (_type: string) => {
    setPrefilledContactType(_type)
    setIsContactFormModalOpen(true)
    setIsContactModalOpen(false)
  }

  // Ajouter un contact existant (callback centralisé)
  const handleAddExistingContact = (contact: Contact) => {
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
    
    logger.info('✅ [ContactSelector] Contact selected:', newContact.name, 'type:', selectedContactType, 'lotId:', contextLotId)
    
    // Appeler le callback parent avec contexte
    if (onContactSelected) {
      onContactSelected(newContact, selectedContactType, { lotId: contextLotId })
    } else {
      logger.error('❌ [ContactSelector] onContactSelected callback is missing!')
    }
    
    // Ne pas fermer la modale pour permettre la sélection multiple
    // setIsContactModalOpen(false)
    // setSearchTerm("")
    // setExternalLotId(undefined)  // Nettoyer le contexte externe
  }

  // Retirer un contact sélectionné
  const handleRemoveSelectedContact = (contactId: string) => {
    const contextLotId = externalLotId || lotId
    
    logger.info('🗑️ [ContactSelector] Contact removed:', contactId, 'type:', selectedContactType, 'lotId:', contextLotId)
    
    // Appeler le callback parent avec contexte
    if (onContactRemoved) {
      onContactRemoved(contactId, selectedContactType, { lotId: contextLotId })
    } else {
      logger.error('❌ [ContactSelector] onContactRemoved callback is missing!')
    }
  }

  // Créer un contact (logique centralisée)
  const handleContactCreated = async (contactData: { type: string; firstName: string; lastName: string; email: string; phone: string; speciality?: string; notes: string; inviteToApp: boolean }) => {
    try {
      if (!teamId) {
        logger.error("❌ [ContactSelector] No teamId provided")
        return
      }

      logger.info('🆕 [ContactSelector] Creating contact:', contactData.firstName, contactData.lastName, 'type:', selectedContactType)

      // Utiliser le service d'invitation pour créer le contact
      const result = await contactInvitationService.createContactWithOptionalInvite({
        type: contactData.type,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        speciality: contactData.speciality,
        notes: contactData.notes,
        inviteToApp: contactData.inviteToApp,
        teamId: teamId
      })

      // Vérifier la réussite et sécuriser l'accès aux propriétés
      const responseData: any = (result as any) || {}
      const responseContact: any = responseData.contact || responseData.data?.contact || null

      if (!responseContact) {
        logger.warn('⚠️ [ContactSelector] Contact created but no contact payload returned. Proceeding with form data fallback')
      }

      // Créer le contact pour l'état local (fallbacks si certaines infos manquent)
      const newContact: Contact = {
        id: responseContact?.id || '',
        name: responseContact?.name || `${contactData.firstName} ${contactData.lastName}`.trim(),
        email: responseContact?.email || contactData.email,
        type: selectedContactType,
        phone: responseContact?.phone || contactData.phone,
        speciality: responseContact?.speciality || contactData.speciality,
      }
      
      logger.info('✅ [ContactSelector] Contact created:', newContact.name)
      
      // Déterminer le lotId à utiliser : externe (ouverture ref) ou prop directe
      const contextLotId = externalLotId || lotId
      
      // Appeler les callbacks parent
      if (onContactSelected) {
        onContactSelected(newContact, selectedContactType, { lotId: contextLotId })
      }
      
      if (onContactCreated) {
        onContactCreated(newContact, selectedContactType, { lotId: contextLotId })
      }
      
      // Fermer seulement le modal de création, pas le modal de sélection
      setIsContactFormModalOpen(false)
      // Ne pas appeler cleanContactContext() pour garder la modale de sélection ouverte
      
    } catch (error) {
      logger.error("❌ Erreur lors de la création du contact:", error)
    }
  }

  // Nettoyer le contexte de sélection
  const cleanContactContext = () => {
    setSelectedContactType("")
    setPrefilledContactType("")
  }

  // ✅ Filtrer les contacts depuis le cache SWR selon le type et le terme de recherche
  const getFilteredContacts = () => {
    if (!teamContacts) return []

    // Étape 1: Filtrer par type de contact (tenant, provider, etc.)
    const contactsByType = teamContacts.filter(contact => {
      // Convertir les rôles français (BDD) vers anglais (interface TypeScript)
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
          case 'syndic': return 'syndic'
          default: return contact.provider_category
        }
      })()

      const assignmentUser = {
        id: contact.id,
        role: mappedRole,
        provider_category: mappedProviderCategory,
        speciality: (contact.speciality || undefined) as string | undefined
      }

      const assignmentType = determineAssignmentType(assignmentUser)
      return assignmentType === selectedContactType
    })

    // Étape 2: Filtrer par terme de recherche
    if (!searchTerm.trim()) return contactsByType

    return contactsByType.filter(contact =>
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
  const getSelectedContactsByType = (_contactType: string): Contact[] => {
    return selectedContacts[_contactType] || []
  }

  // Vérifier si un contact est déjà sélectionné pour le type actuel
  const isContactSelected = (contactId: string, contactType: string): boolean => {
    const selectedContactsOfType = getSelectedContactsByType(contactType)
    return selectedContactsOfType.some(contact => contact.id === contactId)
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
      
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
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
                      onClick={() => {
                        if (onDirectContactRemove) {
                          onDirectContactRemove(contact.id, type.key, lotId)
                        } else {
                          onContactRemoved?.(contact.id, type.key)
                        }
                      }}
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
                      onClick={() => {
                        if (onDirectContactRemove) {
                          onDirectContactRemove(contact.id, type.key, lotId)
                        } else {
                          onContactRemoved?.(contact.id, type.key)
                        }
                      }}
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
              {selectedContactType === 'owner' && <Home className="w-5 h-5" />}
              {selectedContactType === 'syndic' && <Shield className="w-5 h-5" />}
              {selectedContactType === 'notary' && <FileCheck className="w-5 h-5" />}
              {selectedContactType === 'insurance' && <Car className="w-5 h-5" />}
              {selectedContactType === 'other' && <MoreHorizontal className="w-5 h-5" />}
              Sélectionner un {getSelectedContactTypeInfo().label.toLowerCase()}
              {getSelectedContactsByType(selectedContactType).length > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {getSelectedContactsByType(selectedContactType).length} sélectionné(s)
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedContactType === 'tenant' && 'Personne qui occupe le logement'}
              {selectedContactType === 'provider' && 'Prestataire pour les interventions'}
              {selectedContactType === 'owner' && 'Propriétaire du bien immobilier'}
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

            {/* Error state */}
            {!isLoadingContacts && loadingError && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">
                      Erreur de chargement
                    </h3>
                    <p className="text-sm text-red-700">
                      {loadingError instanceof Error ? loadingError.message : 'Erreur inconnue'}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleOpenContactModal(selectedContactType)}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Réessayer
                  </Button>
                </div>
              </div>
            )}

            {/* Contacts list */}
            {!isLoadingContacts && !loadingError && (
              <div className="max-h-64 overflow-y-auto">
                {getFilteredContacts().length > 0 ? (
                  <div className="space-y-2">
                    {getFilteredContacts().map((contact) => {
                      const isSelected = isContactSelected(contact.id, selectedContactType)
                      return (
                        <div
                          key={contact.id}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                            isSelected 
                              ? 'bg-green-50 border-green-200' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {contact.name}
                              {isSelected && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                  Sélectionné
                                </Badge>
                              )}
                            </div>
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
                            onClick={() => isSelected 
                              ? handleRemoveSelectedContact(contact.id)
                              : handleAddExistingContact(contact)
                            } 
                            className={isSelected 
                              ? "bg-red-600 text-white hover:bg-red-700" 
                              : "bg-blue-600 text-white hover:bg-blue-700"
                            }
                            size="sm"
                          >
                            {isSelected ? "Retirer" : "Sélectionner"}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {selectedContactType === 'tenant' && <User className="w-8 h-8 text-blue-600" />}
                      {selectedContactType === 'provider' && <Briefcase className="w-8 h-8 text-green-600" />}
                      {selectedContactType === 'owner' && <Home className="w-8 h-8 text-amber-600" />}
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
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  className="w-full sm:w-auto" 
                  onClick={() => {
                    setIsContactModalOpen(false)
                    cleanContactContext()
                  }}
                >
                  Terminé
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full sm:w-auto" 
                  onClick={() => {
                    setIsContactModalOpen(false)
                    cleanContactContext()
                  }}
                >
                  Annuler
                </Button>
              </div>
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
