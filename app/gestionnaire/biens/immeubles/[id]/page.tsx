"use client"

import React, { useState, useEffect, use } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Eye, FileText, Wrench, Users, Plus, Search, Filter, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { createContactService, createBuildingService, createLotService, createInterventionService } from '@/lib/services'

import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import LotCard from "@/components/lot-card"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { DocumentsSection } from "@/components/intervention/documents-section"
import { PropertyDetailHeader } from "@/components/property-detail-header"
import { logger, logError } from '@/lib/logger'
export default function BuildingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const { user } = useAuth()

  // State pour les donnees
  const [building, setBuilding] = useState<any>(null)
  const [lots, setLots] = useState<unknown[]>([])
  const [interventions, setInterventions] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Effet pour basculer automatiquement sur l'onglet lots si parametre present
  useEffect(() => {
    const lotParam = searchParams.get('lot')
    if (lotParam) {
      setActiveTab("lots")
    }
  }, [searchParams])

  // Charger les donnees de l'immeuble
  useEffect(() => {
    if (resolvedParams.id && user?.id) {
      loadBuildingData()
    }
  }, [resolvedParams.id, user?.id])

  const loadBuildingData = async () => {
    try {
      setLoading(true)
      setError(null)
      logger.info("🏢 Loading building data for ID:", resolvedParams.id)

      // Initialize services
      const buildingService = createBuildingService()
      const lotService = createLotService()
      const interventionService = createInterventionService()

      // 1. Charger les donnees de l'immeuble
      const buildingResult = await buildingService.getById(resolvedParams.id)
      if (!buildingResult.success) {
        throw new Error(buildingResult.error?.message || 'Failed to load building')
      }
      logger.info("🏢 Building loaded:", buildingResult.data)
      setBuilding(buildingResult.data)

      // 2. Charger les lots de l'immeuble
      const lotsResult = await lotService.getByBuilding(resolvedParams.id)
      if (!lotsResult.success) {
        throw new Error(lotsResult.error?.message || 'Failed to load lots')
      }
      logger.info("🏠 Lots loaded:", lotsResult.data?.length || 0)
      setLots(lotsResult.data || [])

      // 3. Charger les interventions des lots (OPTIMIZED: parallel queries with Promise.allSettled)
      if (lotsResult.data && lotsResult.data.length > 0) {
        const lotIds = lotsResult.data.map(lot => lot.id)
        const allInterventions = []

        // ⚡ PERFORMANCE: Load all interventions in parallel instead of sequential loop
        // This provides 4-5x speedup for buildings with multiple lots
        const interventionResults = await Promise.allSettled(
          lotIds.map(lotId => interventionService.getByLot(lotId))
        )

        interventionResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success && result.value.data) {
            allInterventions.push(...result.value.data)
          } else if (result.status === 'rejected') {
            logger.warn(`⚠️ Could not load interventions for lot ${lotIds[index]}:`, result.reason?.message || result.reason)
          } else if (result.status === 'fulfilled' && !result.value.success) {
            logger.warn(`⚠️ Failed to load interventions for lot ${lotIds[index]}:`, result.value.error?.message)
          }
        })

        logger.info("🔧 Interventions loaded:", allInterventions.length)
        setInterventions(allInterventions)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorDetails = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { raw: error }
      logger.error("❌ Error loading building data:", { errorMessage, errorDetails })
      setError(`Erreur lors du chargement des données de l'immeuble: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Calculer les statistiques
  const getStats = () => {
    if (!building || !lots) {
      return {
        totalLots: 0,
        occupiedLots: 0,
        vacantLots: 0,
        occupancyRate: 0,
        totalInterventions: 0,
        activeInterventions: 0,
        interventionStats: { total: 0, pending: 0, inProgress: 0, completed: 0 }
      }
    }

    const totalLots = lots.length
    // Phase 2: Occupancy determined by tenant_id presence
    const occupiedLots = lots.filter(lot => lot.tenant_id).length
    const vacantLots = totalLots - occupiedLots
    const occupancyRate = totalLots > 0 ? Math.round((occupiedLots / totalLots) * 100) : 0

    const totalInterventions = interventions.length
    const activeInterventions = interventions.filter(i => 
      i.status === 'pending' || i.status === 'in_progress' || i.status === 'assigned'
    ).length

    const interventionStats = {
      total: totalInterventions,
      pending: interventions.filter(i => i.status === 'pending').length,
      inProgress: interventions.filter(i => i.status === 'in_progress' || i.status === 'assigned').length,
      completed: interventions.filter(i => i.status === 'completed').length
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

      const buildingService = createBuildingService()
      const deleteResult = await buildingService.delete(building.id)

      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || 'Failed to delete building')
      }

      // Redirect to buildings list after successful deletion
      router.push('/gestionnaire/biens')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorDetails = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { raw: error }
      logger.error("❌ Error deleting building:", { errorMessage, errorDetails })
      setError(`Erreur lors de la suppression de l'immeuble: ${errorMessage}`)
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleBack = () => {
    router.push('/gestionnaire/biens')
  }

  const handleEdit = () => {
    router.push(`/gestionnaire/biens/immeubles/modifier/${resolvedParams.id}`)
  }

  const handleCustomAction = (_actionKey: string) => {
    switch (_actionKey) {
      case "add-intervention":
        router.push(`/gestionnaire/interventions/nouvelle?buildingId=${building.id}`)
        break
      case "add-lot":
        router.push(`/gestionnaire/biens/lots/nouveau?buildingId=${building.id}`)
        break
      default:
        logger.info("Action not implemented:", _actionKey)
    }
  }

  // Load interventions with documents
  const [interventionsWithDocs, setInterventionsWithDocs] = useState<unknown[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  const loadInterventionsWithDocuments = async () => {
    if (!resolvedParams.id) return

    setLoadingDocs(true)
    try {
      const interventionService = createInterventionService()

      // Get interventions for this building
      const interventionsResult = await interventionService.getByBuilding(resolvedParams.id)
      if (!interventionsResult.success) {
        throw new Error(interventionsResult.error?.message || 'Failed to load interventions')
      }

      // Fetch documents for each intervention
      const interventionsWithDocsData = await Promise.all(
        (interventionsResult.data || []).map(async (intervention) => {
          try {
            const docsResult = await interventionService.getDocuments(intervention.id)
            return {
              ...intervention,
              documents: docsResult.success ? docsResult.data : []
            }
          } catch (error) {
            logger.warn(`⚠️ Could not load documents for intervention ${intervention.id}:`, error?.message || error)
            return {
              ...intervention,
              documents: []
            }
          }
        })
      )

      setInterventionsWithDocs(interventionsWithDocsData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorDetails = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { raw: error }
      logger.error("❌ Error loading interventions with documents:", { errorMessage, errorDetails })
    } finally {
      setLoadingDocs(false)
    }
  }

  // Load interventions with documents when component mounts
  useEffect(() => {
    if (resolvedParams.id && !loading) {
      loadInterventionsWithDocuments()
    }
  }, [resolvedParams.id, loading])

  // Transform interventions data for documents component
  const transformInterventionsForDocuments = (interventionsData: unknown[]) => {
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
      documents: intervention.documents?.map((_doc: unknown) => ({
        id: _doc.id,
        name: _doc.original_filename || _doc.filename,
        size: _doc.file_size,
        type: _doc.mime_type,
        uploadedAt: _doc.uploaded_at,
        uploadedBy: {
          name: 'Utilisateur', // Simplifie car on n'a plus les foreign keys
          role: 'user'
        }
      })) || []
    })).filter(intervention => intervention.documents.length > 0)
  }

  const handleDocumentView = (_document: unknown) => {
    // TODO: Implement document viewer
    logger.info('Viewing document:', _document)
    // For now, we can open in a new tab or show a modal
  }

  const handleDocumentDownload = (_document: unknown) => {
    // TODO: Implement document download
    logger.info('Downloading document:', _document)
    // For now, we can trigger a download or redirect to download URL
  }

  const stats = getStats()

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye, count: null },
    { id: "lots", label: "Lots", icon: Users, count: stats.totalLots },
    { id: "interventions", label: "Interventions", icon: Wrench, count: stats.totalInterventions },
    { id: "documents", label: "Documents", icon: FileText, count: null },
  ]

  // Etats de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => router.push("/gestionnaire/biens")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour à la liste des biens</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Skeleton className="h-8 w-64 mb-4" />
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // Etat d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/gestionnaire/biens")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour à la liste des biens</span>
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  // Verifier que l'immeuble existe
  if (!building) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/gestionnaire/biens")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour à la liste des biens</span>
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Immeuble non trouvé</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header ameliore */}
      <PropertyDetailHeader
        property={{
          id: building.id,
          title: building.name,
          name: building.name,
          createdAt: building.created_at,
          createdBy: building.manager?.name,
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

      {/* Tabs Navigation with shadcn/ui */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100">
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
            <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Informations Generales */}
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
                  <span className="font-medium">{building.country || "Non spécifié"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gestionnaire</span>
                  <span className="font-medium">{building.manager?.name || "Non défini"}</span>
                </div>
                {building.description && (
                  <div className="pt-2 border-t">
                    <span className="text-gray-600 text-sm">Description</span>
                    <p className="text-sm font-medium mt-1">{building.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistiques d'Occupation */}
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
                    {lots.filter(lot => lot.tenant).map(lot => lot.tenant.id).filter((id, index, arr) => arr.indexOf(id) === index).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Activite */}
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
              <Button onClick={() => router.push('/gestionnaire/interventions/nouvelle')}>
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

                {/* Liste des interventions */}
                <div className="space-y-4">
                  {interventions.map((intervention) => (
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
                <Button onClick={() => router.push('/gestionnaire/interventions/nouvelle')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer la première intervention
                </Button>
              </div>
            )}
          </div>
            </TabsContent>

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
                  loading={loadingDocs}
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

