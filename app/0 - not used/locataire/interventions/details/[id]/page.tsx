"use client"

import { useState } from "react"
import { ArrowLeft, Building2, User, MessageSquare, CalendarDays, Euro, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { InterventionLogementCard } from "@/components/intervention/intervention-logement-card"
import { PlanningCard } from "@/components/intervention/planning-card"
import { AssignedContactsCard } from "@/components/intervention/assigned-contacts-card"
import { FilesCard } from "@/components/intervention/files-card"
import { ChatsCard } from "@/components/intervention/chats-card"

interface InterventionDetailsProps {
  params: {
    id: string
  }
}

export default function InterventionDetailsPage({ params }: InterventionDetailsProps) {
  const router = useRouter()
  const [intervention] = useState({
    id: params.id,
    title: "Fuite d'eau dans la salle de bain",
    description:
      "Une fuite importante s'est déclarée au niveau du robinet de la baignoire. L'eau s'infiltre dans le plafond de l'appartement du dessous.",
    type: "Plomberie",
    urgency: "Urgente - Immédiate",
    status: "En cours",
    createdAt: "2025-01-09T11:30:00Z",
    location: "Salle de bain principale",
    logement: {
      name: "Lot003",
      address: "123 Rue de la Paix, 75001 Paris",
      building: "Résidence Champs-Élysées",
      floor: "Étage 1",
      tenant: "Vous",
    },
    files: [
      { name: "fuite-robinet.jpg", size: "2.1 MB" },
      { name: "degats-plafond.jpg", size: "1.4 MB" },
    ],
    availabilities: [
      { date: "2025-01-10", startTime: "08:00", endTime: "18:00" },
      { date: "2025-01-11", startTime: "09:00", endTime: "17:00" },
    ],
    assignedContacts: [
      {
        id: 1,
        name: "Thomas Blanc",
        role: "Prestataire",
        speciality: "Plomberie",
        email: "thomas.blanc@maintenance.com",
        phone: "06 23 45 67 89",
      },
      {
        id: 2,
        name: "Marie Dubois",
        role: "Gestionnaire",
        email: "marie.dubois@seido.com",
        phone: "06 87 65 43 21",
      },
    ],
    quotes: [
      {
        id: 1,
        amount: 280,
        description: "Remplacement du robinet défaillant et réparation de la tuyauterie",
        status: "En attente",
        provider: "Thomas Blanc",
        createdAt: "2025-01-09T15:30:00Z",
        validUntil: "2025-01-16",
      },
    ],
    planning: {
      type: "fixed",
      scheduledDate: "2025-01-10",
      scheduledTime: "14:00-17:00",
    },
    prestataireAvailabilities: [
      {
        person: "Thomas Blanc (Prestataire)",
        slots: [
          { date: "2025-01-10", startTime: "14:00", endTime: "18:00" },
          { date: "2025-01-11", startTime: "08:00", endTime: "12:00" },
        ],
      },
    ],
    chats: [
      {
        id: 1,
        type: "group" as const,
        participants: 3,
        lastMessage: "J'arrive dans 10 minutes",
        lastMessageTime: "Il y a 5 minutes",
        lastMessageSender: "Thomas Blanc",
      },
      {
        id: 2,
        type: "individual" as const,
        name: "Thomas Blanc",
        role: "Prestataire",
        lastMessage: "Intervention terminée, tout est réparé",
        lastMessageTime: "Il y a 1 heure",
      },
      {
        id: 3,
        type: "individual" as const,
        name: "Marie Dubois",
        role: "Gestionnaire",
        lastMessage: "Nous suivons votre demande",
        lastMessageTime: "Il y a 2 heures",
      },
    ],
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "En attente":
        return "bg-yellow-100 text-yellow-800"
      case "En cours":
        return "bg-blue-100 text-blue-800"
      case "Terminé":
        return "bg-green-100 text-green-800"
      case "Annulé":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Urgente - Immédiate":
        return "bg-red-100 text-red-800"
      case "Importante - 24h":
        return "bg-orange-100 text-orange-800"
      case "Normale - Quelques jours":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
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
              <Badge className={getStatusColor(intervention.status)}>{intervention.status}</Badge>
              <Badge className={getUrgencyColor(intervention.urgency)}>{intervention.urgency}</Badge>
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
                        <div className="text-xs text-gray-500">
                          <span>Valide jusqu'au {new Date(quote.validUntil).toLocaleDateString("fr-FR")}</span>
                        </div>
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
