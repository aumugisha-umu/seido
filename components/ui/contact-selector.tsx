"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Users, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import ContactFormModal from "@/components/contact-form-modal"
import { createContactInvitationService } from "@/lib/services"
import { logger, logError } from '@/lib/logger'
// Composant SelectItem personnalisé avec bouton au lieu du checkmark
const CustomSelectItem = ({
  className,
  children,
  value,
  onSelect,
  isSelected,
  isIneligible = false,
  ineligibilityReason,
  keepOpen = false,
  ...props
}: {
  className?: string
  children: React.ReactNode
  value: string
  onSelect: (value: string) => void
  isSelected: boolean
  isIneligible?: boolean
  ineligibilityReason?: string
  keepOpen?: boolean
  [key: string]: unknown
}) => {
  return (
    <div
      className={cn(
        "hover:bg-accent hover:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        isIneligible && "opacity-60 bg-gray-50",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center justify-between w-full">
          <span>{children}</span>
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className="ml-2 h-6 px-2 text-xs"
            disabled={isIneligible}
            onClick={(e) => {
              e.stopPropagation()
              if (keepOpen) {
                // Pour la multi-sélection, on empêche la fermeture du dropdown
                e.preventDefault()
              }
              if (!isIneligible) {
                onSelect(value)
              }
            }}
          >
            {isSelected ? "Sélectionné" : "Sélectionner"}
          </Button>
        </div>
        {isIneligible && ineligibilityReason && (
          <Badge variant="destructive" className="text-xs w-fit">
            {ineligibilityReason}
          </Badge>
        )}
      </div>
    </div>
  )
}

interface ContactSelectorProps {
  contacts: Array<{
    id: string
    name: string
    email: string
    role: string
    provider_category?: string
  }>
  selectedContactIds?: string[]
  ineligibleContactIds?: string[]
  ineligibilityReasons?: Record<string, string>
  onContactSelect: (contactId: string) => void
  onContactCreated: (contact: {
    id: string
    name: string
    email: string
    role: string
    provider_category?: string
  }) => void
  contactType: 'gestionnaire' | 'prestataire'
  placeholder: string
  isLoading?: boolean
  teamId: string
  disableTypeSelection?: boolean
}

const ContactSelector = ({
  contacts,
  selectedContactIds = [],
  ineligibleContactIds = [],
  ineligibilityReasons = {},
  onContactSelect,
  onContactCreated,
  contactType,
  placeholder,
  isLoading = false,
  teamId,
  disableTypeSelection = false
}: ContactSelectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Log teamId pour debugging
  logger.info(`🔍 [CONTACT-SELECTOR] Initialized with teamId: "${teamId}" (type: ${typeof teamId})`)

  const handleSelectChange = (value: string) => {
    if (value === "create-new") {
      if (!teamId) {
        logger.error("❌ [CONTACT-SELECTOR] Cannot open modal: teamId is undefined")
        return
      }
      setIsModalOpen(true)
    } else {
      onContactSelect(value)
    }
  }

  // Fonction pour vérifier si un contact est sélectionné
  const isContactSelected = (contactId: string) => {
    // Comportement unifié : tous les types utilisent maintenant selectedContactIds
    return selectedContactIds.map(id => String(id)).includes(String(contactId))
  }

  const handleContactCreated = async (contactData: {
    type: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    address?: string
    speciality?: string
    notes?: string
    inviteToApp?: boolean
  }) => {
    try {
      logger.info('🆕 Création d\'un contact:', contactData)
      
      if (!teamId) {
        logger.error("❌ No team found")
        return
      }

      // Utiliser le service d'invitation pour créer le contact et optionnellement l'utilisateur
      const contactInvitationService = createContactInvitationService()
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

      logger.info("✅ Contact créé avec succès:", result.data)

      // Vérifier que le contact a bien été créé avant de notifier
      if (!result.data?.contact) {
        logger.error("❌ Contact créé mais aucune donnée retournée:", result)
        return
      }

      setIsModalOpen(false)

      // Notifier le parent
      onContactCreated(result.data.contact)

      // Afficher un message si une invitation a été envoyée
      if (result.data?.invitation?.success) {
        logger.info("📧 Invitation envoyée avec succès à:", contactData.email)
      } else if (result.data?.invitation?.error) {
        logger.warn("⚠️ Contact créé mais invitation échouée:", result.data.invitation.error)
      }
      
    } catch (error) {
      logger.error("❌ Erreur lors de la création du contact:", error)
    }
  }

  // Mapper les types français (contactType) vers anglais (ContactFormModal)
  const mapContactTypeToEnglish = (): string => {
    switch (contactType) {
      case 'gestionnaire':
        return 'manager'
      case 'prestataire':
        return 'provider'
      default:
        return contactType
    }
  }

  const getContactLabel = () => {
    switch (contactType) {
      case 'gestionnaire':
        return 'gestionnaire'
      case 'prestataire':
        return 'prestataire'
      default:
        return 'contact'
    }
  }

  // Filtrer les contacts en fonction de la recherche
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contactType === 'prestataire' && contact.speciality && contact.speciality.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-500">Chargement des {getContactLabel()}s...</span>
      </div>
    )
  }

  // Comportement unifié : on utilise toujours un placeholder dynamique
  const selectValue = "" // Toujours vide pour avoir un comportement uniforme
  
  const getPlaceholderText = () => {
    if (contactType === 'prestataire') {
      return selectedContactIds.length > 0 
        ? `${selectedContactIds.length} prestataire${selectedContactIds.length > 1 ? 's' : ''} sélectionné${selectedContactIds.length > 1 ? 's' : ''}`
        : placeholder
    } else if (contactType === 'gestionnaire') {
      return selectedContactIds.length > 0 
        ? `${selectedContactIds.length} gestionnaire${selectedContactIds.length > 1 ? 's' : ''} sélectionné${selectedContactIds.length > 1 ? 's' : ''}`
        : placeholder
    }
    return placeholder
  }
  
  const selectPlaceholder = getPlaceholderText()

  return (
    <>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger>
          <SelectValue placeholder={selectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={`Rechercher un ${getContactLabel()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          {filteredContacts.map((contact) => {
            const isIneligible = ineligibleContactIds.includes(contact.id)
            const ineligibilityReason = ineligibilityReasons[contact.id]

            return (
              <CustomSelectItem
                key={contact.id}
                value={contact.id}
                onSelect={handleSelectChange}
                isSelected={isContactSelected(contact.id)}
                isIneligible={isIneligible}
                ineligibilityReason={ineligibilityReason}
                keepOpen={true} // Toujours garder ouvert pour la multi-sélection
              >
                <div className="flex items-center gap-2">
                  <span>{contact.name}</span>
                  {contact.isCurrentUser && (
                    <Badge variant="secondary" className="text-xs">Vous</Badge>
                  )}
                  {contactType === 'prestataire' && contact.speciality && (
                    <Badge variant="outline" className="text-xs">{contact.speciality}</Badge>
                  )}
                </div>
              </CustomSelectItem>
            )
          })}
          {filteredContacts.length === 0 && searchQuery && (
            <div className="p-2 text-center text-gray-500 text-sm">
              Aucun {getContactLabel()} trouvé
            </div>
          )}
          {contacts.length > 0 && <div className="border-t my-1" />}
          <SelectItem value="create-new" className="text-blue-600">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Ajouter un {getContactLabel()}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleContactCreated}
        defaultType={mapContactTypeToEnglish()}
        teamId={teamId}
        disableTypeSelection={disableTypeSelection}
      />
    </>
  )
}

export default ContactSelector
