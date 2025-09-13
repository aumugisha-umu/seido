"use client"

import { useState } from "react"
import { 
  Search, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  FileText,
  Calendar,
  Euro,
  MapPin
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { usePrestataireData } from "@/hooks/use-prestataire-data"

const getStatusIcon = (status: string) => {
  switch (status) {
    case "nouvelle-demande":
      return <AlertCircle className="h-4 w-4" />
    case "devis-a-fournir":
      return <FileText className="h-4 w-4" />
    case "a-programmer":
      return <Calendar className="h-4 w-4" />
    case "programmee":
      return <Clock className="h-4 w-4" />
    case "terminee":
      return <CheckCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "nouvelle-demande":
      return "bg-red-100 text-red-800"
    case "devis-a-fournir":
      return "bg-orange-100 text-orange-800"
    case "a-programmer":
      return "bg-blue-100 text-blue-800"
    case "programmee":
      return "bg-purple-100 text-purple-800"
    case "terminee":
      return "bg-green-100 text-green-800"
    case "annulee":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "nouvelle-demande":
      return "Nouvelle demande"
    case "devis-a-fournir":
      return "Devis à fournir"
    case "a-programmer":
      return "À programmer"
    case "programmee":
      return "Programmée"
    case "terminee":
      return "Terminée"
    case "annulee":
      return "Annulée"
    default:
      return "Inconnu"
  }
}

export default function PrestatairInterventionsPage() {
  const { user } = useAuth()
  const { interventions, loading, error } = usePrestataireData(user?.id || '')
  const [activeTab, setActiveTab] = useState("nouvelle-demande")
  const [searchTerm, setSearchTerm] = useState("")

  // Calculate tab counts
  const getStatusCounts = () => {
    const counts: Record<string, number> = {}
    interventions.forEach((intervention) => {
      counts[intervention.status] = (counts[intervention.status] || 0) + 1
    })
    return counts
  }

  const statusCounts = getStatusCounts()
  
  const statusTabs = [
    { key: "nouvelle-demande", label: "Nouvelles", count: statusCounts["nouvelle-demande"] || 0 },
    { key: "devis-a-fournir", label: "Devis à fournir", count: statusCounts["devis-a-fournir"] || 0 },
    { key: "a-programmer", label: "À programmer", count: statusCounts["a-programmer"] || 0 },
    { key: "programmee", label: "Programmées", count: statusCounts["programmee"] || 0 },
    { key: "terminee", label: "Terminées", count: statusCounts["terminee"] || 0 },
  ]

  // Filter interventions
  const filteredInterventions = interventions.filter((intervention) => {
    const matchesTab = intervention.status === activeTab
    const matchesSearch = searchTerm === "" || 
      intervention.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intervention.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTab && matchesSearch
  })

  if (loading) {
    return (
      <div className="py-2">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-2">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Interventions</h1>
        <p className="text-gray-600">Gérez les interventions qui vous sont assignées</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une intervention..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-6">
          {statusTabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="flex flex-col items-center py-3"
            >
              <span className="text-xs truncate">{tab.label}</span>
              <Badge variant="secondary" className="mt-1 text-xs">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {statusTabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="space-y-4">
            {filteredInterventions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune intervention
                  </h3>
                  <p className="text-gray-600">
                    Aucune intervention trouvée pour ce statut.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredInterventions.map((intervention) => (
                <Card key={intervention.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 flex items-center gap-2">
                          {getStatusIcon(intervention.status)}
                          {intervention.title || `Intervention #${intervention.id.slice(0, 8)}`}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <Badge className={getStatusBadgeColor(intervention.status)}>
                            {getStatusLabel(intervention.status)}
                          </Badge>
                          {intervention.priority && (
                            <Badge variant="outline">
                              Priorité: {intervention.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {intervention.description && (
                        <p className="text-gray-700">{intervention.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {intervention.lot?.building?.address || "Adresse non disponible"}
                          </span>
                        </div>
                        {intervention.estimated_duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{intervention.estimated_duration}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t">
                        <div className="text-sm text-gray-500">
                          Créé le {new Date(intervention.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        
                        <div className="flex gap-2">
                          {intervention.status === "nouvelle-demande" && (
                            <>
                              <Button size="sm" variant="outline">
                                Rejeter
                              </Button>
                              <Button size="sm">
                                Approuver
                              </Button>
                            </>
                          )}
                          {intervention.status === "devis-a-fournir" && (
                            <Button size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              Créer un devis
                            </Button>
                          )}
                          {intervention.status === "a-programmer" && (
                            <Button size="sm">
                              <Calendar className="h-4 w-4 mr-2" />
                              Programmer
                            </Button>
                          )}
                          {intervention.status === "programmee" && (
                            <Button size="sm">
                              Commencer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
