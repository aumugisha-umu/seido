"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, Eye, FileText, Wrench, Users, Plus, Search, Filter } from "lucide-react"
import { useRouter } from "next/navigation"

export default function BuildingDetailsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()

  const building = {
    id: params.id,
    name: "xcvbn,;;",
    address: "xcvbn,",
    city: "Non défini",
    constructionYear: "Non défini",
    floors: "Non défini",
    owner: "a",
    ownerEmail: "a@m.com",
    totalLots: 1,
    occupiedLots: 1,
    vacantLots: 0,
    occupancyRate: 100,
    uniqueTenants: "Non défini",
    totalInterventions: 0,
    activeInterventions: 0,
    documents: "Non défini",
    rentalPotential: "0 €",
  }

  const lots = [
    {
      id: "lot001",
      name: "Lot001",
      status: "Occupé",
      floor: 0,
      tenant: "a@n.coma",
      interventions: "Aucune intervention",
      date: "02/09",
    },
  ]

  const interventionStats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  }

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye, count: null },
    { id: "lots", label: "Lots", icon: Users, count: 1 },
    { id: "interventions", label: "Interventions", icon: Wrench, count: 0 },
    { id: "documents", label: "Documents", icon: FileText, count: null },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/gestionnaire/biens")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour à la liste des biens</span>
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

      {/* Building Name */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="text-2xl font-bold text-gray-900">{building.name}</h1>
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
                  {tab.count !== null && (
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{tab.count}</span>
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
                  <span className="text-gray-600">Année de construction</span>
                  <span className="font-medium">{building.constructionYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nombre d'étages</span>
                  <span className="font-medium">{building.floors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Propriétaire</span>
                  <span className="font-medium">{building.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email propriétaire</span>
                  <span className="font-medium">{building.ownerEmail}</span>
                </div>
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
                  <span className="font-medium">{building.totalLots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lots occupés</span>
                  <span className="font-medium">{building.occupiedLots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lots vacants</span>
                  <span className="font-medium">{building.vacantLots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taux d'occupation</span>
                  <span className="font-medium">{building.occupancyRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Locataires uniques</span>
                  <span className="font-medium">{building.uniqueTenants}</span>
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
                  <span className="font-medium">{building.totalInterventions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interventions actives</span>
                  <span className="font-medium">{building.activeInterventions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documents</span>
                  <span className="font-medium">{building.documents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Potentiel de loyer</span>
                  <span className="font-medium">{building.rentalPotential}</span>
                </div>
              </CardContent>
            </Card>
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
                Interventions (0)
              </h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer une intervention
              </Button>
            </div>

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
                    <SelectItem value="progress">En cours</SelectItem>
                    <SelectItem value="completed">Terminées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Empty State */}
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune intervention</h3>
              <p className="text-gray-600">Créez votre première intervention</p>
            </div>
          </div>
        )}

        {activeTab === "lots" && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Liste des Lots (1)</h2>

            <div className="space-y-4">
              {lots.map((lot) => (
                <Card key={lot.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {lot.name}
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {lot.status}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <span className="mr-2">📍</span>
                        Étage {lot.floor}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        Locataire: {lot.tenant}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Wrench className="h-4 w-4 mr-2" />
                        {lot.interventions}
                      </div>
                      <div className="text-gray-500">📅 {lot.date}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Documents du bâtiment</h3>
            <p className="text-gray-600">La liste des documents pour ce bâtiment sera bientôt disponible ici.</p>
          </div>
        )}
      </main>
    </div>
  )
}
