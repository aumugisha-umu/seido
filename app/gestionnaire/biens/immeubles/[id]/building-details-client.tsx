'use client'

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Eye, FileText, Wrench, Users, Plus, Home } from "lucide-react"
import LotCard from "@/components/lot-card"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { DocumentsSection } from "@/components/intervention/documents-section"
import { PropertyDetailHeader } from "@/components/property-detail-header"
import { BuildingContactsNavigator } from "@/components/contacts/building-contacts-navigator"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { logger } from '@/lib/logger'
import { deleteBuildingAction } from './actions'
import type { Building, Lot } from '@/lib/services'
import { BuildingStatsBadges } from './building-stats-badges'
import { ContactsGridPreview } from '@/components/ui/contacts-grid-preview'
import { LotsWithContactsPreview } from '@/components/ui/lots-with-contacts-preview'

interface BuildingContact {
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

interface BuildingDetailsClientProps {
  building: Building
  lots: Lot[]
  interventions: unknown[]
  interventionsWithDocs: unknown[]
  buildingContacts: BuildingContact[]
  lotsWithContacts: LotWithContacts[]
  teamId: string
}

export default function BuildingDetailsClient({
  building,
  lots,
  interventions,
  interventionsWithDocs,
  buildingContacts,
  teamId,
  lotsWithContacts
}: BuildingDetailsClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()
  const searchParams = useSearchParams()

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Contacts count state
  const [totalContacts, setTotalContacts] = useState<number>(0)

  // Switch to lots tab if lot param is present
  useEffect(() => {
    const lotParam = searchParams.get('lot')
    if (lotParam) {
      setActiveTab("lots")
    }
  }, [searchParams])

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

  const confirmDelete = async () => {
    if (!building?.id) return

    try {
      setIsDeleting(true)
      logger.info("🗑️ Deleting building:", building.id)

      const deleteResult = await deleteBuildingAction(building.id)

      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || 'Failed to delete building')
      }

      // Redirect to buildings list after successful deletion
      router.push('/gestionnaire/biens')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error("❌ Error deleting building:", errorMessage)
      setError(`Erreur lors de la suppression de l'immeuble: ${errorMessage}`)
      setIsDeleting(false)
      setShowDeleteModal(false)
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
    .filter(bc => bc.user.role === 'gestionnaire')
    .map(bc => ({
      id: bc.user.id,
      name: bc.user.name,
      email: bc.user.email,
      phone: bc.user.phone,
      type: 'manager'
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
      type: 'owner'
    }))
  const others = buildingContacts
    .filter(bc => bc.user.role !== 'prestataire' && bc.user.role !== 'proprietaire' && bc.user.role !== 'locataire')
    .map(bc => ({
      id: bc.user.id,
      name: bc.user.name,
      email: bc.user.email,
      phone: bc.user.phone,
      type: 'other'
    }))

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye, count: null },
    { id: "lots", label: "Lots", icon: Home, count: stats.totalLots },
    { id: "interventions", label: "Interventions", icon: Wrench, count: stats.totalInterventions },
    { id: "documents", label: "Documents", icon: FileText, count: null },
  ]

  return (
    <div className="layout-padding h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <PropertyDetailHeader
        property={{
          id: building.id,
          title: building.name,
          name: building.name,
          createdAt: building.created_at,
          createdBy: (building as { manager?: { name: string } }).manager?.name,
          address: building.address,
          city: building.city,
          totalLots: stats.totalLots,
          occupiedLots: stats.occupiedLots,
          occupancyRate: stats.occupancyRate,
        }}
        type="building"
        onBack={handleBack}
        onEdit={handleEdit}
        customActions={[
          { key: "add-intervention", label: "Créer une intervention", icon: Plus, onClick: () => handleCustomAction("add-intervention") },
          { key: "add-lot", label: "Ajouter un lot", icon: Home, onClick: () => handleCustomAction("add-lot") },
        ]}
        onArchive={() => logger.info("Archive building:", building.id)}
      />

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
          <div className="border-b border-slate-200">
            <TabsList className="inline-flex h-auto p-0 bg-transparent w-full justify-start">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center space-x-2 px-4 py-3 text-sm font-medium text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-sky-600 rounded-none border-b-2 border-transparent hover:text-slate-900 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {tab.count !== null && (
                      <Badge variant="secondary" className="ml-1 text-xs bg-slate-100 text-slate-600 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-700">
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
      <Card className="flex-1 flex flex-col content-max-width mx-auto w-full px-4 sm:px-6 lg:px-8">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 flex-1 flex flex-col min-h-0 space-y-6 pt-6">
              {/* Section 1: Stats Badges */}
              <BuildingStatsBadges
                stats={{
                  totalInterventions: stats.totalInterventions,
                  activeInterventions: stats.activeInterventions,
                  completedInterventions: stats.interventionStats.completed
                }}
                totalContacts={totalUniqueContacts}
              />

              {/* Section 2: Contacts Preview - Grid Only */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">Contacts de l'immeuble</h3>
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

              {/* Section 3: Lots avec Contacts - Collapsible Cards */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">Lots et leurs contacts</h3>
                <LotsWithContactsPreview
                  buildingId={building.id}
                  lots={lotsWithContacts as any}
                  teamId={teamId}
                />
              </div>

              {/* Description (if exists) */}
              {(building as { description?: string }).description && (
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{(building as { description: string }).description}</p>
                  </CardContent>
                </Card>
              )}
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

            {/* Lots Tab */}
            <TabsContent value="lots" className="mt-0 flex-1 flex flex-col min-h-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Liste des Lots ({lots.length})</h2>
                  <Button onClick={() => router.push('/gestionnaire/biens/lots/nouveau')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un lot
                  </Button>
                </div>

                {lots.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lots.map((lot) => (
                      <LotCard
                        key={lot.id}
                        lot={lot}
                        interventions={interventions}
                        mode="view"
                        showBuilding={false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun lot</h3>
                    <p className="text-gray-600 mb-4">Cet immeuble n'a pas encore de lots définis.</p>
                    <Button onClick={() => router.push('/gestionnaire/biens/lots/nouveau')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer le premier lot
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0 flex-1 flex flex-col min-h-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Documents de l'immeuble</h2>
                    <p className="text-sm text-gray-600 mt-1">
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
              </div>
            </Tabs>
          </CardContent>
        </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cet immeuble ? Cette action supprimera également tous les lots associés et leurs données."
        itemName={building?.name}
        itemType="immeuble"
        isLoading={isDeleting}
        danger={true}
      />
    </div>
  )
}
