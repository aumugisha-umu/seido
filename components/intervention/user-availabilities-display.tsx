"use client"

import { User, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface UserAvailability {
  person: string
  role: string
  date: string
  startTime: string
  endTime: string
  userId?: string
}

interface UserAvailabilitiesDisplayProps {
  availabilities: UserAvailability[]
  title?: string
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  filterRole?: string // Pour afficher seulement un type d'utilisateur (ex: "prestataire")
  className?: string
  showCard?: boolean // Pour contrôler si on affiche dans une Card ou pas
}

export function UserAvailabilitiesDisplay({
  availabilities,
  title,
  userRole,
  filterRole,
  className = "",
  showCard = true
}: UserAvailabilitiesDisplayProps) {
  // Filtrer les disponibilités selon le rôle si spécifié
  const filteredAvailabilities = filterRole
    ? availabilities.filter(avail => avail.role === filterRole)
    : availabilities

  // Si aucune disponibilité après filtrage, ne rien afficher
  if (filteredAvailabilities.length === 0) {
    return null
  }

  // Grouper les disponibilités par personne et rôle
  const groupedAvailabilities = filteredAvailabilities.reduce((acc, availability) => {
    const key = `${availability.person}-${availability.role}`
    if (!acc[key]) {
      acc[key] = {
        person: availability.person,
        role: availability.role,
        userId: availability.userId,
        slots: []
      }
    }
    acc[key].slots.push(availability)
    return acc
  }, {} as Record<string, {
    person: string
    role: string
    userId?: string
    slots: UserAvailability[]
  }>)

  // Déterminer le titre par défaut selon le contexte
  const defaultTitle = filterRole
    ? `Disponibilités du ${filterRole}`
    : "Disponibilités par personne"

  const displayTitle = title || defaultTitle

  // Fonction pour obtenir la couleur du badge selon le rôle
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'prestataire':
        return "bg-blue-100 text-blue-700"
      case 'locataire':
        return "bg-green-100 text-green-700"
      case 'gestionnaire':
        return "bg-purple-100 text-purple-700"
      case 'superviseur':
        return "bg-orange-100 text-orange-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  // Contenu principal
  const content = (
    <div className={className}>
      <h4 className="font-medium text-gray-900 mb-2">{displayTitle}</h4>
      <div className="space-y-3">
        {Object.entries(groupedAvailabilities).map(([key, data]) => (
          <div key={key} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">{data.person}</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(data.role)}`}>
                {data.role}
              </span>
            </div>
            <div className="space-y-1">
              {data.slots.map((availability, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm flex items-center space-x-2">
                  <Clock className="h-3 w-3 text-gray-600" />
                  <span className="text-gray-700">
                    {new Date(availability.date).toLocaleDateString("fr-FR", {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })} de {availability.startTime} à {availability.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Si showCard est false, retourner juste le contenu
  if (!showCard) {
    return content
  }

  // Sinon, encapsuler dans une Card
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {content}
      </CardContent>
    </Card>
  )
}