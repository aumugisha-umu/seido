"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, Building2, User, MessageSquare, CalendarDays, Euro, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { InterventionLogementCard } from "@/components/intervention/intervention-logement-card"
import { PlanningCard } from "@/components/intervention/planning-card"
import { AssignedContactsCard } from "@/components/intervention/assigned-contacts-card"
import { FilesCard } from "@/components/intervention/files-card"
import { ChatsCard } from "@/components/intervention/chats-card"
import { interventionService } from "@/lib/database-service"

interface InterventionDetailsProps {
  params: {
    id: string
  }
}

export default function InterventionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [intervention, setIntervention] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIntervention = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const data = await interventionService.getById(resolvedParams.id)
        
        // Transform the data to match expected format for components
        const transformedData = {
          id: data.id,
          title: data.title,
          description: data.description,
          type: data.intervention_type || "Non spécifié",
          urgency: data.priority || "Normale",
          status: data.status,
          createdAt: data.created_at,
          location: data.location || "Non spécifié",
          logement: {
            name: data.lot?.reference || data.lot?.apartment_number || `Lot ${data.lot?.reference}`,
            address: data.lot?.building ? 
              `${data.lot.building.address}, ${data.lot.building.postal_code} ${data.lot.building.city}` : 
              "Adresse non disponible",
            building: data.lot?.building?.name || "Bâtiment non spécifié",
            floor: data.lot?.floor ? `Étage ${data.lot.floor}` : "Étage non spécifié",
            tenant: "Vous",
          },
          // Mock data for components that don't have real data yet
          files: [],
          availabilities: [],
          assignedContacts: data.assigned_contact ? [{
            id: data.assigned_contact.id,
            name: data.assigned_contact.name,
            role: "Prestataire",
            email: data.assigned_contact.email,
            phone: data.assigned_contact.phone,
          }] : [],
          quotes: [],
          planning: {
            type: "pending",
            scheduledDate: null,
            scheduledTime: null,
          },
          prestataireAvailabilities: [],
          chats: [],
        }
        
        setIntervention(transformedData)
      } catch (err) {
        console.error("Error fetching intervention:", err)
        setError("Erreur lors du chargement de l'intervention")
      } finally {
        setLoading(false)
      }
    }

    if (resolvedParams.id) {
      fetchIntervention()
    }
  }, [resolvedParams.id])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-destructive">
                {error}
              </p>
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!intervention) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Intervention non trouvée
              </p>
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critique":
        return "bg-red-100 text-red-800"
      case "urgent":
        return "bg-orange-100 text-orange-800"
      case "normale":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case "critique":
        return "Critique"
      case "urgent":
        return "Urgent"
      case "normale":
        return "Normale"
      default:
        return urgency
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux interventions
            </Button>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(intervention.status)}>{getStatusLabel(intervention.status)}</Badge>
              <Badge className={getUrgencyColor(intervention.urgency)}>{getUrgencyLabel(intervention.urgency)}</Badge>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Ouvrir le chat
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{intervention.title}</h1>
          </div>

          <p className="text-gray-600 mb-4">
            {intervention.logement.building} • {intervention.logement.name}
          </p>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Demandeur: Vous</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
              <CalendarDays className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">
                Créée le:{" "}
                {new Date(intervention.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <InterventionLogementCard
              intervention={intervention}
              logement={intervention.logement}
              getUrgencyColor={getUrgencyColor}
            />

            <AssignedContactsCard contacts={intervention.assignedContacts} />

            {/* Devis - Keep custom for locataire with accept/refuse buttons */}
            {intervention.quotes && intervention.quotes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Euro className="h-5 w-5 text-green-600" />
                    <span>Devis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {intervention.quotes.map((quote) => (
                      <div key={quote.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{quote.amount}€</span>
                            <span className="text-sm text-gray-600">par {quote.provider}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {quote.status === "En attente" && (
                              <>
                                <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accepter
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 bg-transparent">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Refuser
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm mb-3">{quote.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PlanningCard
              planning={intervention.planning}
              userAvailabilities={intervention.availabilities}
              otherAvailabilities={intervention.prestataireAvailabilities}
              userRole="locataire"
              onModifyAvailabilities={() => console.log("Modify availabilities")}
            />

            <ChatsCard chats={intervention.chats} />

            <FilesCard files={intervention.files} />
          </div>
        </div>
      </main>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-9 w-40" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-8 w-80" />
          </div>

          <Skeleton className="h-5 w-64 mb-4" />

          <div className="flex items-center space-x-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Intervention details card skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assigned contacts card skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-6">
            {/* Planning card skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>

            {/* Files card skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
