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
    case "en_cours": // DEPRECATED - kept for backward compatibility
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
    case "en_cours": // DEPRECATED - kept for backward compatibility
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

/**
 * Retourne le nom de l'icône Lucide appropriée pour chaque niveau d'urgence
 * Bonnes pratiques UX : utiliser des icônes de gravité croissante
 */
export const getPriorityIcon = (urgency: string): string => {
  switch (urgency) {
    case "urgente":
      return "AlertTriangle" // Triangle d'alerte pour urgence maximale
    case "haute":
      return "TrendingUp" // Flèche montante pour priorité élevée
    case "normale":
      return "Minus" // Ligne horizontale pour priorité normale
    case "basse":
      return "ArrowDown" // Flèche descendante pour faible priorité
    default:
      return "Minus"
  }
}

/**
 * Retourne le nom de l'icône Lucide appropriée pour chaque statut d'intervention
 * Bonnes pratiques UX : icônes sémantiques reflétant l'état du workflow
 */
export const getStatusIcon = (status: string): string => {
  switch (status) {
    // Phase 1: Demande
    case "demande":
      return "Clock" // Horloge pour "en attente"
    case "rejetee":
      return "XCircle" // Croix pour rejet
    case "approuvee":
      return "CheckCircle" // Check pour approbation

    // Phase 2: Planification & Exécution
    case "demande_de_devis":
      return "FileText" // Document pour devis
    case "planification":
      return "Calendar" // Calendrier pour planification
    case "planifiee":
      return "CalendarCheck" // Calendrier validé pour intervention planifiée
    case "en_cours": // DEPRECATED - kept for backward compatibility
      return "Play" // Play pour intervention en cours

    // Phase 3: Clôture
    case "cloturee_par_prestataire":
      return "UserCheck" // Utilisateur validé pour clôture prestataire
    case "cloturee_par_locataire":
      return "CheckCircle2" // Double check pour validation locataire
    case "cloturee_par_gestionnaire":
      return "CheckCircle" // Check final pour clôture gestionnaire

    // Transversal
    case "annulee":
      return "XCircle" // Croix pour annulation

    default:
      return "HelpCircle" // Point d'interrogation pour statut inconnu
  }
}

/**
 * Retourne le nom de l'icône Lucide appropriée pour chaque catégorie d'intervention
 * Bonnes pratiques UX : icônes métier facilement reconnaissables
 */
export const getTypeIcon = (type: string): string => {
  switch (type?.toLowerCase()) {
    case "plomberie":
      return "Droplets" // Gouttes d'eau
    case "electricite":
      return "Zap" // Éclair
    case "chauffage":
      return "Flame" // Flamme
    case "serrurerie":
      return "Key" // Clé
    case "peinture":
      return "Paintbrush" // Pinceau
    case "maintenance":
      return "Hammer" // Marteau
    default:
      return "Wrench" // Clé à molette par défaut
  }
}

export const getStatusActionMessage = (status: string, userContext?: 'gestionnaire' | 'prestataire' | 'locataire'): string => {
  // Messages adaptés selon le contexte utilisateur
  if (userContext === 'prestataire') {
    switch (status) {
      // Phase 1: Demande
      case "demande":
        return "Demande en attente d'approbation"
      case "rejetee":
        return "Intervention rejetée"
      case "approuvee":
        return "Intervention approuvée"

      // Phase 2: Planification & Exécution - Statuts mappés côté prestataire
      case "demande_de_devis":
      case "devis-a-fournir":
        return "Vous devez soumettre un devis"
      case "planification":
        return "Vous devez planifier l'intervention"
      case "planifiee":
        return "Intervention planifiée - Vous pouvez commencer"
      case "en_cours": // DEPRECATED
        return "Intervention en cours - Terminez quand c'est fait"

      // Phase 3: Clôture - Statuts mappés côté prestataire
      case "cloturee_par_prestataire":
        return "En attente de validation du locataire"
      case "cloturee_par_locataire":
        return "En attente de finalisation par le gestionnaire"
      case "cloturee_par_gestionnaire":
      case "terminee":
        return "Intervention terminée"

      // Transversal
      case "annulee":
        return "Intervention annulée"

      default:
        return "Statut inconnu"
    }
  }

  if (userContext === 'locataire') {
    switch (status) {
      // Phase 1: Demande
      case "demande":
        return "Votre demande est en attente d'approbation"
      case "rejetee":
        return "Votre demande a été rejetée"
      case "approuvee":
        return "Demande approuvée - En attente d'assignation"

      // Phase 2: Planification & Exécution
      case "demande_de_devis":
        return "En attente du devis du prestataire"
      case "planification":
        return "Planification en cours avec le prestataire"
      case "planifiee":
        return "Intervention programmée"
      case "en_cours": // DEPRECATED
        return "Intervention en cours"

      // Phase 3: Clôture
      case "cloturee_par_prestataire":
        return "Intervention terminée - Merci de valider"
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

  // Messages par défaut pour gestionnaire ou contexte non spécifié
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
    case "devis-a-fournir":
      return "En attente du devis du prestataire"
    case "planification":
      return "En attente des disponibilités du locataire et prestataire"
    case "planifiee":
      return "Intervention planifiée"
    case "en_cours": // DEPRECATED
      return "Intervention en cours d'exécution"

    // Phase 3: Clôture
    case "cloturee_par_prestataire":
      return "En attente de validation du locataire"
    case "cloturee_par_locataire":
      return "En attente de finalisation par le gestionnaire"
    case "cloturee_par_gestionnaire":
    case "terminee":
      return "Intervention finalisée"

    // Transversal
    case "annulee":
      return "Intervention annulée"

    default:
      return "Statut inconnu"
  }
}
