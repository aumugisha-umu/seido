"use client"

import { useState, useRef } from "react"
import { ContactSection } from "@/components/ui/contact-section"
import { ContactDeleteConfirmModal } from "@/components/ui/contact-delete-confirm-modal"
import { useToast } from "@/components/ui/use-toast"
import { removeContactFromBuildingAction, assignContactToBuildingAction } from "@/app/gestionnaire/biens/immeubles/[id]/actions"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import { ContactTypeDropdown } from "@/components/contact-type-dropdown"

interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  type: string
  speciality?: string
}

interface ContactsGridPreviewProps {
  buildingId: string
  buildingName: string
  buildingManagers?: unknown[]
  providers: Contact[]
  owners: Contact[]
  others: Contact[]
  buildingContactIds: Record<string, string> // Maps user_id to building_contact_id
  teamId: string // Pour charger les contacts disponibles
}

/**
 * ContactsGridPreview - Grille horizontale de contacts (editable mode)
 *
 * Composant pour afficher et gérer les contacts d'un immeuble dans la vue d'ensemble.
 * Version éditable avec boutons d'ajout et suppression.
 *
 * Design:
 * - Pas de card wrapper (juste la grille)
 * - 4 colonnes responsive (vertical mobile → horizontal desktop)
 * - ContactSection avec boutons d'ajout/suppression
 * - Modale de confirmation avant suppression
 */
export function ContactsGridPreview({
  buildingId,
  buildingName,
  buildingManagers = [],
  providers,
  owners,
  others,
  buildingContactIds,
  teamId
}: ContactsGridPreviewProps) {
  const { toast } = useToast()
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    contact: Contact | null
    contactType: string
  }>({
    isOpen: false,
    contact: null,
    contactType: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Handle contact removal
  const handleRemoveContact = (contact: Contact) => {
    const contactType = contact.type === 'provider' ? 'prestataire' : contact.type === 'owner' ? 'proprietaire' : 'autre'
    setDeleteModal({
      isOpen: true,
      contact,
      contactType
    })
  }

  const confirmRemoveContact = async () => {
    if (!deleteModal.contact) return

    setIsDeleting(true)
    try {
      const buildingContactId = buildingContactIds[deleteModal.contact.id]
      if (!buildingContactId) {
        throw new Error('Contact ID not found')
      }

      const result = await removeContactFromBuildingAction(buildingContactId)

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `${deleteModal.contact.name} a été retiré de l'immeuble.`,
        })
        setDeleteModal({ isOpen: false, contact: null, contactType: '' })
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de retirer le contact",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle add contact - Open ContactSelector modal
  const handleAddContact = (sectionType: string) => {
    // Map section types to contact type keys
    const contactTypeMap: Record<string, string> = {
      'gestionnaires': 'manager',
      'prestataires': 'provider',
      'propriétaires': 'owner',
      'autres contacts': 'other'
    }

    const contactType = contactTypeMap[sectionType] || 'other'
    contactSelectorRef.current?.openContactModal(contactType)
  }

  // Handle contact selection from modal
  const handleContactSelected = async (contact: Contact, contactType: string) => {
    try {
      const result = await assignContactToBuildingAction(buildingId, contact.id, false)

      if (result.success) {
        toast({
          title: "Contact ajouté",
          description: `${contact.name} a été ajouté à l'immeuble.`,
        })
      } else {
        // Check if it's a "already assigned" error (not critical)
        const isAlreadyAssigned = result.error?.includes('déjà assigné')

        toast({
          title: isAlreadyAssigned ? "Contact déjà assigné" : "Erreur",
          description: result.error || 'Erreur lors de l\'ajout',
          variant: isAlreadyAssigned ? "default" : "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'ajouter le contact",
        variant: "destructive"
      })
    }
  }

  // Handle contact removal from modal
  const handleContactRemoved = async (contactId: string, contactType: string) => {
    try {
      // Find the building_contact entry for this user
      const buildingContactId = buildingContactIds[contactId]
      if (!buildingContactId) {
        throw new Error('Contact non trouvé dans l\'immeuble')
      }

      const result = await removeContactFromBuildingAction(buildingContactId)

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `Contact retiré de l'immeuble.`,
        })
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de retirer le contact",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de retirer le contact",
        variant: "destructive"
      })
    }
  }

  // Format contacts for ContactSelector
  const formatSelectedContacts = () => {
    return {
      manager: buildingManagers as Contact[],
      provider: providers,
      owner: owners,
      other: others
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {/* Building Managers Section */}
        <ContactSection
          sectionType="managers"
          contacts={buildingManagers}
          readOnly={false}
          minRequired={1}
          customLabel="Gestionnaires"
          onAddContact={() => handleAddContact('gestionnaires')}
          onRemoveContact={(id) => {
            const contact = (buildingManagers as Contact[]).find(c => c.id === id)
            if (contact) handleRemoveContact(contact)
          }}
        />

        {/* Providers Section */}
        <ContactSection
          sectionType="providers"
          contacts={providers}
          readOnly={false}
          onAddContact={() => handleAddContact('prestataires')}
          onRemoveContact={(id) => {
            const contact = providers.find(c => c.id === id)
            if (contact) handleRemoveContact(contact)
          }}
        />

        {/* Owners Section */}
        <ContactSection
          sectionType="owners"
          contacts={owners}
          readOnly={false}
          onAddContact={() => handleAddContact('propriétaires')}
          onRemoveContact={(id) => {
            const contact = owners.find(c => c.id === id)
            if (contact) handleRemoveContact(contact)
          }}
        />

        {/* Others Section */}
        <ContactSection
          sectionType="others"
          contacts={others}
          readOnly={false}
          onAddContact={() => handleAddContact('autres contacts')}
          onRemoveContact={(id) => {
            const contact = others.find(c => c.id === id)
            if (contact) handleRemoveContact(contact)
          }}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.contact && (
        <ContactDeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, contact: null, contactType: '' })}
          onConfirm={confirmRemoveContact}
          contactName={deleteModal.contact.name}
          contactEmail={deleteModal.contact.email}
          contactType={deleteModal.contactType as any}
          context="immeuble"
          contextName={buildingName}
          isLoading={isDeleting}
        />
      )}

      {/* Contact Selector Modal */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={teamId}
        displayMode="compact"
        selectionMode="multi"
        hideUI={true}
        selectedContacts={formatSelectedContacts()}
        onContactSelected={handleContactSelected}
        onContactCreated={handleContactSelected}
        onContactRemoved={handleContactRemoved}
      />
    </>
  )
}
