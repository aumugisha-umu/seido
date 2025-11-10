"use client"

import { useState, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Home, Users } from "lucide-react"
import { ContactSection } from "@/components/ui/contact-section"
import { ContactDeleteConfirmModal } from "@/components/ui/contact-delete-confirm-modal"
import { useToast } from "@/components/ui/use-toast"
import { removeContactFromLotAction } from "@/app/gestionnaire/biens/immeubles/[id]/actions"
import { assignContactToLotAction } from "@/app/gestionnaire/biens/lots/nouveau/actions"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import type { Contact } from "@/lib/services"

interface LotContact {
  id: string
  user_id: string
  is_primary: boolean
  user: {
    id: string
    name: string
    email: string
    phone?: string
    role: string
    provider_category?: string
    speciality?: string
  }
}

interface LotWithContacts {
  id: string
  reference: string
  category: string
  floor: number
  door_number: string
  lot_contacts: LotContact[]
}

interface LotsWithContactsPreviewProps {
  buildingId: string
  lots: LotWithContacts[]
  teamId: string // Pour charger les contacts disponibles
}

/**
 * LotsWithContactsPreview - Cards collapsibles pour afficher les lots avec leurs contacts
 *
 * Design compact pour la vue d'ensemble:
 * - Cards collapsibles (fermées par défaut)
 * - Header avec référence + category + nombre de contacts
 * - Content: Grille de ContactSection en mode éditable
 * - Click sur chevron pour expand/collapse
 * - Modale de confirmation avant suppression de contact
 */
export function LotsWithContactsPreview({ buildingId, lots, teamId }: LotsWithContactsPreviewProps) {
  const { toast } = useToast()
  const contactSelectorRef = useRef<ContactSelectorRef>(null)
  const [expandedLots, setExpandedLots] = useState<Record<string, boolean>>({})
  const [currentLotId, setCurrentLotId] = useState<string | undefined>(undefined)

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

  const toggleLot = (lotId: string) => {
    setExpandedLots(prev => ({ ...prev, [lotId]: !prev[lotId] }))
  }

  // Handle contact removal
  const handleRemoveContact = (contact: { id: string; name: string; email: string; type: string }, lotId: string, lotReference: string) => {
    const contactType = contact.type === 'tenant' ? 'locataire' : contact.type === 'provider' ? 'prestataire' : contact.type === 'owner' ? 'proprietaire' : 'autre'
    setDeleteModal({
      isOpen: true,
      contact,
      lotId,
      lotReference,
      contactType
    })
  }

  const confirmRemoveContact = async () => {
    if (!deleteModal.contact || !deleteModal.lotId) return

    setIsDeleting(true)
    try {
      // Find the lot_contact_id from the lot_contacts array
      const lot = lots.find(l => l.id === deleteModal.lotId)
      const lotContact = lot?.lot_contacts.find(lc => lc.user.id === deleteModal.contact!.id)

      if (!lotContact) {
        throw new Error('Contact non trouvé dans le lot')
      }

      const result = await removeContactFromLotAction(lotContact.id)

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `${deleteModal.contact.name} a été retiré du lot ${deleteModal.lotReference}.`,
        })
        setDeleteModal({ isOpen: false, contact: null, lotId: '', lotReference: '', contactType: '' })
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

  // Handle add contact - Open ContactSelector modal for specific lot
  const handleAddContact = (sectionType: string, lotReference: string, lotId: string) => {
    // Map section types to contact type keys
    const contactTypeMap: Record<string, string> = {
      'locataires': 'tenant',
      'prestataires': 'provider',
      'propriétaires': 'owner',
      'autres contacts': 'other'
    }

    const contactType = contactTypeMap[sectionType] || 'other'
    setCurrentLotId(lotId)
    contactSelectorRef.current?.openContactModal(contactType, lotId)
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
        // Check if it's a "already assigned" error (not critical)
        const errorMessage = result.error?.message || result.error || 'Erreur lors de l\'ajout'
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

  // Format contacts for ContactSelector (by lot)
  const formatLotContactAssignments = () => {
    const assignments: { [lotId: string]: { [contactType: string]: Contact[] } } = {}

    lots.forEach(lot => {
      const { tenants, providers, owners, others } = transformContactsByRole(lot.lot_contacts || [])

      assignments[lot.id] = {
        tenant: tenants.map(toContact),
        provider: providers.map(toContact),
        owner: owners.map(toContact),
        other: others.map(toContact)
      }
    })

    return assignments
  }

  // Convert lot contact user to Contact format
  const toContact = (contact: { id: string; name: string; email: string; phone?: string; type: string }): Contact => ({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    type: contact.type,
    phone: contact.phone
  })

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'appartement': return 'Appartement'
      case 'collocation': return 'Collocation'
      case 'maison': return 'Maison'
      case 'garage': return 'Garage'
      case 'local_commercial': return 'Local commercial'
      case 'parking': return 'Parking'
      default: return category
    }
  }

  // Transform lot_contacts by role
  const transformContactsByRole = (lotContacts: LotContact[]) => {
    const tenants: Array<{ id: string; name: string; email: string; phone?: string; type: string }> = []
    const providers: Array<{ id: string; name: string; email: string; phone?: string; type: string }> = []
    const owners: Array<{ id: string; name: string; email: string; phone?: string; type: string }> = []
    const others: Array<{ id: string; name: string; email: string; phone?: string; type: string }> = []

    lotContacts.forEach((contact) => {
      const transformedContact = {
        id: contact.user.id,
        name: contact.user.name,
        email: contact.user.email,
        phone: contact.user.phone,
        type: contact.user.role
      }

      switch (contact.user.role) {
        case 'locataire':
          tenants.push(transformedContact)
          break
        case 'prestataire':
          providers.push(transformedContact)
          break
        case 'proprietaire':
          owners.push(transformedContact)
          break
        default:
          others.push(transformedContact)
      }
    })

    return { tenants, providers, owners, others }
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
      {lots.map((lot, index) => {
        const isExpanded = expandedLots[lot.id] || false
        const contactsCount = lot.lot_contacts?.length || 0
        const { tenants, providers, owners, others } = transformContactsByRole(lot.lot_contacts || [])

        return (
          <div
            key={lot.id || `lot-${index}`}
            className={isExpanded ? "md:col-span-2 lg:col-span-4" : ""}
          >
            <Card className="overflow-hidden h-full">
              <CardHeader
                className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleLot(lot.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Home className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{lot.reference}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {getCategoryLabel(lot.category)}
                        </Badge>
                        {lot.floor && (
                          <span className="text-xs text-gray-500">
                            Étage {lot.floor}
                          </span>
                        )}
                        {lot.door_number && (
                          <span className="text-xs text-gray-500">
                            • Porte {lot.door_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      <Users className="h-3 w-3 mr-1" />
                      {contactsCount}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLot(lot.id)
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && contactsCount > 0 && (
                <CardContent className="pt-0 pb-4">
                  {/* Grid layout for contacts - 4 columns on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    <ContactSection
                      sectionType="tenants"
                      contacts={tenants}
                      readOnly={false}
                      onAddContact={() => handleAddContact('locataires', lot.reference, lot.id)}
                      onRemoveContact={(id) => {
                        const contact = tenants.find(c => c.id === id)
                        if (contact) handleRemoveContact(contact as any, lot.id, lot.reference)
                      }}
                    />
                    <ContactSection
                      sectionType="providers"
                      contacts={providers}
                      readOnly={false}
                      onAddContact={() => handleAddContact('prestataires', lot.reference, lot.id)}
                      onRemoveContact={(id) => {
                        const contact = providers.find(c => c.id === id)
                        if (contact) handleRemoveContact(contact as any, lot.id, lot.reference)
                      }}
                    />
                    <ContactSection
                      sectionType="owners"
                      contacts={owners}
                      readOnly={false}
                      onAddContact={() => handleAddContact('propriétaires', lot.reference, lot.id)}
                      onRemoveContact={(id) => {
                        const contact = owners.find(c => c.id === id)
                        if (contact) handleRemoveContact(contact as any, lot.id, lot.reference)
                      }}
                    />
                    <ContactSection
                      sectionType="others"
                      contacts={others}
                      readOnly={false}
                      onAddContact={() => handleAddContact('autres contacts', lot.reference, lot.id)}
                      onRemoveContact={(id) => {
                        const contact = others.find(c => c.id === id)
                        if (contact) handleRemoveContact(contact as any, lot.id, lot.reference)
                      }}
                    />
                  </div>
                </CardContent>
              )}

              {isExpanded && contactsCount === 0 && (
                <CardContent className="pt-0 pb-4">
                  <div className="text-center py-4 text-sm text-gray-500">
                    Aucun contact assigné à ce lot
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )
      })}
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
      hideUI={true}
      lotContactAssignments={formatLotContactAssignments()}
      lotId={currentLotId}
      onContactSelected={handleContactSelected}
      onContactCreated={handleContactSelected}
    />
    </>
  )
}
