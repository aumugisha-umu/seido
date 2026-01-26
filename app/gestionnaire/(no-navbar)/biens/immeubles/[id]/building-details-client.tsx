'use client'

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Eye, FileText, Wrench, Plus, Home, Info, Building2, MapPin, Calendar, User, Archive, Edit as EditIcon, Mail } from "lucide-react"
import { DocumentsSection } from "@/components/intervention/documents-section"
import { DetailPageHeader, type DetailPageHeaderBadge, type DetailPageHeaderMetadata, type DetailPageHeaderAction } from "@/components/ui/detail-page-header"
import { BuildingContactsNavigator } from "@/components/contacts/building-contacts-navigator"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { logger } from '@/lib/logger'
import type { Building, Lot } from '@/lib/services'
import { BuildingStatsBadges } from './building-stats-badges'
import { ContactsGridPreview } from '@/components/ui/contacts-grid-preview'
import { BuildingLotsGrid } from '@/components/patrimoine/lot-card-unified'
import { EntityEmailsTab } from '@/components/emails/entity-emails-tab'

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

interface BuildingDetailsClientProps {
  building: Building
  lots: Lot[]
  interventions: unknown[]
  interventionsWithDocs: unknown[]
  buildingContacts: BuildingContact[]
  lotsWithContacts: LotWithContacts[]
  lotContactIdsMap: Record<string, { lotId: string; lotContactId: string; lotReference: string }>
  teamId: string
}

export default function BuildingDetailsClient({
  building,
  lots,
  interventions,
  interventionsWithDocs,
  buildingContacts,
  teamId,
  lotsWithContacts,
  lotContactIdsMap
}: BuildingDetailsClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read expandLot param from URL (for return navigation from contract edit)
  const expandLotId = searchParams.get('expandLot')

  const [error, setError] = useState<string | null>(null)

  // Contacts count state
  const [totalContacts, setTotalContacts] = useState<number>(0)

  // Dynamic height for lots section
  const [lotsSectionHeight, setLotsSectionHeight] = useState(400) // Default height
  const lotsSectionContainerRef = useRef<HTMLDivElement>(null)
  const lotsSectionHeaderRef = useRef<HTMLDivElement>(null)


  // Calculate dynamic height for lots section based on available space
  useEffect(() => {
    // Only calculate when overview tab is active
    if (activeTab !== 'overview') return

    const calculateHeight = () => {
      if (lotsSectionContainerRef.current && lotsSectionHeaderRef.current) {
        const containerRect = lotsSectionContainerRef.current.getBoundingClientRect()
        const headerRect = lotsSectionHeaderRef.current.getBoundingClientRect()
        
        // Check if we're on mobile/tablette (viewport width < 1024px)
        const isMobileOrTablet = window.innerWidth < 1024
        
        if (isMobileOrTablet) {
          // On mobile/tablette, use a fixed minimum height that ensures visibility
          // Calculate based on viewport height with a reasonable minimum
          const viewportHeight = window.innerHeight
          const minHeight = Math.max(viewportHeight * 0.3, 300) // At least 30% of viewport or 300px
          setLotsSectionHeight(minHeight)
        } else {
          // On desktop, use the dynamic calculation
          const availableHeight = window.innerHeight - containerRect.top - 40
          const headerHeight = headerRect.height
          const newHeight = Math.max(availableHeight - headerHeight, 200)
          setLotsSectionHeight(newHeight)
        }
      }
    }

    // Calculate on mount and window resize
    calculateHeight()
    window.addEventListener('resize', calculateHeight)

    // Recalculate after a short delay (for layout shifts)
    const timer = setTimeout(calculateHeight, 100)
    const timer2 = setTimeout(calculateHeight, 500) // Additional delay for mobile

    return () => {
      window.removeEventListener('resize', calculateHeight)
      clearTimeout(timer)
      clearTimeout(timer2)
    }
  }, [activeTab]) // Recalculate when tab changes

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

  // Calculate total unique contacts (building + lots)
  const allContactIds = new Set<string>()

  // Add building contacts
  buildingContacts.forEach(bc => allContactIds.add(bc.user.id))

  // Add lot contacts (structure: { user: { id, name, email, ... }, is_primary })
  lotsWithContacts.forEach(lot => {
    lot.lot_contacts?.forEach((lc: any) => {
      if (lc.user?.id) allContactIds.add(lc.user.id)
    })
  })

  const totalUniqueContacts = allContactIds.size

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
  const owners = buildingContacts
    .filter(bc => bc.user.role === 'proprietaire')
    .map(bc => ({
      id: bc.user.id,
      name: bc.user.name,
      email: bc.user.email,
      phone: bc.user.phone,
      company: bc.user.company,
      type: 'owner'
    }))
  const others = buildingContacts
    .filter(bc => bc.user.role !== 'prestataire' && bc.user.role !== 'proprietaire' && bc.user.role !== 'locataire' && bc.user.role !== 'gestionnaire' && bc.user.role !== 'admin')
    .map(bc => ({
      id: bc.user.id,
      name: bc.user.name,
      email: bc.user.email,
      phone: bc.user.phone,
      company: bc.user.company,
      type: 'other'
    }))

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye, count: null },
    { id: "interventions", label: "Interventions", icon: Wrench, count: stats.totalInterventions },
    { id: "documents", label: "Documents", icon: FileText, count: null },
    { id: "emails", label: "Emails", icon: Mail, count: null },
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

  const headerMetadata: DetailPageHeaderMetadata[] = [
    building.address && {
      icon: MapPin,
      text: `${building.address}, ${building.city || ''}`
    }
  ].filter(Boolean) as DetailPageHeaderMetadata[]

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

      {/* Tabs Navigation */}
      <div className="content-max-width mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border">
            <TabsList className="inline-flex h-auto p-0 bg-transparent w-full justify-start">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center space-x-2 px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent hover:text-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {tab.count !== null && (
                      <Badge variant="secondary" className="ml-1 text-xs bg-muted text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        {tab.count}
                      </Badge>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Card Content */}
      <Card className="flex-1 flex flex-col content-max-width mx-auto w-full p-6 min-h-0 overflow-hidden">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col min-h-0 pb-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 flex-1 flex flex-col min-h-0 space-y-6 md:space-y-10">
              {/* Section 1: Stats Badges */}
              <BuildingStatsBadges
                stats={{
                  totalInterventions: stats.totalInterventions,
                  activeInterventions: stats.activeInterventions,
                  completedInterventions: stats.interventionStats.completed
                }}
                totalContacts={totalUniqueContacts}
              />

              {/* Section 1.5: Description (if exists) */}
              {(building as { description?: string }).description && (
                <div className="bg-secondary/50 border border-secondary rounded-lg p-3 flex items-start gap-2 dark:bg-secondary/20">
                  <Info className="h-4 w-4 text-secondary-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{(building as { description: string }).description}</p>
                </div>
              )}

              {/* Section 2: Contacts Preview - Grid Only */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Contacts de l'immeuble</h3>
                <ContactsGridPreview
                  buildingId={building.id}
                  buildingName={building.name}
                  buildingManagers={buildingManagers}
                  providers={providers as any}
                  owners={owners as any}
                  teamId={teamId}
                  others={others as any}
                  buildingContactIds={buildingContactIds}
                />
              </div>

              {/* Section 3: Lots avec Contacts - Scrollable */}
              <div className="flex flex-col min-h-[300px] flex-1" ref={lotsSectionContainerRef}>
                {/* Header avec titre et bouton d'ajout */}
                <div ref={lotsSectionHeaderRef} className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-foreground">Lots et leurs contacts</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/gestionnaire/biens/lots/nouveau?buildingId=${building.id}`)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un lot
                  </Button>
                </div>
                {/* Scrollable container for lots */}
                <div 
                  className="overflow-y-auto flex-1 min-h-0"
                  style={{
                    maxHeight: `${lotsSectionHeight}px`,
                    minHeight: '200px'
                  }}
                >
                  <BuildingLotsGrid
                    buildingId={building.id}
                    lots={lotsWithContacts as any}
                    lotContactIdsMap={lotContactIdsMap}
                    teamId={teamId}
                    buildingManagers={buildingManagers}
                    buildingTenants={buildingTenants}
                    buildingProviders={providers}
                    buildingOwners={owners}
                    buildingOthers={others}
                    initialExpandedLotId={expandLotId}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Interventions Tab */}
            <TabsContent value="interventions" className="mt-0 flex-1 flex flex-col min-h-0">
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
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0 flex-1 flex flex-col min-h-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-foreground">Documents de l'immeuble</h2>
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
            </TabsContent>

            {/* Emails Tab */}
            <TabsContent value="emails" className="mt-0 flex-1 flex flex-col min-h-0">
              <EntityEmailsTab
                entityType="building"
                entityId={building.id}
                entityName={building.name}
              />
            </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
