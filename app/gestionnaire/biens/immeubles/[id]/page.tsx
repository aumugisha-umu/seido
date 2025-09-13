"use client"

import { useState, useEffect, use } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Edit, Trash2, Eye, FileText, Wrench, Users, Plus, Search, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { getLotCategoryConfig } from "@/lib/lot-types"
import { buildingService, lotService, interventionService } from "@/lib/database-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import LotCard from "@/components/lot-card"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { DocumentsSection } from "@/components/intervention/documents-section"

export default function BuildingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const { user } = useAuth()

  // State pour les données
  const [building, setBuilding] = useState<any>(null)
  const [lots, setLots] = useState<any[]>([])
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Effet pour basculer automatiquement sur l'onglet lots si paramètre présent
  useEffect(() => {
    const lotParam = searchParams.get('lot')
    if (lotParam) {
      setActiveTab("lots")
    }
  }, [searchParams])

  // Charger les données de l'immeuble
  useEffect(() => {
    if (resolvedParams.id && user?.id) {
      loadBuildingData()
    }
  }, [resolvedParams.id, user?.id])

  const loadBuildingData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("🏢 Loading building data for ID:", resolvedParams.id)

      // 1. Charger les données de l'immeuble
      const buildingData = await buildingService.getById(resolvedParams.id)
      console.log("🏢 Building loaded:", buildingData)
      setBuilding(buildingData)

      // 2. Charger les lots de l'immeuble
      const lotsData = await lotService.getByBuildingId(resolvedParams.id)
      console.log("🏠 Lots loaded:", lotsData?.length || 0)
      setLots(lotsData || [])

      // 3. Charger les interventions des lots
      if (lotsData && lotsData.length > 0) {
        const lotIds = lotsData.map(lot => lot.id)
        const allInterventions = []
        
        for (const lotId of lotIds) {
          try {
            const lotInterventions = await interventionService.getByLotId(lotId)
            allInterventions.push(...(lotInterventions || []))
          } catch (error) {
            console.warn(`⚠️ Could not load interventions for lot ${lotId}:`, error)
          }
        }
        
        console.log("🔧 Interventions loaded:", allInterventions.length)
        setInterventions(allInterventions)
      }

    } catch (error) {
      console.error("❌ Error loading building data:", error)
      setError("Erreur lors du chargement des données de l'immeuble")
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
    const occupiedLots = lots.filter(lot => lot.is_occupied || lot.tenant_id).length
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

  const handleDelete = async () => {
    if (!building?.id) return

    try {
      setIsDeleting(true)
      console.log("🗑️ Deleting building:", building.id)
      
      await buildingService.delete(building.id)
      
      // Redirect to buildings list after successful deletion
      router.push('/gestionnaire/biens')
      
    } catch (error) {
      console.error("❌ Error deleting building:", error)
      setError("Erreur lors de la suppression de l'immeuble")
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Load interventions with documents
  const [interventionsWithDocs, setInterventionsWithDocs] = useState<any[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  const loadInterventionsWithDocuments = async () => {
    if (!resolvedParams.id) return
    
    setLoadingDocs(true)
    try {
      const interventionsData = await interventionService.getInterventionsWithDocumentsByBuildingId(resolvedParams.id)
      setInterventionsWithDocs(interventionsData)
    } catch (error) {
      console.error("❌ Error loading interventions with documents:", error)
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
  const transformInterventionsForDocuments = (interventionsData: any[]) => {
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
      documents: intervention.documents?.map((doc: any) => ({
        id: doc.id,
        name: doc.original_filename || doc.filename,
        size: doc.file_size,
        type: doc.mime_type,
        uploadedAt: doc.uploaded_at,
        uploadedBy: {
          name: 'Utilisateur', // Simplifié car on n'a plus les foreign keys
          role: 'user'
        }
      })) || []
    })).filter(intervention => intervention.documents.length > 0)
  }

  const handleDocumentView = (document: any) => {
    // TODO: Implement document viewer
    console.log('Viewing document:', document)
    // For now, we can open in a new tab or show a modal
  }

  const handleDocumentDownload = (document: any) => {
    // TODO: Implement document download
    console.log('Downloading document:', document)
    // For now, we can trigger a download or redirect to download URL
  }

  const stats = getStats()

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye, count: null },
    { id: "lots", label: "Lots", icon: Users, count: stats.totalLots },
    { id: "interventions", label: "Interventions", icon: Wrench, count: stats.totalInterventions },
    { id: "documents", label: "Documents", icon: FileText, count: null },
  ]

  // États de chargement
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

  // État d'erreur
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

  // Vérifier que l'immeuble existe
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/gestionnaire/biens/immeubles/modifier/${resolvedParams.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Building Name */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="text-2xl font-bold text-gray-900">{building.name}</h1>
        <p className="text-gray-600 mt-1">{building.address}, {building.city}</p>
      </div>

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
            {/* Informations Générales */}
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
                  <span className="text-gray-600">Année de construction</span>
                  <span className="font-medium">{building.construction_year || "Non défini"}</span>
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
                    {lots.filter(lot => lot.tenant_id).map(lot => lot.tenant_id).filter((id, index, arr) => arr.indexOf(id) === index).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Activité */}
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
        onConfirm={handleDelete}
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
