"use client"

import { useState, useMemo } from "react"
import { User, Clock, Info, Filter, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import {
  getValidAvailabilities,
  type AvailabilityFilterState
} from "@/lib/availability-filtering-utils"

interface UserAvailability {
  person: string
  role: string
  date: string
  startTime: string
  endTime: string
  userId?: string
}

interface Quote {
  id: string
  providerId: string
  status: 'pending' | 'approved' | 'rejected'
  [key: string]: any
}

interface UserAvailabilitiesDisplayProps {
  availabilities: UserAvailability[]
  title?: string
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  filterRole?: string // Pour afficher seulement un type d'utilisateur (ex: "prestataire")
  className?: string
  showCard?: boolean // Pour contrôler si on affiche dans une Card ou pas
  quotes?: Quote[] // Nouveau : pour activer le filtrage par devis
}

export function UserAvailabilitiesDisplay({
  availabilities,
  title,
  userRole,
  filterRole,
  className = "",
  showCard = true,
  quotes
}: UserAvailabilitiesDisplayProps) {
  const [showFilterDetails, setShowFilterDetails] = useState(false)

  // Calculer les disponibilités filtrées et l'état du filtrage
  const { filteredByQuotes, filterState, filterMessage } = useMemo(() => {
    if (!quotes || quotes.length === 0) {
      // Si pas de quotes, pas de filtrage par devis
      return {
        filteredByQuotes: availabilities,
        filterState: null,
        filterMessage: null
      }
    }

    const result = getValidAvailabilities(availabilities, quotes, userRole)
    return {
      filteredByQuotes: result.filteredAvailabilities,
      filterState: result.filterState,
      filterMessage: result.filterMessage
    }
  }, [availabilities, quotes, userRole])

  // Appliquer ensuite le filtrage par rôle si spécifié
  const filteredAvailabilities = useMemo(() => {
    const baseFiltered = filterRole
      ? filteredByQuotes.filter(avail => avail.role === filterRole)
      : filteredByQuotes
    return baseFiltered
  }, [filteredByQuotes, filterRole])

  // Debug log pour tracer le filtrage des disponibilités
  console.log('🔍 [AVAILABILITY-DEBUG] Filtering results:', {
    original: availabilities.length,
    filteredByQuotes: filteredByQuotes.length,
    finalFiltered: filteredAvailabilities.length,
    filterRole: filterRole || 'none',
    excludedProviders: filterState?.excludedProviders || [],
    details: {
      original: availabilities.map(a => ({ userId: a.userId, person: a.person, role: a.role })),
      finalFiltered: filteredAvailabilities.map(a => ({ userId: a.userId, person: a.person, role: a.role }))
    }
  })

  // Calculer si toutes les disponibilités ont été filtrées
  const allFilteredOut = availabilities.length > 0 && filteredAvailabilities.length === 0
  const someFilteredByQuotes = filterState && filterState.excludedAvailabilities > 0

  // Grouper les disponibilités par personne et rôle (en utilisant userId pour éviter les collisions)
  const groupedAvailabilities = useMemo(() => {
    return filteredAvailabilities.reduce((acc, availability) => {
      const key = availability.userId ? `${availability.userId}-${availability.role}` : `${availability.person}-${availability.role}`
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
  }, [filteredAvailabilities])

  // Si aucune disponibilité initiale, ne rien afficher
  if (availabilities.length === 0) {
    return null
  }

  // Debug log pour tracer le groupement des disponibilités
  console.log('👥 [GROUPING-DEBUG] Grouped availabilities:', {
    totalGroups: Object.keys(groupedAvailabilities).length,
    groups: Object.entries(groupedAvailabilities).map(([key, group]) => ({
      key,
      userId: group.userId,
      person: group.person,
      role: group.role,
      slotCount: group.slots.length
    }))
  })

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
    <div className={cn("relative", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">{displayTitle}</h4>
            {someFilteredByQuotes && userRole === 'gestionnaire' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="cursor-help bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors duration-200"
                    >
                      <Filter className="h-3 w-3" />
                      Filtré
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">Filtrage appliqué</p>
                      <p className="text-xs">
                        Les disponibilités des prestataires avec uniquement des devis rejetés sont masquées.
                      </p>
                      {filterMessage?.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {filterMessage.details}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Message d'information sur le filtrage - Visible uniquement pour les gestionnaires */}
          {someFilteredByQuotes && filterMessage?.show && userRole === 'gestionnaire' && (
            <Alert className="mt-2 mb-3 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                <span className="font-medium">{filterMessage.message}</span>
                {filterMessage.details && (
                  <span className="block text-xs mt-1 text-blue-600">
                    {filterMessage.details}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Message si toutes les disponibilités ont été filtrées */}
      {allFilteredOut && (
        <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium mb-1">
            Aucune disponibilité à afficher
          </p>
          <p className="text-xs text-gray-500">
            {filterState && filterState.excludedProviders.length > 0
              ? `Les disponibilités de ${filterState.excludedProviders.join(', ')} ont été masquées (devis rejetés)`
              : filterRole
              ? `Aucune disponibilité trouvée pour le rôle "${filterRole}"`
              : "Aucune disponibilité correspondant aux critères"}
          </p>
        </div>
      )}

      {/* Affichage des disponibilités groupées */}
      {!allFilteredOut && (
        <div className="space-y-3">
          {Object.entries(groupedAvailabilities).map(([key, data]) => (
            <div
              key={key}
              className="border border-gray-200 rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:border-gray-300"
            >
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
      )}
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