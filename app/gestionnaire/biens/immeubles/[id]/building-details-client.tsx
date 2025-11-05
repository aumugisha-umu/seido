'use client'

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Eye, FileText, Wrench, Users, Plus, Search, Filter, Home } from "lucide-react"
import LotCard from "@/components/lot-card"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { DocumentsSection } from "@/components/intervention/documents-section"
import { PropertyDetailHeader } from "@/components/property-detail-header"
import { BuildingContactsTab } from "@/components/building-contacts-tab"
import { logger } from '@/lib/logger'
import { deleteBuildingAction } from './actions'
import type { Building, Lot } from '@/lib/services'

interface BuildingDetailsClientProps {
  building: Building
  lots: Lot[]
  interventions: unknown[]
  interventionsWithDocs: unknown[]
}

export default function BuildingDetailsClient({
  building,
  lots,
  interventions,
  interventionsWithDocs
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

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye, count: null },
    { id: "lots", label: "Lots", icon: Home, count: stats.totalLots },
    { id: "interventions", label: "Interventions", icon: Wrench, count: stats.totalInterventions },
    { id: "contacts", label: "Contacts", icon: Users, count: totalContacts },
    { id: "documents", label: "Documents", icon: FileText, count: null },
  ]

  return (
    <div className="layout-padding min-h-screen bg-slate-50">
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
      <div className="content-max-width px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-100">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center space-x-2 text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.count !== null && (
                    <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-700 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <div className="py-8">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* General Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informations Générales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Adresse</span>
                      <span className="font-medium">{building.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ville</span>
                      <span className="font-medium">{building.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Code postal</span>
                      <span className="font-medium">{building.postal_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pays</span>
                      <span className="font-medium">{(building as { country?: string }).country || "Non spécifié"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gestionnaire</span>
                      <span className="font-medium">
                        {(building as { manager?: { name: string } }).manager?.name || "Non défini"}
                      </span>
                    </div>
                    {(building as { description?: string }).description && (
                      <div className="pt-2 border-t">
                        <span className="text-gray-600 text-sm">Description</span>
                        <p className="text-sm font-medium mt-1">
                          {(building as { description: string }).description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Occupation Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques d'Occupation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nombre de lots</span>
                      <span className="font-medium">{stats.totalLots}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lots occupés</span>
                      <span className="font-medium text-green-600">{stats.occupiedLots}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lots vacants</span>
                      <span className="font-medium text-red-600">{stats.vacantLots}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux d'occupation</span>
                      <span className="font-medium">
                        <Badge variant={stats.occupancyRate >= 80 ? "default" : stats.occupancyRate >= 50 ? "secondary" : "destructive"}>
                          {stats.occupancyRate}%
                        </Badge>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Locataires uniques</span>
                      <span className="font-medium">
                        {lots.filter((lot: { tenant?: { id: string } }) => lot.tenant)
                          .map((lot: { tenant: { id: string } }) => lot.tenant.id)
                          .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index)
                          .length}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activité</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interventions totales</span>
                      <span className="font-medium">{stats.totalInterventions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interventions actives</span>
                      <span className="font-medium text-orange-600">{stats.activeInterventions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interventions terminées</span>
                      <span className="font-medium text-green-600">{stats.interventionStats.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Créé le</span>
                      <span className="font-medium text-sm">
                        {new Date(building.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Interventions Tab */}
            <TabsContent value="interventions" className="mt-0">
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-blue-600">{stats.interventionStats.total}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-orange-600">{stats.interventionStats.pending}</div>
                      <div className="text-sm text-gray-600">En attente</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-yellow-600">{stats.interventionStats.inProgress}</div>
                      <div className="text-sm text-gray-600">En cours</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">{stats.interventionStats.completed}</div>
                      <div className="text-sm text-gray-600">Terminées</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interventions Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <Wrench className="h-5 w-5 mr-2 text-gray-400" />
                    Interventions ({interventions.length})
                  </h2>
                  <Button onClick={() => router.push(`/gestionnaire/interventions/nouvelle-intervention?buildingId=${building.id}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une intervention
                  </Button>
                </div>

                {interventions.length > 0 ? (
                  <>
                    {/* Search and Filter */}
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 relative">
                        <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                        <Input placeholder="Rechercher par titre, description, ou lot..." className="pl-10" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <Select defaultValue="all">
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="in_progress">En cours</SelectItem>
                            <SelectItem value="completed">Terminées</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Interventions List */}
                    <div className="space-y-4">
                      {interventions.map((intervention: {
                        id: string
                        title: string
                        status: string
                        description: string
                        reference: string
                        lot?: { reference: string }
                        assigned_contact?: { name: string }
                      }) => (
                        <Card key={intervention.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-medium text-gray-900">{intervention.title}</h3>
                                  <Badge variant={
                                    intervention.status === 'completed' ? 'default' :
                                    intervention.status === 'in_progress' ? 'secondary' :
                                    'destructive'
                                  }>
                                    {intervention.status === 'completed' ? 'Terminée' :
                                     intervention.status === 'in_progress' ? 'En cours' :
                                     intervention.status === 'assigned' ? 'Assignée' :
                                     'En attente'}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 text-sm mb-3">{intervention.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Lot: {intervention.lot?.reference}</span>
                                  <span>Référence: {intervention.reference}</span>
                                  {intervention.assigned_contact && (
                                    <span>Contact: {intervention.assigned_contact.name}</span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/gestionnaire/interventions/${intervention.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Voir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Empty State */
                  <div className="text-center py-12">
                    <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune intervention</h3>
                    <p className="text-gray-600 mb-4">Aucune intervention n'a été créée pour cet immeuble.</p>
                    <Button onClick={() => router.push(`/gestionnaire/interventions/nouvelle-intervention?buildingId=${building.id}`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer la première intervention
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Lots Tab */}
            <TabsContent value="lots" className="mt-0">
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

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="mt-0">
              <BuildingContactsTab
                buildingId={building.id}
                buildingName={building.name}
                teamId={building.team_id}
                lots={lots}
                onContactsUpdate={() => {
                  logger.info("Contacts updated - refreshing...")
                  router.refresh()
                }}
                onContactsCountUpdate={(count) => setTotalContacts(count)}
              />
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0">
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
      </div>

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
