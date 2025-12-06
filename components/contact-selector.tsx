"use client"

import { useState, useCallback, forwardRef, useImperativeHandle } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  Home,
  Building,
  Building2
} from "lucide-react"

import { determineAssignmentType } from '@/lib/services'
import { logger } from '@/lib/logger'
import { useTeamContacts } from '@/hooks/use-team-contacts'

// Types de contacts avec leurs configurations visuelles
const contactTypes = [
  { key: "manager", label: "Gestionnaire", icon: Users, color: "text-purple-600" },
  { key: "tenant", label: "Locataire", icon: User, color: "text-blue-600" },
  { key: "provider", label: "Prestataire", icon: Briefcase, color: "text-green-600" },
  { key: "owner", label: "Propriétaire", icon: Home, color: "text-amber-600" },
  { key: "guarantor", label: "Garant", icon: Shield, color: "text-amber-600" },
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
  // Champs société
  is_company?: boolean
  company_id?: string | null
  company?: {
    id: string
    name: string
    vat_number?: string | null
  } | null
}

// Props du composant principal (interface simplifiée et centralisée)
interface ContactSelectorProps {
  // ID de l'équipe pour charger les contacts
  teamId?: string
  // Mode d'affichage : compact pour immeuble, full pour lot
  displayMode?: "compact" | "full"
  // Mode de sélection : single (radio) ou multi (checkbox)
  selectionMode?: "single" | "multi"
  // Titre principal
  title?: string
  // Description
  description?: string
  // Types de contacts autorisés (tous par défaut)
  allowedContactTypes?: string[]
  // Contacts déjà sélectionnés/assignés (pour affichage)
  selectedContacts?: {[contactType: string]: Contact[]}
  // NOUVEAU: Contacts assignés aux lots (par lotId puis par contactType)
  lotContactAssignments?: { [lotId: string]: { [contactType: string]: Contact[] } }
  // Callback quand un contact est sélectionné - AVEC CONTEXTE
  onContactSelected?: (contact: Contact, contactType: string, context?: { lotId?: string }) => void
  // Callback quand un contact est retiré - AVEC CONTEXTE
  onContactRemoved?: (contactId: string, contactType: string, context?: { lotId?: string }) => void
  // Callback pour suppression directe (depuis l'interface des lots)
  onDirectContactRemove?: (contactId: string, contactType: string, lotId?: string) => void
  // Callback quand un nouveau contact est créé - AVEC CONTEXTE
  onContactCreated?: (contact: Contact, contactType: string, context?: { lotId?: string }) => void
  // NOUVEAU: Callback pour demander la création d'un contact (avec redirect vers le flow multi-étapes)
  onRequestContactCreation?: (contactType: string, lotId?: string) => void
  // Classe CSS personnalisée
  className?: string
  // Si true, ne pas afficher le titre
  hideTitle?: boolean
  // Si true, masquer complètement l'UI et ne garder que le modal
  hideUI?: boolean
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
  selectionMode,  // Undefined par défaut → détection automatique
  title = "Assignation des contacts",
  description = "Assignez des contacts à vos lots (optionnel)",
  allowedContactTypes = contactTypes.map(type => type.key),
  selectedContacts = {},
  lotContactAssignments = {},
  onContactSelected,
  onContactRemoved,
  onDirectContactRemove,
  onContactCreated,
  onRequestContactCreation,  // NOUVEAU: Callback pour redirect vers le flow multi-étapes
  className = "",
  hideTitle = false,
  hideUI = false,
  lotId  // NOUVEAU : contexte pour identifier le lot
}, ref) => {
  // États pour le modal de sélection
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedContactType, setSelectedContactType] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  // NOUVEAU : État pour stocker le lotId temporaire lors de l'ouverture externe
  const [externalLotId, setExternalLotId] = useState<string | undefined>(undefined)

  // NOUVEAU : États pour la sélection temporaire (confirmation différée)
  const [pendingSelections, setPendingSelections] = useState<string[]>([])
  const [initialSelections, setInitialSelections] = useState<string[]>([])

  // État pour le chargement lors de la confirmation
  const [isConfirming, setIsConfirming] = useState(false)

  // Router pour navigation vers wizard
  const router = useRouter()

  // ✅ Hook SWR pour fetcher les contacts avec cache intelligent
  const { data: teamContacts, isLoading: isLoadingContacts, error: loadingError} = useTeamContacts(teamId!)

  // ✅ Plus besoin de refs pour le chargement - SWR gère tout

  // Filtrer les types de contacts autorisés
  const filteredContactTypes = contactTypes.filter(type =>
    allowedContactTypes.includes(type.key)
  )

  // NOUVEAU : Déterminer le mode de sélection effectif (peut être overridé ou automatique)
  const getEffectiveSelectionMode = (contactType: string): "single" | "multi" => {
    // Si une prop selectionMode est fournie, l'utiliser
    if (selectionMode) {
      return selectionMode
    }
    // Sinon, déterminer automatiquement : 'provider' = single, autres = multi
    return contactType === 'provider' ? 'single' : 'multi'
  }

  // ✅ Fonction simplifiée pour ouvrir le modal - Les données sont déjà en cache via SWR!
  const handleOpenContactModal = useCallback((_contactType: string, contextLotId?: string) => {
    logger.info('🚀 [ContactSelector] Opening modal for:', _contactType, 'lotId:', contextLotId)

    // Initialiser l'état du modal
    setSelectedContactType(_contactType)
    setSearchTerm("")

    // NOUVEAU : Initialiser les sélections avec TOUS les contacts (immeuble + lot si applicable)
    const buildingContactsOfType = selectedContacts[_contactType] || []
    let allContactsOfType = [...buildingContactsOfType]

    // Si on est dans le contexte d'un lot, inclure aussi ses contacts
    if (contextLotId && lotContactAssignments[contextLotId]) {
      const lotContactsOfType = lotContactAssignments[contextLotId][_contactType] || []
      lotContactsOfType.forEach(lotContact => {
        if (!allContactsOfType.some(c => c.id === lotContact.id)) {
          allContactsOfType.push(lotContact)
        }
      })
    }

    const currentIds = allContactsOfType.map(c => c.id)
    setPendingSelections(currentIds)
    setInitialSelections(currentIds)

    setIsContactModalOpen(true)

    // ✅ Pas d'appel API - SWR a déjà chargé les données!
    // ✅ Pas de timeout - les données sont instantanées depuis le cache
    // ✅ Pas de loading state manuel - SWR gère isLoading automatiquement
  }, [selectedContacts, lotContactAssignments])

  // Exposer les méthodes publiques via ref
  useImperativeHandle(ref, () => ({
    openContactModal: (contactType: string, contextLotId?: string) => {
      logger.info('🎯 [ContactSelector] External openContactModal called:', contactType, 'lotId:', contextLotId)
      setExternalLotId(contextLotId)
      handleOpenContactModal(contactType, contextLotId)
    }
  }), [handleOpenContactModal])

  // [SUPPRIMÉ] Ancienne fonction openContactModal remplacée par handleOpenContactModal

  // Rediriger vers le wizard de création de contact
  const openContactFormModal = (_type: string) => {
    // Si un callback de redirection est fourni, l'utiliser (nouveau flow multi-étapes)
    if (onRequestContactCreation) {
      logger.info(`🔗 [CONTACT-SELECTOR] Triggering redirect to multi-step flow for type: ${_type}`)
      onRequestContactCreation(_type, externalLotId || lotId)
      setIsContactModalOpen(false)
      return
    }

    // Sinon, redirection vers le wizard
    logger.info(`🔗 [CONTACT-SELECTOR] Redirecting to contact creation wizard`)
    router.push('/gestionnaire/contacts/nouveau')
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

    // Protection: Ne pas permettre de retirer un contact hérité de l'immeuble
    if (isContactInheritedFromBuilding(contactId, selectedContactType)) {
      logger.warn('⚠️ [ContactSelector] Cannot remove inherited contact:', contactId)
      return
    }

    logger.info('🗑️ [ContactSelector] Contact removed:', contactId, 'type:', selectedContactType, 'lotId:', contextLotId)

    // Appeler le callback parent avec contexte
    if (onContactRemoved) {
      onContactRemoved(contactId, selectedContactType, { lotId: contextLotId })
    } else {
      logger.error('❌ [ContactSelector] onContactRemoved callback is missing!')
    }
  }

  // NOUVEAU : Gestion de la sélection temporaire pour mode multi-select (checkbox)
  const handlePendingToggle = (contactId: string) => {
    setPendingSelections(prev => {
      if (prev.includes(contactId)) {
        // Protection : Ne pas permettre de désélectionner le dernier gestionnaire
        if (selectedContactType === 'manager' && prev.length === 1) {
          logger.warn('⚠️ [ContactSelector] Cannot deselect last manager - minimum 1 required')
          return prev // Garder la sélection actuelle
        }
        // Retirer de la sélection
        return prev.filter(id => id !== contactId)
      } else {
        // Ajouter à la sélection
        return [...prev, contactId]
      }
    })
  }

  // NOUVEAU : Gestion de la sélection temporaire pour mode single-select (radio)
  const handlePendingSelect = (contactId: string) => {
    // En mode single-select, remplacer toute la sélection
    setPendingSelections([contactId])
  }

  // NOUVEAU : Confirmer les changements (calculer diff et appliquer)
  const handleConfirm = async () => {
    const contextLotId = externalLotId || lotId

    // Calculer les contacts à ajouter et à retirer
    const toAdd = pendingSelections.filter(id => !initialSelections.includes(id))
    const toRemove = initialSelections.filter(id => !pendingSelections.includes(id))

    logger.info('✅ [ContactSelector] Confirming changes:', {
      toAdd: toAdd.length,
      toRemove: toRemove.length,
      contactType: selectedContactType
    })

    // Activer l'état de chargement
    setIsConfirming(true)

    try {
      // Retirer les contacts désélectionnés (await chaque opération)
      for (const contactId of toRemove) {
        if (onContactRemoved) {
          await onContactRemoved(contactId, selectedContactType, { lotId: contextLotId })
        }
      }

      // Ajouter les nouveaux contacts sélectionnés (await chaque opération)
      for (const contactId of toAdd) {
        const contact = teamContacts?.find(c => c.id === contactId)
        if (contact && onContactSelected) {
          const newContact: Contact = {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            type: selectedContactType,
            phone: contact.phone || undefined,
            speciality: contact.provider_category || undefined,
            is_company: contact.is_company,
            company_id: contact.company_id,
            company: contact.company
          }
          await onContactSelected(newContact, selectedContactType, { lotId: contextLotId })
        }
      }
    } finally {
      // Désactiver l'état de chargement
      setIsConfirming(false)

      // Fermer le modal et nettoyer SEULEMENT après toutes les opérations
      setIsContactModalOpen(false)
      cleanContactContext()
    }
  }

  // NOUVEAU : Annuler les changements (revenir à l'état initial)
  const handleCancel = () => {
    logger.info('❌ [ContactSelector] Canceling changes, reverting to initial selections')
    setPendingSelections(initialSelections)
    setIsContactModalOpen(false)
    cleanContactContext()
  }


  // Nettoyer le contexte de sélection
  const cleanContactContext = () => {
    setSelectedContactType("")
    setExternalLotId(undefined) // Nettoyer le contexte lot pour éviter les assignations incorrectes
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
          case 'proprietaire': return 'owner'
          case 'autre': return 'other'
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
      (contact.phone && contact.phone.includes(searchTerm)) ||
      // Recherche dans le nom de la société
      (contact.is_company && contact.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      // Recherche dans le numéro de TVA
      (contact.is_company && contact.company?.vat_number?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }

  // Obtenir les informations du type de contact sélectionné
  const getSelectedContactTypeInfo = () => {
    return contactTypes.find(type => type.key === selectedContactType) || contactTypes[0]
  }

  // Obtenir les contacts sélectionnés pour un type donné (centralisé)
  const getSelectedContactsByType = (_contactType: string): Contact[] => {
    const contextLotId = externalLotId || lotId

    // Contacts de l'immeuble (toujours inclus)
    const buildingContactsOfType = selectedContacts[_contactType] || []

    // Si on est dans le contexte d'un lot, ajouter aussi les contacts du lot
    if (contextLotId && lotContactAssignments[contextLotId]) {
      const lotContactsOfType = lotContactAssignments[contextLotId][_contactType] || []

      // Merger les deux listes en évitant les doublons (par id)
      const allContacts = [...buildingContactsOfType]
      lotContactsOfType.forEach(lotContact => {
        if (!allContacts.some(c => c.id === lotContact.id)) {
          allContacts.push(lotContact)
        }
      })

      return allContacts
    }

    return buildingContactsOfType
  }

  // Vérifier si un contact est déjà sélectionné pour le type actuel
  const isContactSelected = (contactId: string, contactType: string): boolean => {
    const selectedContactsOfType = getSelectedContactsByType(contactType)
    return selectedContactsOfType.some(contact => contact.id === contactId)
  }

  // Vérifier si un contact est hérité de l'immeuble (et non spécifique au lot)
  const isContactInheritedFromBuilding = (contactId: string, contactType: string): boolean => {
    const contextLotId = externalLotId || lotId

    // Si on n'est pas dans un contexte de lot, il n'y a pas d'héritage
    if (!contextLotId) {
      return false
    }

    // Le contact est hérité s'il est dans selectedContacts (building-level)
    // mais PAS ajouté spécifiquement au lot
    const buildingContactsOfType = selectedContacts[contactType] || []
    const isInBuildingContacts = buildingContactsOfType.some(c => c.id === contactId)

    // Vérifier s'il est aussi dans les contacts du lot (ce qui signifierait qu'il a été ajouté explicitement)
    const lotContactsOfType = lotContactAssignments[contextLotId]?.[contactType] || []
    const isInLotContacts = lotContactsOfType.some(c => c.id === contactId)

    // Hérité = dans building MAIS PAS dans lot-specific
    return isInBuildingContacts && !isInLotContacts
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
      {!hideUI && (displayMode === "compact" ? renderCompactMode() : renderFullMode())}

      {/* Contact Selection Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={(open) => {
        setIsContactModalOpen(open)
        if (!open) {
          cleanContactContext() // Nettoyer le contexte quand le modal se ferme
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selectedContactType === 'manager' && <Users className="w-5 h-5" />}
              {selectedContactType === 'tenant' && <User className="w-5 h-5" />}
              {selectedContactType === 'provider' && <Briefcase className="w-5 h-5" />}
              {selectedContactType === 'owner' && <Home className="w-5 h-5" />}
              {selectedContactType === 'other' && <MoreHorizontal className="w-5 h-5" />}
              Sélectionner {getEffectiveSelectionMode(selectedContactType) === 'single' ? 'un' : 'des'} {getSelectedContactTypeInfo().label.toLowerCase()}{getEffectiveSelectionMode(selectedContactType) === 'multi' ? 's' : ''}
              {getEffectiveSelectionMode(selectedContactType) === 'single' && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                  1 maximum
                </Badge>
              )}
              {selectedContactType === 'manager' && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                  1 minimum
                </Badge>
              )}
              {pendingSelections.length > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {pendingSelections.length} sélectionné(s)
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedContactType === 'manager' && 'Gestionnaire de l\'immeuble ou du lot'}
              {selectedContactType === 'tenant' && 'Personne qui occupe le logement'}
              {selectedContactType === 'provider' && 'Prestataire pour les interventions'}
              {selectedContactType === 'owner' && 'Propriétaire du bien immobilier'}
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
                      const isPendingSelected = pendingSelections.includes(contact.id)
                      const isInherited = isContactInheritedFromBuilding(contact.id, selectedContactType)
                      const effectiveMode = getEffectiveSelectionMode(selectedContactType)
                      // Protection : Désactiver la désélection si c'est le dernier gestionnaire
                      const isLastManager = selectedContactType === 'manager' && isPendingSelected && pendingSelections.length === 1
                      return (
                        <div
                          key={contact.id}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                            isInherited
                              ? 'bg-blue-50/30 border-blue-200/50'
                              : isPendingSelected
                                ? 'bg-green-50 border-green-200'
                                : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2 flex-wrap">
                              {contact.name}
                              {/* Badge Entreprise */}
                              {contact.is_company && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  Entreprise
                                </Badge>
                              )}
                              {isInherited ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border border-blue-300 text-xs flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  Hérité de l&apos;immeuble
                                </Badge>
                              ) : isPendingSelected && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                  Sélectionné
                                </Badge>
                              )}
                            </div>
                            {/* Nom de la société */}
                            {contact.is_company && contact.company && (
                              <div className="text-sm text-purple-700 font-medium mt-1">
                                {contact.company.name}
                                {contact.company.vat_number && (
                                  <span className="text-xs text-purple-600 ml-2">TVA: {contact.company.vat_number}</span>
                                )}
                              </div>
                            )}
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
                          {/* NOUVEAU : Checkbox pour multi-select, Radio pour single-select */}
                          {isInherited ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs whitespace-nowrap">
                              Sur l&apos;immeuble
                            </Badge>
                          ) : effectiveMode === 'single' ? (
                            <input
                              type="radio"
                              name={`contact-selection-${selectedContactType}`}
                              checked={isPendingSelected}
                              onChange={() => handlePendingSelect(contact.id)}
                              aria-label={`Sélectionner ${contact.name}`}
                            />
                          ) : (
                            <Checkbox
                              checked={isPendingSelected}
                              onCheckedChange={() => handlePendingToggle(contact.id)}
                              disabled={isLastManager}
                              aria-label={`Sélectionner ${contact.name}`}
                              className="h-5 w-5"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {selectedContactType === 'manager' && <Users className="w-8 h-8 text-purple-600" />}
                      {selectedContactType === 'tenant' && <User className="w-8 h-8 text-blue-600" />}
                      {selectedContactType === 'provider' && <Briefcase className="w-8 h-8 text-green-600" />}
                      {selectedContactType === 'owner' && <Home className="w-8 h-8 text-amber-600" />}
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
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleCancel}
                >
                  Annuler
                </Button>
                <Button
                  variant="default"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  onClick={handleConfirm}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      Confirmer
                      {pendingSelections.length > 0 && ` (${pendingSelections.length})`}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

// Définir le displayName pour le debug (bonne pratique avec forwardRef)
ContactSelector.displayName = 'ContactSelector'

export default ContactSelector
