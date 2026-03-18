'use client'

import React, { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  EntityPreviewLayout,
  EntityTabs,
  TabContentWrapper,
  EntityActivityLog
} from '@/components/shared/entity-preview'
import type { TabConfig } from '@/components/shared/entity-preview'
import { Plus, Home, MapPin, Archive, Edit as EditIcon } from "lucide-react"
import { DocumentsSection } from "@/components/intervention/documents-section"
import { DetailPageHeader, type DetailPageHeaderBadge, type DetailPageHeaderMetadata, type DetailPageHeaderAction } from "@/components/ui/detail-page-header"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { logger } from '@/lib/logger'
import type { Building, Lot } from '@/lib/services'
// Stats badges removed from overview
import { ContactsGridPreview } from '@/components/ui/contacts-grid-preview'
import { BuildingLotsGrid } from '@/components/patrimoine/lot-card-unified'
import { EntityEmailsTab } from '@/components/emails/entity-emails-tab'
import { GoogleMapsProvider, GoogleMapPreview } from '@/components/google-maps'
import { PropertyDocumentsPanel } from '@/components/documents'
import { BUILDING_DOCUMENT_SLOTS } from '@/lib/constants/property-document-slots'
import { useSubscription } from '@/hooks/use-subscription'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { getAccessibleLots } from '@/app/actions/subscription-actions'
import { BuildingContractsTab } from '@/components/contracts/building-contracts-tab'
import type { SupplierContractWithRelations } from '@/lib/types/supplier-contract.types'

interface BuildingContact {
  id: string
  user_id: string
  is_primary: boolean
  user: {
    id: string
    name: string
    email: string
    phone?: string
    company?: string
    role: string
    provider_category?: string
    speciality?: string
  }
}

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
  rent_amount?: number | null
  charges_amount?: number | null
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

interface BuildingAddress {
  latitude: number
  longitude: number
  formatted_address: string | null
}

interface BuildingDetailsClientProps {
  building: Building
  lots: Lot[]
  interventions: unknown[]
  interventionsWithDocs: unknown[]
  buildingContacts: BuildingContact[]
  lotsWithContacts: LotWithContacts[]
  lotContactIdsMap: Record<string, { lotId: string; lotContactId: string; lotReference: string }>
  teamId: string
  buildingAddress?: BuildingAddress | null
  buildingSupplierContracts: SupplierContractWithRelations[]
  lotSupplierContractsByLotId: Record<string, SupplierContractWithRelations[]>
}

export default function BuildingDetailsClient({
  building,
  lots,
  interventions,
  interventionsWithDocs,
  buildingContacts,
  teamId,
  lotsWithContacts,
  lotContactIdsMap,
  buildingAddress,
  buildingSupplierContracts,
  lotSupplierContractsByLotId
}: BuildingDetailsClientProps) {
  const [activeTab, setActiveTab] = useState("general")
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read expandLot param from URL (for return navigation from contract edit)
  const expandLotId = searchParams.get('expandLot')

  const [error, setError] = useState<string | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const { canAddProperty, loading: subscriptionLoading, status: subscriptionStatus, refresh: refreshSubscription } = useSubscription()

  // Accessible lot IDs for subscription restriction
  const [accessibleLotIds, setAccessibleLotIds] = useState<string[] | null>(null)

  useEffect(() => {
    getAccessibleLots().then(result => {
      if (result.success) setAccessibleLotIds(result.data ?? null)
    }).catch(() => setAccessibleLotIds(null))
  }, [])

  const lockedLotIds = useMemo(() => {
    if (!accessibleLotIds) return null
    const accessibleSet = new Set(accessibleLotIds)
    const allLotIds = lotsWithContacts.map(l => l.id)
    const locked = allLotIds.filter(id => !accessibleSet.has(id))
    return locked.length > 0 ? new Set(locked) : null
  }, [accessibleLotIds, lotsWithContacts])



  // Calculate statistics
  const getStats = () => {
    const totalLots = lots.length
    const occupiedLots = lots.filter(lot => (lot as { is_occupied?: boolean }).is_occupied).length
    const vacantLots = totalLots - occupiedLots
    const occupancyRate = totalLots > 0 ? Math.round((occupiedLots / totalLots) * 100) : 0

    const totalInterventions = interventions.length
    const activeInterventions = interventions.filter((i: { status: string }) =>
      i.status === 'pending' || i.status === 'in_progress' || i.status === 'assigned'
    ).length

    const interventionStats = {
      total: totalInterventions,
      pending: interventions.filter((i: { status: string }) => i.status === 'pending').length,
      inProgress: interventions.filter((i: { status: string }) =>
        i.status === 'in_progress' || i.status === 'assigned'
      ).length,
      completed: interventions.filter((i: { status: string }) => i.status === 'completed').length
    }

    return {
      totalLots,
      occupiedLots,
      vacantLots,
      occupancyRate,
      totalInterventions,
      activeInterventions,
      interventionStats
    }
  }

  const handleBack = () => {
    router.push('/gestionnaire/biens')
  }

  const handleEdit = () => {
    router.push(`/gestionnaire/biens/immeubles/modifier/${building.id}`)
  }

  const handleCustomAction = (actionKey: string) => {
    switch (actionKey) {
      case "add-intervention":
        router.push(`/gestionnaire/interventions/nouvelle-intervention?buildingId=${building.id}`)
        break
      case "add-lot":
        if (!subscriptionLoading && !canAddProperty) {
          setUpgradeModalOpen(true)
          return
        }
        router.push(`/gestionnaire/biens/lots/nouveau?buildingId=${building.id}`)
        break
      default:
        logger.info("Action not implemented:", actionKey)
    }
  }

  // Transform interventions data for documents component
  const transformInterventionsForDocuments = (interventionsData: unknown[]) => {
    return interventionsData.map((intervention: {
      id: string
      reference?: string
      title: string
      type: string
      status: string
      completed_at?: string
      assigned_contact?: { name: string }
      documents?: Array<{
        id: string
        original_filename?: string
        filename: string
        file_size: number
        mime_type: string
        uploaded_at: string
      }>
    }) => ({
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
      documents: intervention.documents?.map((doc) => ({
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
    })).filter((intervention: { documents: unknown[] }) => intervention.documents.length > 0)
  }

  const handleDocumentView = (document: unknown) => {
    logger.info('Viewing document:', document)
  }

  const handleDocumentDownload = (document: unknown) => {
    logger.info('Downloading document:', document)
  }

  const stats = getStats()

  // Transform building contacts by role + Create buildingContactIds map
  const buildingManagers = buildingContacts
    .filter(bc => bc.user.role === 'gestionnaire' || bc.user.role === 'admin')
    .map(bc => ({
      id: bc.user.id,
      name: bc.user.name,
      email: bc.user.email,
      phone: bc.user.phone,
      company: bc.user.company,
      type: 'manager'
    }))

  const buildingTenants = buildingContacts
    .filter(bc => bc.user.role === 'locataire')
    .map(bc => ({
      id: bc.user.id,
      name: bc.user.name,
      email: bc.user.email,
      phone: bc.user.phone,
      company: bc.user.company,
      type: 'tenant'
    }))

  const buildingContactIds: Record<string, string> = {}

  buildingContacts.forEach(bc => {
    buildingContactIds[bc.user.id] = bc.id // Map user_id to building_contact_id for deletion
  })

  const providers = buildingContacts
    .filter(bc => bc.user.role === 'prestataire')
    .map(bc => ({
      id: bc.user.id,
      name: bc.user.name,
      email: bc.user.email,
      phone: bc.user.phone,
      company: bc.user.company,
      type: 'provider',
      speciality: bc.user.speciality || bc.user.provider_category
    }))
  const others = buildingContacts
    .filter(bc => bc.user.role !== 'prestataire' && bc.user.role !== 'locataire' && bc.user.role !== 'gestionnaire' && bc.user.role !== 'admin')
    .map(bc => ({
      id: bc.user.id,
      name: bc.user.name,
      email: bc.user.email,
      phone: bc.user.phone,
      company: bc.user.company,
      type: 'other'
    }))

  // Build merged lots with all contracts + total count for the Contracts tab
  const { mergedLotsWithAllContracts, totalContractsCount } = useMemo(() => {
    let count = buildingSupplierContracts.length
    const merged = lotsWithContacts.map(lot => {
      const leases = (lot.contracts || []).map(c => ({
        ...c,
        lot: { id: lot.id, reference: lot.reference },
      }))
      const suppliers = lotSupplierContractsByLotId[lot.id] || []
      count += leases.length + suppliers.length
      return {
        lotId: lot.id,
        lotReference: lot.reference,
        leaseContracts: leases,
        supplierContracts: suppliers,
      }
    })
    return { mergedLotsWithAllContracts: merged, totalContractsCount: count }
  }, [lotsWithContacts, lotSupplierContractsByLotId, buildingSupplierContracts.length])

  // Tabs configuration for EntityTabs
  const buildingTabs: TabConfig[] = [
    { value: "general", label: "Général" },
    { value: "contacts", label: "Contacts" },
    { value: "contracts", label: "Contrats", count: totalContractsCount },
    { value: "interventions", label: "Interventions", count: stats.totalInterventions },
    { value: "documents", label: "Documents" },
    { value: "emails", label: "Emails" },
    { value: "activity", label: "Activité" }
  ]

  // Prepare header data
  const headerBadges: DetailPageHeaderBadge[] = []

  // Add occupancy badge if there are lots
  if (stats.totalLots > 0) {
    const occupancyRate = stats.occupancyRate
    const badgeColor = occupancyRate >= 80
      ? 'bg-green-100 text-green-800 border-green-200'
      : occupancyRate >= 50
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-red-100 text-red-800 border-red-200'

    headerBadges.push({
      label: `${stats.occupiedLots}/${stats.totalLots} lots occupés`,
      color: badgeColor,
      dotColor: occupancyRate >= 80 ? 'bg-green-500' : occupancyRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
    })
  }

  // Get address text from address_record
  const getAddressText = () => {
    const record = building.address_record
    if (record?.formatted_address) return record.formatted_address
    if (record?.street || record?.city) {
      const parts = [record.street, record.postal_code, record.city].filter(Boolean)
      return parts.join(', ')
    }
    return null
  }
  const addressText = getAddressText()

  const headerMetadata: DetailPageHeaderMetadata[] = []

  const primaryActions: DetailPageHeaderAction[] = [
    {
      label: 'Créer intervention',
      icon: Plus,
      onClick: () => handleCustomAction('add-intervention'),
      variant: 'default'
    }
  ]

  const dropdownActions: DetailPageHeaderAction[] = [
    {
      label: 'Modifier',
      icon: EditIcon,
      onClick: handleEdit,
      variant: 'default'
    },
    {
      label: 'Ajouter lot',
      icon: Home,
      onClick: () => handleCustomAction('add-lot'),
      variant: 'default'
    },
    {
      label: 'Archiver',
      icon: Archive,
      onClick: () => logger.info("Archive building:", building.id)
    }
  ]

  return (
    <>
      {/* Unified Detail Page Header */}
      <DetailPageHeader
        onBack={handleBack}
        backButtonText="Retour"
        title={building.name}
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

      {/* Main Content with EntityPreviewLayout */}
      <div className="content-max-width mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 flex-1 flex flex-col min-h-0 pb-6">
        <EntityPreviewLayout>
          <EntityTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={buildingTabs}
          >
            {/* Général Tab — Localisation + Lots */}
            <TabContentWrapper value="general">
              <div className="space-y-4">
                {/* Localisation Card */}
                {(buildingAddress || (building as { description?: string }).description) && (
                  <div className="bg-card rounded-lg border p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Localisation
                    </h3>
                    {addressText && (
                      <p className="text-sm text-muted-foreground mt-1">{addressText}</p>
                    )}
                    {(building as { description?: string }).description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                        {(building as { description: string }).description}
                      </p>
                    )}
                    {buildingAddress && (
                      <div className="mt-3">
                        <GoogleMapsProvider>
                          <GoogleMapPreview
                            latitude={buildingAddress.latitude}
                            longitude={buildingAddress.longitude}
                            address={buildingAddress.formatted_address || addressText || undefined}
                            height={180}
                            showOpenButton={true}
                          />
                        </GoogleMapsProvider>
                      </div>
                    )}
                  </div>
                )}

                {/* Lots Card */}
                {lotsWithContacts.length > 0 && (
                  <div className="bg-card rounded-lg border p-4 sm:p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Lots ({lotsWithContacts.length})
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {stats.occupiedLots}/{stats.totalLots} occupés ({stats.occupancyRate}%)
                      </span>
                    </div>
                    <BuildingLotsGrid
                      buildingId={building.id}
                      lots={lotsWithContacts as any}
                      lotContactIdsMap={lotContactIdsMap}
                      teamId={teamId}
                      buildingManagers={buildingManagers}
                      buildingTenants={buildingTenants}
                      buildingProviders={providers}
                      buildingOthers={others}
                      lockedLotIds={lockedLotIds}
                      initialExpandAll={false}
                      readOnly={true}
                      className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    />
                  </div>
                )}
              </div>
            </TabContentWrapper>

            {/* Contacts Tab — Building contacts + Lots with contacts (interactive) */}
            <TabContentWrapper value="contacts">
              {/* Building-level contacts (interactive) */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Contacts de l&apos;immeuble</h3>
                <ContactsGridPreview
                  buildingId={building.id}
                  buildingName={building.name}
                  buildingManagers={buildingManagers}
                  providers={providers as any}
                  teamId={teamId}
                  others={others as any}
                  buildingContactIds={buildingContactIds}
                />
              </div>

              {/* Lots and their contacts (interactive, all expanded) */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-foreground">Lots et leurs contacts</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!subscriptionLoading && !canAddProperty) {
                        setUpgradeModalOpen(true)
                        return
                      }
                      router.push(`/gestionnaire/biens/lots/nouveau?buildingId=${building.id}`)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un lot
                  </Button>
                </div>
                <BuildingLotsGrid
                  buildingId={building.id}
                  lots={lotsWithContacts as any}
                  lotContactIdsMap={lotContactIdsMap}
                  teamId={teamId}
                  buildingManagers={buildingManagers}
                  buildingTenants={buildingTenants}
                  buildingProviders={providers}
                  buildingOthers={others}
                  initialExpandedLotId={expandLotId}
                  lockedLotIds={lockedLotIds}
                  initialExpandAll={false}
                  readOnly={false}
                />
              </div>
            </TabContentWrapper>

            {/* Contracts Tab */}
            <TabContentWrapper value="contracts">
              <BuildingContractsTab
                buildingId={building.id}
                buildingSupplierContracts={buildingSupplierContracts}
                lotsWithContracts={mergedLotsWithAllContracts}
              />
            </TabContentWrapper>

            {/* Interventions Tab */}
            <TabContentWrapper value="interventions">
              <InterventionsNavigator
                interventions={interventions as any}
                userContext="gestionnaire"
                loading={false}
                emptyStateConfig={{
                  title: "Aucune intervention",
                  description: "Aucune intervention n'a été créée pour cet immeuble.",
                  showCreateButton: true,
                  createButtonText: "Créer une intervention",
                  createButtonAction: () => router.push(`/gestionnaire/interventions/nouvelle-intervention?buildingId=${building.id}`)
                }}
                showStatusActions={true}
                searchPlaceholder="Rechercher par titre, description, ou lot..."
                showFilters={true}
                isEmbeddedInCard={true}
              />
            </TabContentWrapper>

            {/* Documents Tab */}
            <TabContentWrapper value="documents">
              <div className="space-y-6">
                {/* Property documents (PEB, ascenseur, amiante, etc.) */}
                <PropertyDocumentsPanel
                  entityType="building"
                  entityId={building.id}
                  teamId={teamId}
                  slotConfigs={BUILDING_DOCUMENT_SLOTS}
                />

                {/* Intervention documents */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-medium text-foreground">Documents d&apos;intervention</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Documents liés aux interventions réalisées dans cet immeuble
                      </p>
                    </div>
                  </div>

                  <DocumentsSection
                    interventions={transformInterventionsForDocuments(interventionsWithDocs)}
                    loading={false}
                    emptyMessage="Aucun document trouvé"
                    emptyDescription="Aucune intervention avec documents n'a été réalisée dans cet immeuble."
                    onDocumentView={handleDocumentView}
                    onDocumentDownload={handleDocumentDownload}
                  />
                </div>
              </div>
            </TabContentWrapper>

            {/* Emails Tab */}
            <TabContentWrapper value="emails">
              <EntityEmailsTab
                entityType="building"
                entityId={building.id}
                entityName={building.name}
              />
            </TabContentWrapper>

            {/* Activity Tab */}
            <TabContentWrapper value="activity">
              <EntityActivityLog
                entityType="building"
                entityId={building.id}
                teamId={teamId}
                includeRelated={true}
                emptyMessage="Aucune activité enregistrée pour cet immeuble"
              />
            </TabContentWrapper>
          </EntityTabs>
        </EntityPreviewLayout>
      </div>
      </div>
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentLots={subscriptionStatus?.actual_lots ?? 0}
        subscribedLots={subscriptionStatus?.subscribed_lots}
        onUpgradeComplete={() => {
          setUpgradeModalOpen(false)
          refreshSubscription()
        }}
      />
    </>
  )
}
