"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, Eye, FileText, Wrench, Users, Plus, Search, Filter, User, MapPin, Building2, Calendar, Euro, AlertCircle } from "lucide-react"
import { LotContactsList } from "@/components/lot-contacts-list"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { lotService, interventionService, contactService } from "@/lib/database-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LotDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()

  // State pour les données
  const [lot, setLot] = useState<any>(null)
  const [interventions, setInterventions] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les données du lot
  useEffect(() => {
    if (resolvedParams.id && user?.id) {
      loadLotData()
    }
  }, [resolvedParams.id, user?.id])

  const loadLotData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("🏠 Loading lot data for ID:", resolvedParams.id)

      // 1. Charger les données du lot
      const lotData = await lotService.getById(resolvedParams.id)
      console.log("🏠 Lot loaded:", lotData)
      setLot(lotData)

      // 2. Charger les interventions du lot
      const interventionsData = await interventionService.getByLotId(resolvedParams.id)
      console.log("🔧 Interventions loaded:", interventionsData?.length || 0)
      setInterventions(interventionsData || [])

      // 3. Charger les contacts du lot
      const contactsData = await contactService.getLotContacts(resolvedParams.id)
      console.log("👥 Contacts loaded:", contactsData?.length || 0)
      setContacts(contactsData || [])

    } catch (error) {
      console.error("❌ Error loading lot data:", error)
      setError("Erreur lors du chargement des données du lot")
    } finally {
      setLoading(false)
    }
  }

  // Calculer les statistiques des interventions
  const getInterventionStats = () => {
    if (!interventions) {
      return { total: 0, pending: 0, inProgress: 0, completed: 0 }
    }

    return {
      total: interventions.length,
      pending: interventions.filter(i => i.status === 'pending').length,
      inProgress: interventions.filter(i => i.status === 'in_progress' || i.status === 'assigned').length,
      completed: interventions.filter(i => i.status === 'completed').length
    }
  }

  const interventionStats = getInterventionStats()

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye },
    { id: "contacts", label: "Contacts", icon: Users, count: contacts.length },
    { id: "interventions", label: "Interventions", icon: Wrench, count: interventionStats.total },
    { id: "documents", label: "Documents", icon: FileText },
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
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
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
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
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

  // Vérifier que le lot existe
  if (!lot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Lot non trouvé</AlertDescription>
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
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Lot Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-4 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{lot.reference}</h1>
          <Badge variant={lot.is_occupied || lot.tenant_id ? "default" : "secondary"} 
                 className={lot.is_occupied || lot.tenant_id ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
            {lot.is_occupied || lot.tenant_id ? "Occupé" : "Vacant"}
          </Badge>
          {lot.apartment_number && (
            <span className="text-sm text-gray-600">Appartement {lot.apartment_number}</span>
          )}
        </div>
        <div className="flex items-center space-x-4 text-gray-600">
          {lot.building && (
            <>
              <div className="flex items-center space-x-1">
                <Building2 className="h-4 w-4" />
                <span>{lot.building.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{lot.building.address}, {lot.building.city}</span>
              </div>
            </>
          )}
          <div className="flex items-center space-x-1">
            <span>📍 Étage {lot.floor ?? "Non défini"}</span>
          </div>
          {lot.surface_area && (
            <div className="flex items-center space-x-1">
              <span>📐 {lot.surface_area} m²</span>
            </div>
          )}
          {lot.rooms && (
            <div className="flex items-center space-x-1">
              <span>🏠 {lot.rooms} pièces</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Informations du Lot */}
            <Card>
              <CardHeader>
                <CardTitle>Informations du Lot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Référence</span>
                  <span className="font-medium">{lot.reference}</span>
                </div>
                {lot.apartment_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Numéro d'appartement</span>
                    <span className="font-medium">{lot.apartment_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Surface</span>
                  <span className="font-medium">{lot.surface_area ? `${lot.surface_area} m²` : "Non défini"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nombre de pièces</span>
                  <span className="font-medium">{lot.rooms ?? "Non défini"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Étage</span>
                  <span className="font-medium">{lot.floor ?? "Non défini"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Statut d'occupation</span>
                  <span className="font-medium">
                    <Badge variant={lot.is_occupied || lot.tenant_id ? "default" : "secondary"}>
                      {lot.is_occupied || lot.tenant_id ? "Occupé" : "Vacant"}
                    </Badge>
                  </span>
                </div>
                {lot.tenant && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Locataire</span>
                      <span className="font-medium">{lot.tenant.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email</span>
                      <span className="font-medium text-sm">{lot.tenant.email}</span>
                    </div>
                    {lot.tenant.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Téléphone</span>
                        <span className="font-medium">{lot.tenant.phone}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-2 border-t text-xs text-gray-500">
                  Créé le {new Date(lot.created_at).toLocaleDateString('fr-FR')}
                </div>
              </CardContent>
            </Card>


            {/* Interventions */}
            <Card>
              <CardHeader>
                <CardTitle>Interventions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">{interventionStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">En attente</span>
                  <span className="font-medium text-orange-600">{interventionStats.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">En cours</span>
                  <span className="font-medium text-blue-600">{interventionStats.inProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Terminées</span>
                  <span className="font-medium text-green-600">{interventionStats.completed}</span>
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={() => router.push(`/gestionnaire/interventions/nouvelle`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une intervention
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="space-y-6">
            <LotContactsList 
              lotId={resolvedParams.id} 
              buildingId={lot?.building?.id}
              contacts={contacts}
              onContactsUpdate={(updatedContacts: any[]) => setContacts(updatedContacts)}
            />
          </div>
        )}

        {activeTab === "interventions" && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-blue-600">{interventionStats.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-orange-600">{interventionStats.pending}</div>
                  <div className="text-sm text-gray-600">En attente</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-yellow-600">{interventionStats.inProgress}</div>
                  <div className="text-sm text-gray-600">En cours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">{interventionStats.completed}</div>
                  <div className="text-sm text-gray-600">Terminées</div>
                </CardContent>
              </Card>
            </div>

            {/* Interventions Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-gray-400" />
                Interventions ({interventionStats.total})
              </h2>
              <Button onClick={() => router.push(`/gestionnaire/interventions/nouvelle`)}>
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
                    <Input placeholder="Rechercher par titre, description..." className="pl-10" />
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
                              <Badge variant="outline" className="text-xs">
                                {intervention.urgency === 'high' ? 'Urgent' :
                                 intervention.urgency === 'medium' ? 'Moyen' :
                                 'Faible'}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{intervention.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Référence: {intervention.reference}</span>
                              {intervention.assigned_contact && (
                                <span>Contact: {intervention.assigned_contact.name}</span>
                              )}
                              {intervention.estimated_cost && (
                                <span>Coût estimé: {intervention.estimated_cost}€</span>
                              )}
                              <span>
                                Créée le {new Date(intervention.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            {intervention.scheduled_date && (
                              <div className="mt-2 text-sm text-blue-600">
                                📅 Programmée pour le {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                              </div>
                            )}
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
                <p className="text-gray-600 mb-4">Aucune intervention n'a été créée pour ce lot.</p>
                <Button onClick={() => router.push(`/gestionnaire/interventions/nouvelle`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer la première intervention
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Documents du lot</h3>
            <p className="text-gray-600 mb-4">La liste des documents pour ce lot sera bientôt disponible ici.</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un document
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
