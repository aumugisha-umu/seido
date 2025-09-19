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
    // Phase 1: Demande
    case "demande":
      return "bg-red-100 text-red-800 border-red-200"
    case "rejetee":
      return "bg-red-100 text-red-800 border-red-200"
    case "approuvee":
      return "bg-green-100 text-green-800 border-green-200"
    
    // Phase 2: Planification & Exécution
    case "demande_de_devis":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "planification":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "planifiee":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "en_cours":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"
    
    // Phase 3: Clôture
    case "cloturee_par_prestataire":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "cloturee_par_locataire":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "cloturee_par_gestionnaire":
      return "bg-green-100 text-green-800 border-green-200"
    
    // Transversal
    case "annulee":
      return "bg-gray-100 text-gray-800 border-gray-200"
    
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export const getStatusLabel = (status: string) => {
  switch (status) {
    // Phase 1: Demande
    case "demande":
      return "Demande"
    case "rejetee":
      return "Rejetée"
    case "approuvee":
      return "Approuvée"
    
    // Phase 2: Planification & Exécution
    case "demande_de_devis":
      return "Demande de devis"
    case "planification":
      return "Planification"
    case "planifiee":
      return "Planifiée"
    case "en_cours":
      return "En cours"
    
    // Phase 3: Clôture
    case "cloturee_par_prestataire":
      return "Clôturée par prestataire"
    case "cloturee_par_locataire":
      return "Clôturée par locataire"
    case "cloturee_par_gestionnaire":
      return "Clôturée par gestionnaire"
    
    // Transversal
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

export const getStatusActionMessage = (status: string, userRole?: string): string => {
  switch (status) {
    // Phase 1: Demande
    case "demande":
      return "En attente d'approbation du gestionnaire"
    case "rejetee":
      return "Intervention rejetée"
    case "approuvee":
      return "En attente d'assignation de prestataire"

    // Phase 2: Planification & Exécution
    case "demande_de_devis":
      return "En attente du devis du prestataire"
    case "planification":
      return "En attente des disponibilités du locataire et prestataire"
    case "planifiee":
      return "Intervention programmée"
    case "en_cours":
      return "Intervention en cours d'exécution"

    // Phase 3: Clôture
    case "cloturee_par_prestataire":
      return "En attente de validation du locataire"
    case "cloturee_par_locataire":
      return "En attente de finalisation par le gestionnaire"
    case "cloturee_par_gestionnaire":
      return "Intervention finalisée"

    // Transversal
    case "annulee":
      return "Intervention annulée"

    default:
      return "Statut inconnu"
  }
}
