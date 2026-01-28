'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, Wrench, Users, Plus, AlertCircle, UserCheck, Info, Building2, MapPin, Archive, Edit as EditIcon, Trash2, Home, ScrollText, Shield, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { determineAssignmentType } from '@/lib/services'
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { DocumentsSection } from "@/components/intervention/documents-section"
import { DetailPageHeader, type DetailPageHeaderBadge, type DetailPageHeaderMetadata, type DetailPageHeaderAction } from "@/components/ui/detail-page-header"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { logger } from '@/lib/logger'
import { deleteLotAction } from './actions'
import type { Lot } from '@/lib/services'
// Stats badges removed from overview
import { LotContactsGridPreview } from '@/components/ui/lot-contacts-grid-preview'
import { ContractsNavigator } from '@/components/contracts/contracts-navigator'
import { ContactCardCompact } from '@/components/contacts/contact-card-compact'
import type { ContractWithRelations } from '@/lib/types/contract.types'
import { EntityEmailsTab } from '@/components/emails/entity-emails-tab'
import { GoogleMapsProvider, GoogleMapPreview } from '@/components/google-maps'

// Helper function to get French label for lot category
function getCategoryLabel(category: string): string {
  const categoryLabels: Record<string, string> = {
    'appartement': 'Appartement',
    'collocation': 'Collocation',
    'maison': 'Maison',
    'garage': 'Garage',
    'local_commercial': 'Local commercial',
    'parking': 'Parking',
    'autre': 'Autre'
  }
  return categoryLabels[category] || category
}

interface LotContact {
  id: string
  user_id: string
  lot_id: string
  building_id: string | null
  type: 'tenant' | 'owner' | 'manager' | 'provider'
  status: 'active'
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
    role?: string
    provider_category?: string
    is_active: boolean
    company?: string
    address?: string
    speciality?: string
  }
  [key: string]: unknown
}

interface Intervention {
  id: string
  title: string
  status: string
  description: string
  reference: string
  urgency?: string
  estimated_cost?: number
  scheduled_date?: string
  created_at: string
  assigned_contact?: { name: string }
  [key: string]: unknown
}

interface LotAddress {
  latitude: number
  longitude: number
  formatted_address: string | null
}

interface LotDetailsClientProps {
  lot: Lot & {
    building?: {
      id: string
      name: string
      address: string
      city: string
    }
    manager?: { name: string }
    apartment_number?: string
    floor?: number
    surface_area?: number
    rooms?: number
    is_occupied?: boolean
    [key: string]: unknown
  }
  interventions: Intervention[]
  contacts: LotContact[]
  buildingContacts: LotContact[]
  interventionsWithDocs: Intervention[]
  contracts: ContractWithRelations[]
  isOccupied: boolean
  teamId: string
  lotAddress?: LotAddress | null
}

export default function LotDetailsClient({
  lot,
  interventions,
  contacts: initialContacts,
  buildingContacts,
  interventionsWithDocs,
  contracts,
  isOccupied: initialIsOccupied,
  teamId,
  lotAddress
}: LotDetailsClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()

  // Local state
  const [contacts, setContacts] = useState(initialContacts)
  const [isOccupied, setIsOccupied] = useState(initialIsOccupied)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate intervention stats
  const getInterventionStats = () => {
    return {
      total: interventions.length,
      pending: interventions.filter(i => i.status === 'pending').length,
      inProgress: interventions.filter(i => i.status === 'in_progress' || i.status === 'assigned').length,
      completed: interventions.filter(i => i.status === 'completed').length
    }
  }

  const confirmDelete = async () => {
    if (!lot?.id) return

    try {
      setIsDeleting(true)
      logger.info("🗑️ Deleting lot:", lot.id)

      const deleteResult = await deleteLotAction(lot.id)

      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || 'Failed to delete lot')
      }

      // Redirect to building page or buildings list
      if (lot.building?.id) {
        router.push(`/gestionnaire/biens/immeubles/${lot.building.id}?lot=deleted`)
      } else {
        router.push('/gestionnaire/biens')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error("❌ Error deleting lot:", errorMessage)
      setError(`Erreur lors de la suppression du lot: ${errorMessage}`)
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Transform interventions data for documents component
  const transformInterventionsForDocuments = (interventionsData: Intervention[]) => {
    return interventionsData.map(intervention => ({
      id: intervention.id,
      reference: intervention.reference || `INT-${intervention.id.slice(-6)}`,
      title: intervention.title,
      type: intervention.type,
      status: intervention.status,
      completedAt: intervention.completed_at,
      assignedContact: intervention.assigned_contact ? {
        name: intervention.assigned_contact.name,
        role: 'prestataire'
      } : undefined,
      documents: intervention.documents?.map((doc: {
        id: string
        original_filename?: string
        filename: string
        file_size: number
        mime_type: string
        uploaded_at: string
      }) => ({
        id: doc.id,
        name: doc.original_filename || doc.filename,
        size: doc.file_size,
        type: doc.mime_type,
        uploadedAt: doc.uploaded_at,
        uploadedBy: {
          name: 'Utilisateur',
          role: 'user'
        }
      })) || []
    })).filter(intervention => intervention.documents.length > 0)
  }

  const handleDocumentView = (document: unknown) => {
    logger.info('Viewing document:', document)
  }

  const handleDocumentDownload = (document: unknown) => {
    logger.info('Downloading document:', document)
  }

  const handleBack = () => {
    if (lot.building?.id) {
      router.push(`/gestionnaire/biens/immeubles/${lot.building.id}`)
    } else {
      router.push('/gestionnaire/biens')
    }
  }

  const handleEdit = () => {
    router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)
  }

  const handleCustomAction = (actionKey: string) => {
    switch (actionKey) {
      case "add-intervention":
        router.push(`/gestionnaire/interventions/nouvelle-intervention?lotId=${lot.id}`)
        break
      default:
        logger.info("Action not implemented:", actionKey)
    }
  }

  const interventionStats = getInterventionStats()

  // Transform contacts by role for grid preview
  const transformContactsByRole = () => {
    const managers: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const tenants: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const providers: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const owners: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const others: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []

    contacts.forEach((contact) => {
      const transformedContact = {
        id: contact.user_id,
        name: contact.user.name,
        email: contact.user.email,
        phone: contact.user.phone,
        type: contact.user.role || 'other',
        speciality: contact.user.speciality
      }

      switch (contact.user.role) {
        case 'gestionnaire':
        case 'admin':
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

  const { managers, tenants, providers, owners, others } = transformContactsByRole()

  // Transform building contacts by role for inheritance display
  const transformBuildingContactsByRole = () => {
    const buildingManagers: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []
    const buildingTenants: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []
    const buildingProviders: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []
    const buildingOwners: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []
    const buildingOthers: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []

    buildingContacts.forEach((contact) => {
      const transformedContact = {
        id: contact.user_id,
        name: contact.user.name,
        email: contact.user.email,
        phone: contact.user.phone,
        company: contact.user.company,
        type: contact.user.role || 'other',
        speciality: contact.user.speciality
      }

      switch (contact.user.role) {
        case 'gestionnaire':
        case 'admin':
          buildingManagers.push(transformedContact)
          break
        case 'locataire':
          buildingTenants.push(transformedContact)
          break
        case 'prestataire':
          buildingProviders.push(transformedContact)
          break
        case 'proprietaire':
          buildingOwners.push(transformedContact)
          break
        default:
          buildingOthers.push(transformedContact)
      }
    })

    return { buildingManagers, buildingTenants, buildingProviders, buildingOwners, buildingOthers }
  }

  const { buildingManagers, buildingTenants, buildingProviders, buildingOwners, buildingOthers } = transformBuildingContactsByRole()

  // Extract contracts with their contacts (tenants and guarantors) grouped by contract
  const getContractsWithContacts = () => {
    // Only include active or a_venir contracts
    const relevantContracts = contracts.filter(c =>
      c.status === 'actif' || c.status === 'a_venir'
    )

    return relevantContracts.map((contract) => {
      const tenants: Array<{
        id: string
        name: string
        email: string | null
        role: string
      }> = []
      const guarantors: Array<{
        id: string
        name: string
        email: string | null
        role: string
      }> = []

      if (contract.contacts && contract.contacts.length > 0) {
        contract.contacts.forEach((contactEntry) => {
          const contactInfo = {
            id: contactEntry.user?.id || contactEntry.user_id,
            name: contactEntry.user?.name || 'Inconnu',
            email: contactEntry.user?.email || null,
            role: contactEntry.role
          }

          if (contactEntry.role === 'locataire' || contactEntry.role === 'colocataire') {
            tenants.push(contactInfo)
          } else if (contactEntry.role === 'garant') {
            guarantors.push(contactInfo)
          }
        })
      }

      return {
        id: contract.id,
        title: contract.title,
        status: contract.status,
        startDate: contract.start_date,
        endDate: contract.end_date,
        tenants,
        guarantors
      }
    }).filter(c => c.tenants.length > 0 || c.guarantors.length > 0) // Only contracts with contacts
  }

  const contractsWithContacts = getContractsWithContacts()
  const hasContractContacts = contractsWithContacts.length > 0

  // Create mapping of user_id to lot_contact_id for deletion
  const lotContactIds: Record<string, string> = {}
  contacts.forEach((contact) => {
    lotContactIds[contact.user_id] = contact.id
  })

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye },
    { id: "contracts", label: "Contrats", icon: ScrollText, count: contracts.length },
    { id: "interventions", label: "Interventions", icon: Wrench, count: interventionStats.total },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "emails", label: "Emails", icon: Mail },
  ]

  // Prepare header data
  const headerBadges: DetailPageHeaderBadge[] = []

  // Add category badge
  headerBadges.push({
    label: getCategoryLabel(lot.category),
    icon: Home,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dotColor: 'bg-blue-500'
  })

  // Add occupancy badge
  if (isOccupied) {
    headerBadges.push({
      label: 'Occupé',
      color: 'bg-green-100 text-green-800 border-green-200',
      dotColor: 'bg-green-500'
    })
  } else {
    headerBadges.push({
      label: 'Libre',
      color: 'bg-muted text-foreground border-border',
      dotColor: 'bg-muted-foreground'
    })
  }

  // Build address text for header: prioritize lot's own address, fallback to building address
  const getAddressText = (): string | null => {
    // 1. First, use lot's formatted address if available
    if (lotAddress?.formatted_address) {
      return lotAddress.formatted_address
    }
    // 2. Fallback: use building address_record if lot belongs to a building
    const buildingRecord = lot.building?.address_record
    if (buildingRecord?.formatted_address) {
      return buildingRecord.formatted_address
    }
    if (buildingRecord?.street || buildingRecord?.city) {
      const parts = [buildingRecord.street, buildingRecord.postal_code, buildingRecord.city].filter(Boolean)
      return parts.join(', ')
    }
    return null
  }

  const addressText = getAddressText()

  const headerMetadata: DetailPageHeaderMetadata[] = [
    // Show building name only if lot belongs to a building
    lot.building && {
      icon: Building2,
      text: lot.building.name
    },
    // Show address (lot's own or building's)
    addressText && {
      icon: MapPin,
      text: addressText
    },
    lot.floor !== undefined && {
      icon: Info,
      text: `Étage ${lot.floor}`
    }
  ].filter(Boolean) as DetailPageHeaderMetadata[]

  const primaryActions: DetailPageHeaderAction[] = [
    {
      label: 'Modifier',
      icon: EditIcon,
      onClick: handleEdit,
      variant: 'outline'
    },
    {
      label: 'Créer intervention',
      icon: Plus,
      onClick: () => handleCustomAction('add-intervention'),
      variant: 'default'
    }
  ]

  const dropdownActions: DetailPageHeaderAction[] = [
    {
      label: 'Archiver',
      icon: Archive,
      onClick: () => logger.info("Archive lot:", lot.id)
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: () => setShowDeleteModal(true)
    }
  ]

  return (
    <>
      {/* Unified Detail Page Header */}
      <DetailPageHeader
        onBack={handleBack}
        backButtonText="Retour"
        title={lot.reference}
        subtitle={lot.surface_area || lot.rooms ? `${lot.surface_area ? lot.surface_area + ' m²' : ''} ${lot.surface_area && lot.rooms ? '·' : ''} ${lot.rooms ? lot.rooms + ' pièces' : ''}`.trim() : undefined}
        badges={headerBadges}
        metadata={headerMetadata}
        primaryActions={primaryActions}
        dropdownActions={dropdownActions}
      />

      <div className="layout-padding h-full bg-muted flex flex-col overflow-hidden">
        {error && (
          <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}

      {/* Tabs Navigation */}
      <div className="content-max-width mx-auto w-full px-4 sm:px-6 lg:px-8 mt-0 mb-6">
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary bg-card"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <Badge variant="secondary" className="ml-1 text-xs bg-muted text-muted-foreground">
                      {tab.count}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Card Content */}
      <Card className="flex-1 flex flex-col content-max-width mx-auto w-full p-6 min-h-0 overflow-hidden">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="flex-1 flex flex-col min-h-0 pb-6">
        {activeTab === "overview" && (
          <div className="mt-0 flex-1 flex flex-col min-h-0 space-y-10">
            {/* Section 1: Description (if exists) */}
            {lot.description && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{lot.description}</p>
              </div>
            )}

            {/* Section 1.6: Map Preview (if coordinates available) */}
            {lotAddress && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localisation
                </h3>
                <GoogleMapsProvider>
                  <GoogleMapPreview
                    latitude={lotAddress.latitude}
                    longitude={lotAddress.longitude}
                    address={lotAddress.formatted_address || lot.building?.address || undefined}
                    height={250}
                    className="rounded-lg border border-border shadow-sm"
                    showOpenButton={true}
                  />
                </GoogleMapsProvider>
              </div>
            )}

            {/* Section 2: Contacts Preview - Grid Only (tenants hidden, they come from contracts) */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Contacts du lot</h3>
              <LotContactsGridPreview
                lotId={lot.id}
                lotReference={lot.reference}
                managers={managers}
                tenants={tenants}
                providers={providers}
                owners={owners}
                others={others}
                buildingManagers={buildingManagers}
                buildingTenants={buildingTenants}
                buildingProviders={buildingProviders}
                buildingOwners={buildingOwners}
                buildingOthers={buildingOthers}
                lotContactIds={lotContactIds}
                teamId={teamId}
                hideTenants={true}
              />
            </div>

            {/* Section 3: Contract Contacts - Grouped by Contract */}
            {hasContractContacts && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  Contacts liés aux contrats
                </h3>
                <div className="space-y-4">
                  {contractsWithContacts.map((contract) => (
                    <div
                      key={contract.id}
                      className="rounded-lg border border-border bg-card overflow-hidden"
                    >
                      {/* Contract Header */}
                      <div
                        className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/gestionnaire/contrats/${contract.id}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ScrollText className="h-4 w-4 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {contract.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(contract.startDate).toLocaleDateString('fr-FR')} → {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            contract.status === 'actif'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }
                        >
                          {contract.status === 'actif' ? 'Actif' : 'À venir'}
                        </Badge>
                      </div>

                      {/* Contract Contacts */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Tenants */}
                          {contract.tenants.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Locataires ({contract.tenants.length})
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {contract.tenants.map((contact, idx) => (
                                  <ContactCardCompact
                                    key={`${contact.id}-${idx}`}
                                    contact={{
                                      id: contact.id,
                                      name: contact.name,
                                      email: contact.email,
                                      phone: contact.phone,
                                      role: 'tenant'
                                    }}
                                    variant="inline"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Guarantors */}
                          {contract.guarantors.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-3.5 w-3.5 text-blue-600" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Garants ({contract.guarantors.length})
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {contract.guarantors.map((contact, idx) => (
                                  <ContactCardCompact
                                    key={`${contact.id}-${idx}`}
                                    contact={{
                                      id: contact.id,
                                      name: contact.name,
                                      email: contact.email,
                                      phone: contact.phone,
                                      role: 'other' // Garant n'est pas un rôle standard, utiliser 'other'
                                    }}
                                    variant="inline"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 px-1">
                  Ces contacts sont liés aux contrats actifs ou à venir de ce lot.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "contracts" && (
          <div className="flex-1 flex flex-col min-h-0">
            {contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ScrollText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Aucun contrat</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Aucun contrat n'a été créé pour ce lot.
                </p>
                <Button onClick={() => router.push(`/gestionnaire/contrats/nouveau?lotId=${lot.id}`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un contrat
                </Button>
              </div>
            ) : (
              <ContractsNavigator
                contracts={contracts}
                loading={false}
                className="border-0 shadow-none bg-transparent"
              />
            )}
          </div>
        )}

        {activeTab === "interventions" && (
          <div className="flex-1 flex flex-col min-h-0">
            <InterventionsNavigator
            interventions={interventions as any}
            userContext="gestionnaire"
            loading={false}
            emptyStateConfig={{
              title: "Aucune intervention",
              description: "Aucune intervention n'a été créée pour ce lot.",
              showCreateButton: true,
              createButtonText: "Créer une intervention",
              createButtonAction: () => router.push(`/gestionnaire/interventions/nouvelle-intervention?lotId=${lot.id}`)
            }}
            showStatusActions={true}
            searchPlaceholder="Rechercher par titre, description, ou lot..."
            showFilters={true}
            isEmbeddedInCard={true}
          />
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-foreground">Documents du lot</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents liés aux interventions réalisées dans ce lot
                </p>
              </div>
            </div>

            <DocumentsSection
              interventions={transformInterventionsForDocuments(interventionsWithDocs)}
              loading={false}
              emptyMessage="Aucun document trouvé"
              emptyDescription="Aucune intervention avec documents n'a été réalisée dans ce lot."
              onDocumentView={handleDocumentView}
              onDocumentDownload={handleDocumentDownload}
            />
          </div>
        )}

        {activeTab === "emails" && (
          <div className="flex-1 flex flex-col min-h-0">
            <EntityEmailsTab
              entityType="lot"
              entityId={lot.id}
              entityName={lot.reference || `Lot ${lot.apartment_number}`}
            />
          </div>
        )}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Confirmer la suppression"
          message="Êtes-vous sûr de vouloir supprimer ce lot ? Cette action supprimera également toutes les données associées (interventions, contacts, etc.)."
          itemName={lot?.reference}
          itemType="lot"
          isLoading={isDeleting}
          danger={true}
        />
      </div>
    </>
  )
}
