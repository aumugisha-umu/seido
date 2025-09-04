"use client"
import { Search, Filter, Wrench, Plus, Eye, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"

const mockInterventions = [
  {
    id: "INT001",
    title: "Fuite d'eau dans la salle de bain",
    description: "Une fuite importante s'est déclarée au niveau du robinet de la baignoire.",
    type: "Plomberie",
    priority: "urgent",
    status: "in-progress",
    createdAt: "2025-01-08",
    estimatedDuration: "2-3 heures",
    assignedTo: "Thomas Blanc",
    location: "Salle de bain",
  },
  {
    id: "INT002",
    title: "Problème de chauffage",
    description: "Le radiateur de la chambre ne chauffe plus depuis hier.",
    type: "Chauffage",
    priority: "normale",
    status: "pending",
    createdAt: "2025-01-07",
    estimatedDuration: "1-2 heures",
    assignedTo: "En attente d'assignation",
    location: "Chambre",
  },
  {
    id: "INT003",
    title: "Ampoule grillée dans l'entrée",
    description: "L'éclairage de l'entrée ne fonctionne plus.",
    type: "Électricité",
    priority: "normale",
    status: "completed",
    createdAt: "2025-01-05",
    estimatedDuration: "30 minutes",
    assignedTo: "Pierre Moreau",
    location: "Entrée",
  },
  {
    id: "INT004",
    title: "Serrure de la porte d'entrée bloquée",
    description: "La clé tourne dans le vide, impossible d'ouvrir la porte.",
    type: "Serrurerie",
    priority: "critique",
    status: "pending",
    createdAt: "2025-01-09",
    estimatedDuration: "1 heure",
    assignedTo: "En attente d'assignation",
    location: "Porte d'entrée",
  },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />
    case "in-progress":
      return <AlertTriangle className="h-4 w-4" />
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "in-progress":
      return "bg-blue-100 text-blue-800"
    case "completed":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "En attente"
    case "in-progress":
      return "En cours"
    case "completed":
      return "Terminée"
    default:
      return "Inconnu"
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critique":
      return "bg-red-100 text-red-800"
    case "urgent":
      return "bg-orange-100 text-orange-800"
    case "normale":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function LocataireInterventionsPage() {
  const router = useRouter()

  const handleViewDetails = (interventionId: string) => {
    router.push(`/locataire/interventions/${interventionId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Demandes</h1>
          <p className="text-gray-600">Suivez vos demandes d'intervention pour votre logement</p>
        </div>
        <Link href="/locataire/interventions/nouvelle-demande">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center space-x-2 mb-4">
          <Wrench className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Mes demandes d'intervention ({mockInterventions.length})
          </h2>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher par titre ou description..." className="pl-10" />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="in-progress">En cours</SelectItem>
                <SelectItem value="completed">Terminées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {mockInterventions.map((intervention) => (
            <Card key={intervention.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{intervention.title}</h3>
                      <Badge className={getStatusColor(intervention.status)}>
                        {getStatusIcon(intervention.status)}
                        <span className="ml-1">{getStatusLabel(intervention.status)}</span>
                      </Badge>
                      <Badge className={getPriorityColor(intervention.priority)}>
                        {intervention.priority.charAt(0).toUpperCase() + intervention.priority.slice(1)}
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-3">{intervention.description}</p>

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>
                        <strong>Type:</strong> {intervention.type}
                      </span>
                      <span>
                        <strong>Localisation:</strong> {intervention.location}
                      </span>
                      <span>
                        <strong>Créée le:</strong> {new Date(intervention.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      <span>
                        <strong>Durée estimée:</strong> {intervention.estimatedDuration}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      <span>
                        <strong>Assignée à:</strong> {intervention.assignedTo}
                      </span>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(intervention.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Détails
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
