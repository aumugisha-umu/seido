"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronDown, ChevronUp, Home, Users, Eye, ScrollText, Shield } from "lucide-react"
import { ContactSection } from "@/components/ui/contact-section"
import { ContactDeleteConfirmModal } from "@/components/ui/contact-delete-confirm-modal"
import { useToast } from "@/components/ui/use-toast"
import { removeContactFromLotAction } from "@/app/gestionnaire/(no-navbar)/biens/immeubles/[id]/actions"
import { assignContactToLotAction } from "@/app/gestionnaire/(no-navbar)/biens/lots/nouveau/actions"
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

// ✅ 2025-12-26: Added contracts to show tenants/guarantors from active contracts
interface ContractContact {
  id: string
  role: 'locataire' | 'colocataire' | 'garant' | 'representant_legal' | 'autre'
  is_primary?: boolean
  user: {
    id: string
    name: string
    email: string | null
    phone?: string | null
  }
}

interface LotContract {
  id: string
  title: string
  status: string
  start_date: string
  end_date: string
  contacts: ContractContact[]
}

interface LotWithContacts {
  id: string
  reference: string
  category: string
  floor: number
  door_number: string
  lot_contacts: LotContact[]
  contracts?: LotContract[]  // Contracts with their contacts (tenants, guarantors)
}

interface LotsWithContactsPreviewProps {
  buildingId: string
  lots: LotWithContacts[]
  lotContactIdsMap: Record<string, { lotId: string; lotContactId: string; lotReference: string }>
  teamId: string // Pour charger les contacts disponibles
  // Building-level contacts (inherited by all lots)
  buildingManagers?: Array<{ id: string; name: string; email: string; phone?: string; type: string }>
  buildingTenants?: Array<{ id: string; name: string; email: string; phone?: string; type: string }>
  buildingProviders?: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }>
  buildingOwners?: Array<{ id: string; name: string; email: string; phone?: string; type: string }>
  buildingOthers?: Array<{ id: string; name: string; email: string; phone?: string; type: string }>
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
export function LotsWithContactsPreview({
  buildingId,
  lots,
  lotContactIdsMap,
  teamId,
  buildingManagers = [],
  buildingTenants = [],
  buildingProviders = [],
  buildingOwners = [],
  buildingOthers = []
}: LotsWithContactsPreviewProps) {
  const router = useRouter()
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

  // Handle contact removal from modal (using lookup map like building contacts)
  const handleContactRemoved = async (contactId: string, contactType: string, context?: { lotId?: string }) => {
    try {
      console.log('🔍 [DEBUG-LOT-REMOVAL] Starting removal attempt:', {
        contactId,
        contactType,
        contextLotId: context?.lotId,
        hasLotContactIdsMap: !!lotContactIdsMap,
        mapSize: Object.keys(lotContactIdsMap).length,
        allMapKeys: Object.keys(lotContactIdsMap),
        allMapValues: Object.values(lotContactIdsMap)
      })

      // Use lookup map to find lot_contact ID (like building contacts pattern)
      const contactInfo = lotContactIdsMap[contactId]

      console.log('🔍 [DEBUG-LOT-REMOVAL] Lookup result:', {
        contactId,
        foundInMap: !!contactInfo,
        contactInfo
      })

      if (!contactInfo) {
        console.error('❌ [DEBUG-LOT-REMOVAL] Contact NOT found in lookup map:', {
          contactId,
          availableKeys: Object.keys(lotContactIdsMap)
        })
        throw new Error('Contact non trouvé dans les lots')
      }

      console.log('🚀 [DEBUG-LOT-REMOVAL] Calling removeContactFromLotAction:', {
        lotContactId: contactInfo.lotContactId,
        lotId: contactInfo.lotId,
        lotReference: contactInfo.lotReference
      })

      const result = await removeContactFromLotAction(contactInfo.lotContactId)

      console.log('📥 [DEBUG-LOT-REMOVAL] Server action result:', {
        success: result.success,
        error: result.error,
        fullResult: result
      })

      if (result.success) {
        toast({
          title: "Contact retiré",
          description: `Contact retiré du lot ${contactInfo.lotReference}.`,
        })
        // Server action handles revalidation - no router.refresh() needed
      } else {
        console.error('❌ [DEBUG-LOT-REMOVAL] Server action failed:', result.error)
        toast({
          title: "Erreur",
          description: result.error || "Impossible de retirer le contact",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ [DEBUG-LOT-REMOVAL] Exception caught:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      })
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
      case 'maison': return 'Maison'
      case 'garage': return 'Garage'
      case 'local_commercial': return 'Local commercial'
      default: return category
    }
  }

  // Format contacts by category for tooltip display
  const formatContactsForTooltip = (managers: any[], tenants: any[], providers: any[], owners: any[], others: any[]) => {
    const sections: Array<{ label: string; contacts: any[] }> = []

    if (managers.length > 0) {
      sections.push({ label: 'Gestionnaires', contacts: managers })
    }
    if (tenants.length > 0) {
      sections.push({ label: 'Locataires', contacts: tenants })
    }
    if (providers.length > 0) {
      sections.push({ label: 'Prestataires', contacts: providers })
    }
    if (owners.length > 0) {
      sections.push({ label: 'Propriétaires', contacts: owners })
    }
    if (others.length > 0) {
      sections.push({ label: 'Autres', contacts: others })
    }

    return sections
  }

  // Transform lot_contacts by role
  const transformContactsByRole = (lotContacts: LotContact[]) => {
    const managers: Array<{ id: string; name: string; email: string; phone?: string; type: string }> = []
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
        case 'gestionnaire':
          managers.push(transformedContact)
          break
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

    return { managers, tenants, providers, owners, others }
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
        // ✅ 2025-12-26: Count both lot_contacts AND contract contacts (tenants, guarantors)
        const lotContactsCount = lot.lot_contacts?.length || 0
        const contractContactsCount = lot.contracts?.reduce(
          (sum, contract) => sum + (contract.contacts?.length || 0), 0
        ) || 0
        const contactsCount = lotContactsCount + contractContactsCount
        const { managers, tenants, providers, owners, others } = transformContactsByRole(lot.lot_contacts || [])

        return (
          <div
            key={lot.id || `lot-${index}`}
            className={isExpanded ? "md:col-span-2 lg:col-span-4" : ""}
          >
            <Card className="overflow-hidden h-full p-4">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
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
                            • Porte/Boîte {lot.door_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {contactsCount > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-purple-50 text-purple-700 border-purple-200 cursor-help"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            {contactsCount}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-xs bg-white text-gray-900 border border-gray-200 shadow-lg p-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-2">
                            {formatContactsForTooltip(managers, tenants, providers, owners, others).map((section) => (
                              <div key={section.label}>
                                <div className="font-semibold text-xs text-gray-700 mb-1">
                                  {section.label} ({section.contacts.length})
                                </div>
                                <div className="space-y-1 pl-2">
                                  {section.contacts.map((contact) => (
                                    <div key={contact.id} className="text-xs text-gray-600">
                                      {contact.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        <Users className="h-3 w-3 mr-1" />
                        {contactsCount}
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/gestionnaire/biens/lots/${lot.id}`)
                          }}
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Voir les détails du lot
                      </TooltipContent>
                    </Tooltip>
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

              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-0">
                  {/* Grid layout for contacts - 5 columns on desktop (ajout gestionnaires) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                    <ContactSection
                      sectionType="managers"
                      contacts={managers}
                      readOnly={false}
                      onAddContact={() => handleAddContact('gestionnaires', lot.reference, lot.id)}
                      onRemoveContact={(id) => {
                        const contact = managers.find(c => c.id === id)
                        if (contact) handleRemoveContact(contact as any, lot.id, lot.reference)
                      }}
                      inheritedContacts={buildingManagers}
                      showInheritedSummary={true}
                    />
                    <ContactSection
                      sectionType="tenants"
                      contacts={tenants}
                      readOnly={false}
                      onAddContact={() => handleAddContact('locataires', lot.reference, lot.id)}
                      onRemoveContact={(id) => {
                        const contact = tenants.find(c => c.id === id)
                        if (contact) handleRemoveContact(contact as any, lot.id, lot.reference)
                      }}
                      inheritedContacts={buildingTenants}
                      showInheritedSummary={true}
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
                      inheritedContacts={buildingProviders}
                      showInheritedSummary={true}
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
                      inheritedContacts={buildingOwners}
                      showInheritedSummary={true}
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
                      inheritedContacts={buildingOthers}
                      showInheritedSummary={true}
                    />
                  </div>

                  {/* ✅ 2025-12-26: Contract contacts section (tenants, guarantors from active contracts) */}
                  {lot.contracts && lot.contracts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <ScrollText className="h-4 w-4" />
                        Contacts liés aux contrats
                      </h4>
                      <div className="space-y-3">
                        {lot.contracts.map((contract) => {
                          const contractTenants = contract.contacts?.filter(
                            c => c.role === 'locataire' || c.role === 'colocataire'
                          ) || []
                          const contractGuarantors = contract.contacts?.filter(
                            c => c.role === 'garant'
                          ) || []

                          if (contractTenants.length === 0 && contractGuarantors.length === 0) {
                            return null
                          }

                          return (
                            <div key={contract.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">
                                  {contract.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    contract.status === 'actif'
                                      ? 'text-green-700 border-green-300 bg-green-50'
                                      : 'text-amber-700 border-amber-300 bg-amber-50'
                                  }
                                >
                                  {contract.status === 'actif' ? 'Actif' : 'À venir'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {/* Tenants column */}
                                {contractTenants.length > 0 && (
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      Locataires ({contractTenants.length})
                                    </div>
                                    <div className="space-y-1">
                                      {contractTenants.map((contact) => (
                                        <div
                                          key={contact.id}
                                          className="text-xs bg-white rounded px-2 py-1 border border-blue-100"
                                        >
                                          <span className="font-medium text-blue-700">
                                            {contact.user.name}
                                          </span>
                                          {contact.role === 'colocataire' && (
                                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                                              Coloc
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {/* Guarantors column */}
                                {contractGuarantors.length > 0 && (
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                      <Shield className="h-3 w-3" />
                                      Garants ({contractGuarantors.length})
                                    </div>
                                    <div className="space-y-1">
                                      {contractGuarantors.map((contact) => (
                                        <div
                                          key={contact.id}
                                          className="text-xs bg-white rounded px-2 py-1 border border-amber-100"
                                        >
                                          <span className="font-medium text-amber-700">
                                            {contact.user.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
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
