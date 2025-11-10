"use client"

import { useState, useRef } from "react"
import { ContactSection } from "@/components/ui/contact-section"
import { ContactDeleteConfirmModal } from "@/components/ui/contact-delete-confirm-modal"
import { useToast } from "@/components/ui/use-toast"
import { removeContactFromLotAction, assignContactToLotAction } from "@/app/gestionnaire/biens/lots/nouveau/actions"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"

interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  type: string
  speciality?: string
}

interface LotContactsGridPreviewProps {
  lotId: string
  lotReference: string
  managers?: Contact[]
  tenants: Contact[]
  providers: Contact[]
  owners: Contact[]
  others: Contact[]
  lotContactIds: Record<string, string> // Maps user_id to lot_contact_id
  teamId: string
}

/**
 * LotContactsGridPreview - Grille horizontale de contacts pour lot (editable mode)
 *
 * Composant pour afficher et gérer les contacts d'un lot dans la vue d'ensemble.
 * Version éditable avec boutons d'ajout et suppression.
 *
 * Design:
 * - Pas de card wrapper (juste la grille)
 * - 5 colonnes responsive (vertical mobile → horizontal desktop)
 * - ContactSection avec boutons d'ajout/suppression
 * - Modale de confirmation avant suppression
 */
export function LotContactsGridPreview({
  lotId,
  lotReference,
  managers = [],
  tenants,
  providers,
  owners,
  others,
  lotContactIds,
  teamId
}: LotContactsGridPreviewProps) {
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
    const contactType = contact.type === 'provider' ? 'prestataire' : contact.type === 'owner' ? 'proprietaire' : contact.type === 'tenant' ? 'locataire' : contact.type === 'manager' ? 'gestionnaire' : 'autre'
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
      const lotContactId = lotContactIds[deleteModal.contact.id]
      if (!lotContactId) {
        throw new Error('Contact ID not found')
      }

      const result = await removeContactFromLotAction(lotContactId)

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `${deleteModal.contact.name} a été retiré du lot.`,
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
      'locataires': 'tenant',
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
      const result = await assignContactToLotAction(lotId, contact.id)

      if (result.success) {
        toast({
          title: "Contact ajouté",
          description: `${contact.name} a été ajouté au lot.`,
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

  // Format contacts for ContactSelector
  const formatSelectedContacts = () => {
    return {
      manager: managers,
      tenant: tenants,
      provider: providers,
      owner: owners,
      other: others
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
        {/* Managers Section */}
        <ContactSection
          sectionType="managers"
          contacts={managers}
          readOnly={false}
          customLabel="Gestionnaires"
          onAddContact={() => handleAddContact('gestionnaires')}
          onRemoveContact={(id) => {
            const contact = managers.find(c => c.id === id)
            if (contact) handleRemoveContact(contact)
          }}
        />

        {/* Tenants Section */}
        <ContactSection
          sectionType="tenants"
          contacts={tenants}
          readOnly={false}
          onAddContact={() => handleAddContact('locataires')}
          onRemoveContact={(id) => {
            const contact = tenants.find(c => c.id === id)
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
          context="lot"
          contextName={lotReference}
          isLoading={isDeleting}
        />
      )}

      {/* Contact Selector Modal */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={teamId}
        displayMode="compact"
        hideUI={true}
        selectedContacts={formatSelectedContacts()}
        onContactSelected={handleContactSelected}
        onContactCreated={handleContactSelected}
      />
    </>
  )
}
