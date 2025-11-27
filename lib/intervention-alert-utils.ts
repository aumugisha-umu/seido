/**
 * Utilitaires pour déterminer l'état d'alerte des interventions
 * Utilisé pour afficher le badge orange quand une action est requise de l'utilisateur
 */

interface InterventionQuote {
  id: string
  status: string
  provider_id?: string
  created_by?: string
  amount?: number
}

interface InterventionTimeSlot {
  id: string
  slot_date: string
  start_time: string
  status?: string
  proposed_by?: string
}

interface InterventionWithDetails {
  id: string
  status: string
  scheduled_date?: string | null
  quotes?: InterventionQuote[]
  timeSlots?: InterventionTimeSlot[]
  [key: string]: unknown
}

/**
 * Détermine si le badge d'action doit être affiché en mode alerte (orange)
 * selon le statut de l'intervention, le rôle de l'utilisateur et les données liées
 * 
 * @param intervention - Intervention avec quotes et timeSlots enrichis
 * @param userRole - Rôle de l'utilisateur ('gestionnaire' | 'locataire' | 'prestataire')
 * @param userId - ID de l'utilisateur (optionnel, requis pour certaines vérifications prestataire)
 * @returns true si le badge doit être en mode alerte (orange)
 */
export const shouldShowAlertBadge = (
  intervention: InterventionWithDetails,
  userRole: 'gestionnaire' | 'locataire' | 'prestataire',
  userId?: string
): boolean => {
  const { status, quotes = [], timeSlots = [], scheduled_date } = intervention

  switch (userRole) {
    case 'gestionnaire':
      // Demande - nécessite approbation/rejet
      if (status === 'demande') return true
      
      // Approuvée - nécessite planification ou demande de devis
      if (status === 'approuvee') return true
      
      // Demande de devis - alerte si des quotes sont en attente ("sent" ou "pending")
      if (status === 'demande_de_devis') {
        return quotes.some(q => q.status === 'sent' || q.status === 'pending')
      }
      
      // Cloturée par prestataire - nécessite validation gestionnaire ou demande de validation locataire
      if (status === 'cloturee_par_prestataire') return true
      
      // Cloturée par locataire - nécessite finalisation gestionnaire
      if (status === 'cloturee_par_locataire') return true
      
      return false

    case 'locataire':
      // Planification - alerte si au moins 1 slot proposé pour confirmer
      if (status === 'planification') {
        return timeSlots.length > 0
      }
      
      // Cloturée par prestataire - nécessite validation locataire
      if (status === 'cloturee_par_prestataire') return true
      
      return false

    case 'prestataire':
      // Demande de devis - alerte si quote liée à ce prestataire en attente
      if (status === 'demande_de_devis' && userId) {
        return quotes.some(q => 
          (q.provider_id === userId || q.created_by === userId) && 
          (q.status === 'pending' || q.status === 'draft')
        )
      }
      
      // Planification - nécessite proposition de créneaux
      if (status === 'planification') return true
      
      // Planifiée - alerte si dans moins de 24h
      if (status === 'planifiee' && scheduled_date) {
        const scheduledTime = new Date(scheduled_date).getTime()
        const now = Date.now()
        const twentyFourHours = 24 * 60 * 60 * 1000
        return (scheduledTime - now) <= twentyFourHours && scheduledTime > now
      }
      
      // En cours - intervention active à terminer
      if (status === 'en_cours') return true
      
      return false

    default:
      return false
  }
}

/**
 * Version simplifiée: détermine si au moins une action nécessite une alerte
 * basée uniquement sur le statut (sans enrichissement quotes/timeSlots)
 * 
 * @param actions - Liste des actions en attente
 * @param userRole - Rôle de l'utilisateur
 * @returns true si au moins une action nécessite une alerte
 */
export const hasAnyAlertAction = (
  actions: Array<{ status: string }>,
  userRole: 'gestionnaire' | 'locataire' | 'prestataire'
): boolean => {
  return actions.some(action => {
    const { status } = action
    
    switch (userRole) {
      case 'gestionnaire':
        // Statuts nécessitant une action urgente du gestionnaire
        return [
          'demande',                      // À valider/rejeter
          'approuvee',                    // À planifier ou demander devis
          'demande_de_devis',             // Examiner les devis
          'cloturee_par_prestataire',     // Valider ou demander validation locataire
          'cloturee_par_locataire'        // Finaliser
        ].includes(status)
      
      case 'locataire':
        // Statuts nécessitant une action du locataire
        return [
          'planification',                // Confirmer disponibilités
          'cloturee_par_prestataire'      // Valider les travaux
        ].includes(status)
      
      case 'prestataire':
        // Statuts nécessitant une action du prestataire
        return [
          'demande_de_devis',             // Soumettre un devis
          'devis-a-fournir',              // Variante frontend de demande_de_devis
          'planification',                // Proposer créneaux
          'planifiee',                    // Préparer intervention
          'en_cours'                      // Terminer travaux
        ].includes(status)
      
      default:
        return false
    }
  })
}

/**
 * Filtre les interventions qui nécessitent une action de l'utilisateur
 * Utilise la même logique que hasAnyAlertAction pour garantir la cohérence
 * 
 * @param interventions - Liste complète des interventions
 * @param userRole - Rôle de l'utilisateur
 * @returns Liste filtrée des interventions nécessitant une action
 */
export const filterPendingActions = <T extends { status: string }>(
  interventions: T[],
  userRole: 'gestionnaire' | 'locataire' | 'prestataire'
): T[] => {
  return interventions.filter(intervention => {
    const { status } = intervention
    
    // Utiliser la même logique que hasAnyAlertAction
    switch (userRole) {
      case 'gestionnaire':
        return [
          'demande',
          'approuvee',
          'demande_de_devis',
          'cloturee_par_prestataire',
          'cloturee_par_locataire'
        ].includes(status)
      
      case 'locataire':
        return [
          'planification',
          'cloturee_par_prestataire'
        ].includes(status)
      
      case 'prestataire':
        return [
          'demande_de_devis',
          'devis-a-fournir',
          'planification',
          'planifiee',
          'en_cours'
        ].includes(status)
      
      default:
        return false
    }
  })
}

/**
 * Vérifie si un utilisateur est le locataire assigné à une intervention
 * Remplace la vérification obsolète de intervention.tenant_id
 * 
 * @param intervention - Intervention avec assignments
 * @param userId - ID de l'utilisateur
 * @returns true si l'utilisateur est le locataire assigné
 */
export const isInterventionTenant = (
  intervention: { assignments?: Array<{ role: string; user_id: string }> },
  userId: string
): boolean => {
  if (!intervention.assignments || !userId) return false
  return intervention.assignments.some(
    a => a.role === 'locataire' && a.user_id === userId
  )
}

