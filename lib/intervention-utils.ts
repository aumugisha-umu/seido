import { type InterventionAction } from "./intervention-actions-service"

// Types pour les réponses aux créneaux horaires
interface TimeSlotResponse {
  user_id: string
  user_role: 'locataire' | 'prestataire'
  response: 'accepted' | 'rejected' | 'pending'
}

interface TimeSlotWithResponses {
  id: string
  status: string
  time_slot_responses?: TimeSlotResponse[]
}

// Type enrichi avec données utilisateur pour l'affichage des prénoms
interface TimeSlotResponseWithUser extends TimeSlotResponse {
  user?: {
    name: string
    first_name?: string | null
  }
}

interface TimeSlotWithUserResponses {
  id: string
  status: string
  time_slot_responses?: TimeSlotResponseWithUser[]
}

/**
 * Extrait les prénoms des personnes avec réponses en attente (pending)
 * Utilisé pour afficher "En attente de Arthur, Contact société" au lieu d'un message générique
 *
 * @param timeSlots - Les créneaux avec leurs réponses enrichies (incluant user.name/first_name)
 * @returns Liste unique de prénoms des personnes en attente
 */
export const getPendingResponderNames = (
  timeSlots?: TimeSlotWithUserResponses[]
): string[] => {
  if (!timeSlots || timeSlots.length === 0) return []

  // Récupérer toutes les réponses de tous les créneaux
  const allResponses = timeSlots.flatMap(slot => slot.time_slot_responses || [])

  // Filtrer uniquement les réponses en attente (pending)
  const pendingResponses = allResponses.filter(r => r.response === 'pending')

  if (pendingResponses.length === 0) return []

  // Extraire prénom (priorité) ou premier mot du nom, dédupliquer par user_id
  const seenUserIds = new Set<string>()
  const names: string[] = []

  for (const response of pendingResponses) {
    if (seenUserIds.has(response.user_id)) continue
    seenUserIds.add(response.user_id)

    const firstName = response.user?.first_name
    const fullName = response.user?.name

    // Priorité: prénom > premier mot du nom complet > fallback
    const displayName = firstName
      || (fullName ? fullName.split(' ')[0] : null)
      || 'Participant'

    names.push(displayName)
  }

  return names
}

/**
 * Génère un message dynamique pour le statut "planification" basé sur les réponses réelles
 * aux créneaux horaires proposés.
 *
 * @param status - Le statut de l'intervention
 * @param timeSlots - Les créneaux avec leurs réponses (time_slot_responses)
 * @param userContext - Le contexte utilisateur pour adapter le message
 * @returns Le message d'action approprié
 *
 * @example
 * // Aucune réponse → "En attente des disponibilités du locataire et prestataire"
 * // Locataire a accepté → "En attente des disponibilités du prestataire"
 * // Les deux ont accepté → "Créneaux validés, en attente de confirmation finale"
 */
export const getPendingParticipantsMessage = (
  status: string,
  timeSlots?: TimeSlotWithResponses[],
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
): string => {
  // Si pas en planification, utiliser le message par défaut
  if (status !== 'planification') {
    return getStatusActionMessage(status, userContext)
  }

  // Si pas de créneaux proposés, message générique
  if (!timeSlots || timeSlots.length === 0) {
    return "Planification en cours"
  }

  // Analyser les réponses de tous les créneaux
  const allResponses = timeSlots.flatMap(slot => slot.time_slot_responses || [])

  // Si aucune réponse enregistrée, les deux sont en attente
  if (allResponses.length === 0) {
    return "En attente des disponibilités du locataire et prestataire"
  }

  // Identifier qui a accepté au moins un créneau
  const locataireAccepted = allResponses.some(
    r => r.user_role === 'locataire' && r.response === 'accepted'
  )
  const prestataireAccepted = allResponses.some(
    r => r.user_role === 'prestataire' && r.response === 'accepted'
  )

  // Générer le message dynamique
  if (!locataireAccepted && !prestataireAccepted) {
    return "En attente des disponibilités du locataire et prestataire"
  } else if (!locataireAccepted) {
    return "En attente des disponibilités du locataire"
  } else if (!prestataireAccepted) {
    return "En attente des disponibilités du prestataire"
  } else {
    return "Créneaux validés, en attente de confirmation finale"
  }
}

export const getInterventionLocationText = (intervention: InterventionAction): string => {
  const buildingName = intervention.lot?.building?.name || intervention.building?.name
  const lotReference = intervention.lot?.reference

  if (lotReference && buildingName) {
    // Both lot and building: "Building › Lot REF"
    return `${buildingName} › Lot ${lotReference}`
  } else if (lotReference) {
    return `Lot ${lotReference}`
  } else if (buildingName) {
    return buildingName
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
    // Note: demande_de_devis removed - quote status shown via QuoteStatusBadge
    case "planification":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "planifiee":
      return "bg-purple-100 text-purple-800 border-purple-200"

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
    // Note: demande_de_devis removed - quote status shown via QuoteStatusBadge
    case "planification":
      return "Planification"
    case "planifiee":
      return "Planifiée"

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
    // Note: demande_de_devis removed - quote status shown via QuoteStatusBadge
    case "planification":
      return "Calendar" // Calendrier pour planification
    case "planifiee":
      return "CalendarCheck" // Calendrier validé pour intervention planifiée

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

export const getTypeLabel = (_type: string) => {
  const labels: Record<string, string> = {
    plomberie: 'Plomberie',
    electricite: 'Électricité',
    chauffage: 'Chauffage',
    serrurerie: 'Serrurerie',
    peinture: 'Peinture',
    maintenance: 'Maintenance',
    autre: 'Autre'
  }
  return labels[_type?.toLowerCase()] || 'Autre'
}

export const getTypeBadgeColor = (_type: string) => {
  const colors: Record<string, string> = {
    plomberie: 'bg-blue-100 text-blue-800 border-blue-200',
    electricite: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    chauffage: 'bg-red-100 text-red-800 border-red-200',
    serrurerie: 'bg-gray-100 text-gray-800 border-gray-200',
    peinture: 'bg-purple-100 text-purple-800 border-purple-200',
    maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
    autre: 'bg-slate-100 text-slate-800 border-slate-200'
  }
  return colors[_type?.toLowerCase()] || 'bg-slate-100 text-slate-800 border-slate-200'
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
      // Note: demande_de_devis removed - quote status shown via QuoteStatusBadge
      case "planification":
        return "Vous devez planifier l'intervention"
      case "planifiee":
        return "Intervention planifiée - Vous pouvez commencer"

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
      // Note: demande_de_devis removed - quote status shown via QuoteStatusBadge
      case "planification":
        return "Planification en cours avec le prestataire"
      case "planifiee":
        return "Intervention programmée"

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
    // Note: demande_de_devis removed - quote status shown via QuoteStatusBadge
    case "planification":
      return "En attente des disponibilités du locataire et prestataire"
    case "planifiee":
      return "Intervention planifiée"

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
