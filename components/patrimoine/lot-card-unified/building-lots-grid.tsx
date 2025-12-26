"use client"

import { useState, useRef } from "react"
import { Home } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { LotCardUnified } from "./lot-card-unified"
import { ContactDeleteConfirmModal } from "@/components/ui/contact-delete-confirm-modal"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import { removeContactFromLotAction } from "@/app/gestionnaire/(no-navbar)/biens/immeubles/[id]/actions"
import { assignContactToLotAction } from "@/app/gestionnaire/(no-navbar)/biens/lots/nouveau/actions"
import type { Contact } from "@/lib/services"
import type {
  LotData,
  BuildingContext,
  LotContactIdsMap,
  BaseContact,
  LotContact
} from "./types"

interface BuildingLotsGridProps {
  buildingId: string
  lots: LotData[]
  lotContactIdsMap: LotContactIdsMap
  teamId: string
  // Building-level contacts (inherited by all lots)
  buildingManagers?: BaseContact[]
  buildingTenants?: BaseContact[]
  buildingProviders?: BaseContact[]
  buildingOwners?: BaseContact[]
  buildingOthers?: BaseContact[]
  // Optional: initial lot to expand (from URL param, e.g., after contract edit)
  initialExpandedLotId?: string | null
}

/**
 * BuildingLotsGrid - Grid of LotCardUnified for building details page
 *
 * Handles:
 * - Grid layout of expandable lot cards
 * - Contact management (add/remove) via modals
 * - Building context for inherited contacts
 */
export function BuildingLotsGrid({
  buildingId,
  lots,
  lotContactIdsMap,
  teamId,
  buildingManagers = [],
  buildingTenants = [],
  buildingProviders = [],
  buildingOwners = [],
  buildingOthers = [],
  initialExpandedLotId = null
}: BuildingLotsGridProps) {
  const { toast } = useToast()
  const contactSelectorRef = useRef<ContactSelectorRef>(null)
  const [currentLotId, setCurrentLotId] = useState<string | undefined>(undefined)

  // Track expanded lot IDs (initialized with initialExpandedLotId if provided)
  const [expandedLotIds, setExpandedLotIds] = useState<Set<string>>(() => {
    return initialExpandedLotId ? new Set([initialExpandedLotId]) : new Set()
  })

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    contact: { id: string; name: string; email: string; type: string } | null
    lotId: string
    lotReference: string
    contactType: string
  }>({
    isOpen: false,
    contact: null,
    lotId: '',
    lotReference: '',
    contactType: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Build building context for inherited contacts
  const buildingContext: BuildingContext = {
    id: buildingId,
    name: '',
    managers: buildingManagers,
    tenants: buildingTenants,
    providers: buildingProviders,
    owners: buildingOwners,
    others: buildingOthers
  }

  // Handle add contact - Open ContactSelector modal for specific lot
  const handleAddContact = (sectionType: string, lotId: string) => {
    // Map section types to contact type keys
    const contactTypeMap: Record<string, string> = {
      'gestionnaires': 'manager',
      'locataires': 'tenant',
      'prestataires': 'provider',
      'propriétaires': 'owner',
      'autres contacts': 'other'
    }

    const contactType = contactTypeMap[sectionType] || 'other'
    setCurrentLotId(lotId)
    contactSelectorRef.current?.openContactModal(contactType, lotId)
  }

  // Handle remove contact - Show confirmation modal
  const handleRemoveContact = (contactId: string, lotId: string) => {
    const lot = lots.find(l => l.id === lotId)
    const contact = lot?.lot_contacts?.find(lc => lc.user.id === contactId)

    if (contact) {
      const contactType = contact.user.role === 'locataire' ? 'locataire'
        : contact.user.role === 'prestataire' ? 'prestataire'
        : contact.user.role === 'proprietaire' ? 'proprietaire'
        : 'autre'

      setDeleteModal({
        isOpen: true,
        contact: {
          id: contact.user.id,
          name: contact.user.name,
          email: contact.user.email,
          type: contact.user.role
        },
        lotId,
        lotReference: lot?.reference || '',
        contactType
      })
    }
  }

  const confirmRemoveContact = async () => {
    if (!deleteModal.contact || !deleteModal.lotId) return

    setIsDeleting(true)
    try {
      // Find the lot_contact_id from the lookup map
      const contactInfo = lotContactIdsMap[deleteModal.contact.id]

      if (!contactInfo) {
        throw new Error('Contact non trouvé dans le lot')
      }

      const result = await removeContactFromLotAction(contactInfo.lotContactId)

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `${deleteModal.contact.name} a été retiré du lot ${deleteModal.lotReference}.`,
        })
        setDeleteModal({ isOpen: false, contact: null, lotId: '', lotReference: '', contactType: '' })
      } else {
        throw new Error(result.error || "Erreur lors de la suppression")
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

  // Handle contact selection from modal
  const handleContactSelected = async (contact: Contact, contactType: string, context?: { lotId?: string }) => {
    if (!context?.lotId) return

    try {
      const result = await assignContactToLotAction(context.lotId, contact.id, false)

      if (result.success) {
        const lot = lots.find(l => l.id === context.lotId)
        toast({
          title: "Contact ajouté",
          description: `${contact.name} a été ajouté au lot ${lot?.reference || ''}.`,
        })
      } else {
        const errorMessage = result.error?.message || result.error || "Erreur lors de l'ajout"
        const isAlreadyAssigned = errorMessage.includes('déjà assigné')

        const lot = lots.find(l => l.id === context.lotId)
        toast({
          title: isAlreadyAssigned ? "Contact déjà assigné" : "Erreur",
          description: isAlreadyAssigned ? `${contact.name} est déjà assigné au lot ${lot?.reference || ''}.` : errorMessage,
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
  const handleContactRemoved = async (contactId: string, _contactType: string, _context?: { lotId?: string }) => {
    void _contactType // Used by ContactSelector signature
    void _context // Used by ContactSelector signature
    try {
      const contactInfo = lotContactIdsMap[contactId]

      if (!contactInfo) {
        throw new Error('Contact non trouvé dans les lots')
      }

      const result = await removeContactFromLotAction(contactInfo.lotContactId)

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `Contact retiré du lot ${contactInfo.lotReference}.`,
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

  // Format contacts for ContactSelector (by lot)
  const formatLotContactAssignments = () => {
    const assignments: { [lotId: string]: { [contactType: string]: Contact[] } } = {}

    lots.forEach(lot => {
      const managers = lot.lot_contacts?.filter(lc => lc.user.role === 'gestionnaire') || []
      const tenants = lot.lot_contacts?.filter(lc => lc.user.role === 'locataire') || []
      const providers = lot.lot_contacts?.filter(lc => lc.user.role === 'prestataire') || []
      const owners = lot.lot_contacts?.filter(lc => lc.user.role === 'proprietaire') || []
      const others = lot.lot_contacts?.filter(lc =>
        !['gestionnaire', 'locataire', 'prestataire', 'proprietaire'].includes(lc.user.role)
      ) || []

      const toContact = (lc: LotContact): Contact => ({
        id: lc.user.id,
        name: lc.user.name,
        email: lc.user.email,
        phone: lc.user.phone,
        type: lc.user.role
      })

      assignments[lot.id] = {
        manager: managers.map(toContact),
        tenant: tenants.map(toContact),
        provider: providers.map(toContact),
        owner: owners.map(toContact),
        other: others.map(toContact)
      }
    })

    return assignments
  }

  if (!lots || lots.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Home className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600">
          {!lots ? 'Chargement des lots...' : 'Aucun lot dans cet immeuble'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {lots.map((lot) => (
          <LotCardUnified
            key={lot.id}
            lot={lot}
            variant="expandable"
            mode="view"
            showBuilding={false}
            showInterventionsCount={false}
            isExpanded={expandedLotIds.has(lot.id)}
            onExpand={(expanded) => {
              setExpandedLotIds(prev => {
                const next = new Set(prev)
                if (expanded) {
                  next.add(lot.id)
                } else {
                  next.delete(lot.id)
                }
                return next
              })
            }}
            buildingContext={buildingContext}
            lotContactIdsMap={lotContactIdsMap}
            teamId={teamId}
            onAddContact={handleAddContact}
            onRemoveContact={handleRemoveContact}
            customActions={{
              showDropdown: false
            }}
          />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.contact && (
        <ContactDeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, contact: null, lotId: '', lotReference: '', contactType: '' })}
          onConfirm={confirmRemoveContact}
          contactName={deleteModal.contact.name}
          contactEmail={deleteModal.contact.email}
          contactType={deleteModal.contactType as any}
          context="lot"
          contextName={deleteModal.lotReference}
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
        lotContactAssignments={formatLotContactAssignments()}
        lotId={currentLotId}
        onContactSelected={handleContactSelected}
        onContactCreated={handleContactSelected}
        onContactRemoved={handleContactRemoved}
      />
    </>
  )
}

export default BuildingLotsGrid
