"use client"
import { Search, Filter, Wrench, Plus, Eye, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTenantData } from "@/hooks/use-tenant-data"

const getStatusIcon = (status: string) => {
  switch (status) {
    case "nouvelle_demande":
    case "en_attente_validation":
      return <Clock className="h-4 w-4" />
    case "validee":
    case "en_cours":
      return <AlertTriangle className="h-4 w-4" />
    case "terminee":
      return <CheckCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "nouvelle_demande":
    case "en_attente_validation":
      return "bg-yellow-100 text-yellow-800"
    case "validee":
    case "en_cours":
      return "bg-blue-100 text-blue-800"
    case "terminee":
      return "bg-green-100 text-green-800"
    case "annulee":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "nouvelle_demande":
      return "Nouvelle demande"
    case "en_attente_validation":
      return "En attente"
    case "validee":
      return "Validé"
    case "en_cours":
      return "En cours"
    case "terminee":
      return "Terminé"
    case "annulee":
      return "Annulé"
    default:
      return status
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
  const { tenantInterventions, loading, error } = useTenantData()

  const handleViewDetails = (interventionId: string) => {
    router.push(`/locataire/interventions/${interventionId}`)
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Erreur lors du chargement des données: {error}
            </p>
          </CardContent>
        </Card>
      </div>
    )
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
            Mes demandes d'intervention ({tenantInterventions.length})
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
                <SelectItem value="nouvelle_demande">Nouvelle demande</SelectItem>
                <SelectItem value="en_attente_validation">En attente</SelectItem>
                <SelectItem value="validee">Validé</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="terminee">Terminé</SelectItem>
                <SelectItem value="annulee">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {tenantInterventions.length > 0 ? (
            tenantInterventions.map((intervention) => (
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
                        {intervention.priority && (
                          <Badge className={getPriorityColor(intervention.priority)}>
                            {intervention.priority.charAt(0).toUpperCase() + intervention.priority.slice(1)}
                          </Badge>
                        )}
                      </div>

                      <p className="text-gray-600 mb-3">{intervention.description}</p>

                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <span>
                          <strong>Type:</strong> {intervention.intervention_type || "Non spécifié"}
                        </span>
                        <span>
                          <strong>Localisation:</strong> {intervention.location || "Non spécifié"}
                        </span>
                        <span>
                          <strong>Créée le:</strong> {new Date(intervention.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        {intervention.estimated_duration && (
                          <span>
                            <strong>Durée estimée:</strong> {intervention.estimated_duration}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-gray-500">
                        <span>
                          <strong>Assignée à:</strong> {intervention.assigned_to || "En attente d'assignation"}
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
            ))
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Wrench className="h-8 w-8 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">Aucune demande d'intervention</h3>
                  <p className="text-gray-500">Vous n'avez pas encore créé de demande d'intervention.</p>
                </div>
                <Link href="/locataire/interventions/nouvelle-demande">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer ma première demande
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="space-y-6">
        {/* Section header skeleton */}
        <div className="flex items-center space-x-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-64" />
        </div>

        {/* Search and filters skeleton */}
        <div className="flex items-center space-x-4 mb-6">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Interventions list skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full mb-3" />
                    <div className="flex items-center space-x-6 mb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
