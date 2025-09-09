import { type InterventionAction } from "./intervention-actions-service"

export const getInterventionLocationText = (intervention: InterventionAction): string => {
  if (intervention.lot?.reference) {
    return `Lot ${intervention.lot.reference}`
  } else if (intervention.building?.name) {
    return `Bâtiment entier - ${intervention.building.name}`
  } else if (intervention.location) {
    return intervention.location
  }
  return "Non spécifié"
}

export const getInterventionLocationIcon = (intervention: InterventionAction): "building" | "location" => {
  if (intervention.building && !intervention.lot) {
    return "building"
  }
  return "location"
}

export const isBuildingWideIntervention = (intervention: InterventionAction): boolean => {
  return !!(intervention.building && !intervention.lot)
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "nouvelle_demande":
      return "bg-red-100 text-red-800 border-red-200"
    case "approuve":
      return "bg-green-100 text-green-800 border-green-200"
    case "rejete":
      return "bg-gray-100 text-gray-800 border-gray-200"
    case "devis":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "a_programmer":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "programme":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "en_cours":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "finalisation_attente":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "terminee":
      return "bg-green-100 text-green-800 border-green-200"
    case "annulee":
      return "bg-gray-100 text-gray-800 border-gray-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export const getStatusLabel = (status: string) => {
  switch (status) {
    case "nouvelle_demande":
      return "Nouvelle demande"
    case "approuve":
      return "Approuvé"
    case "rejete":
      return "Rejeté"
    case "devis":
      return "Devis"
    case "a_programmer":
      return "À programmer"
    case "programme":
      return "Programmé"
    case "en_cours":
      return "En cours"
    case "finalisation_attente":
      return "Finalisation en attente"
    case "terminee":
      return "Terminée"
    case "annulee":
      return "Annulée"
    default:
      return status
  }
}

export const getPriorityColor = (urgency: string) => {
  switch (urgency) {
    case "urgente":
      return "bg-red-100 text-red-800"
    case "haute":
      return "bg-orange-100 text-orange-800"
    case "normale":
      return "bg-blue-100 text-blue-800"
    case "basse":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export const getPriorityLabel = (urgency: string) => {
  switch (urgency) {
    case "urgente":
      return "Urgente"
    case "haute":
      return "Haute"
    case "normale":
      return "Normale"
    case "basse":
      return "Basse"
    default:
      return urgency
  }
}
