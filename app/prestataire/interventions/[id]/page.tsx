"use client"

import { useState, use } from "react"
import { ArrowLeft, Building2, User, MessageSquare, Calendar, FileText, Euro, Plus } from "lucide-react"
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

export default function PrestatairInterventionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [intervention] = useState({
    id: resolvedParams.id,
    title: "Fuite d'eau dans la salle de bain",
    description:
      "Une fuite importante s'est déclarée au niveau du robinet de la baignoire. L'eau s'infiltre dans le plafond de l'appartement du dessous.",
    type: "Plomberie",
    urgency: "Urgente - Immédiate",
    status: "En cours",
    createdAt: "2025-01-09T10:30:00Z",
    location: "Salle de bain principale",
    logement: {
      name: "Lot 3",
      address: "123 Rue de la Paix, 75001 Paris",
      building: "Résidence Champs-Élysées",
      floor: "Étage 1",
      tenant: "Jean Martin",
    },
    files: [
      { name: "fuite-robinet.jpg", size: "2.1 MB" },
      { name: "degats-plafond.jpg", size: "1.9 MB" },
    ],
    assignedContacts: [
      {
        id: 1,
        name: "Thomas Blanc",
        role: "Prestataire",
        speciality: "Plomberie",
        email: "thomas.blanc@maintenance.com",
        phone: "06 23 45 67 89",
        isCurrentUser: true,
      },
      {
        id: 2,
        name: "Marie Dubois",
        role: "Gestionnaire",
        email: "marie.dubois@seido.com",
        phone: "06 87 65 43 21",
      },
    ],
    instructions:
      "Intervention urgente requise. Vérifier l'état de la tuyauterie et proposer une solution durable. Coordonner avec le locataire pour l'accès.",
    planning: {
      type: "fixed",
      scheduledDate: "2025-01-10",
      scheduledTime: "14:00-17:00",
    },
    availabilities: [
      {
        person: "Jean Martin (Locataire)",
        slots: [
          { date: "2025-01-10", startTime: "08:00", endTime: "18:00" },
          { date: "2025-01-11", startTime: "09:00", endTime: "17:00" },
        ],
      },
    ],
    prestataireAvailabilities: [
      { date: "2025-01-10", startTime: "14:00", endTime: "18:00" },
      { date: "2025-01-11", startTime: "08:00", endTime: "12:00" },
    ],
    quotes: [
      {
        id: 1,
        amount: 280,
        description: "Remplacement du robinet défaillant et réparation de la tuyauterie",
        status: "En attente",
        createdAt: "2025-01-09T15:30:00Z",
        validUntil: "2025-01-16",
        isCurrentUserQuote: true,
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
        name: "Jean Martin",
        role: "Locataire",
        lastMessage: "Merci pour l'intervention rapide !",
        lastMessageTime: "Il y a 2 heures",
      },
      {
        id: 3,
        type: "individual" as const,
        name: "Marie Dubois",
        role: "Gestionnaire",
        lastMessage: "Notes internes: Vérifier la facture",
        lastMessageTime: "Il y a 30 minutes",
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

          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Demandeur: {intervention.logement.tenant}</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
              <Calendar className="h-4 w-4 text-gray-600" />
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
            {/* Détails de l'intervention */}
            {/* Logement concerné */}
            <InterventionLogementCard
              intervention={intervention}
              logement={intervention.logement}
              getUrgencyColor={getUrgencyColor}
            />

            {/* Personnes assignées */}
            <AssignedContactsCard contacts={intervention.assignedContacts} />

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <span>Instructions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900">{intervention.instructions}</p>
              </CardContent>
            </Card>

            {/* Devis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Euro className="h-5 w-5 text-green-600" />
                    <span>Devis</span>
                  </div>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau devis
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {intervention.quotes.map((quote) => (
                    <div key={quote.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{quote.amount}€</span>
                          {quote.isCurrentUserQuote && (
                            <Badge variant="outline" className="text-xs">
                              Votre devis
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {quote.status === "En attente" && (
                            <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
                          )}
                          {quote.status === "Accepté" && <Badge className="bg-green-100 text-green-800">Accepté</Badge>}
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm mb-3">{quote.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Valide jusqu'au {new Date(quote.validUntil).toLocaleDateString("fr-FR")}</span>
                        {quote.isCurrentUserQuote && (
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              Modifier
                            </Button>
                            <Button variant="ghost" size="sm">
                              Supprimer
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Planification */}
            <PlanningCard
              planning={intervention.planning}
              userAvailabilities={intervention.prestataireAvailabilities}
              otherAvailabilities={intervention.availabilities}
              userRole="prestataire"
              onModifyAvailabilities={() => console.log("Modify availabilities")}
            />

            {/* Chats */}
            <ChatsCard chats={intervention.chats} />

            {/* Fichiers joints */}
            <FilesCard files={intervention.files} />
          </div>
        </div>
      </main>
    </div>
  )
}
