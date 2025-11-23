/**
 * Activity Name Generator
 * Génère des entity_name structurés pour les activity_logs
 * Format: {entity_type}-{action_type}-{timestamp}
 */

// Traductions françaises des types d'entités
export const ENTITY_TYPE_FR: Record<string, string> = {
  'user': 'Utilisateur',
  'team': 'Équipe',
  'building': 'Immeuble',
  'lot': 'Lot',
  'intervention': 'Intervention',
  'document': 'Document',
  'contact': 'Contact',
  'notification': 'Notification',
  'message': 'Message',
  'quote': 'Devis',
  'report': 'Rapport'
}

// Traductions françaises des types d'actions
export const ACTION_TYPE_FR: Record<string, string> = {
  'create': 'Création',
  'update': 'Modification',
  'delete': 'Suppression',
  'view': 'Consultation',
  'assign': 'Attribution',
  'unassign': 'Retrait d\'attribution',
  'approve': 'Approbation',
  'reject': 'Rejet',
  'upload': 'Téléversement',
  'download': 'Téléchargement',
  'share': 'Partage',
  'comment': 'Commentaire',
  'status_change': 'Changement de statut',
  'send_notification': 'Envoi de notification',
  'login': 'Connexion',
  'logout': 'Déconnexion',
  'complete': 'Finalisation',
  'cancel': 'Annulation'
}

/**
 * Formate un timestamp au format YYMMDDHHMMSS
 * @returns string - timestamp formaté (ex: "251123145830" pour 23/11/2025 14:58:30)
 */
function formatTimestamp(): string {
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

/**
 * Génère un entity_name structuré pour les activity_logs
 * Format: {entity_type}-{action_type}-{timestamp}
 * 
 * @param entityType - Type d'entité (ex: "intervention", "building", "user")
 * @param actionType - Type d'action (ex: "create", "update", "delete")
 * @returns string - entity_name formaté (ex: "intervention-create-251123145830")
 * 
 * @example
 * generateActivityEntityName("intervention", "create")
 * // Returns: "intervention-create-251123145830"
 */
export function generateActivityEntityName(
  entityType: string,
  actionType: string
): string {
  const timestamp = formatTimestamp()
  return `${entityType}-${actionType}-${timestamp}`
}

/**
 * Obtient le label français pour une activité
 * Utilisé pour l'affichage dans l'interface utilisateur
 * 
 * @param entityType - Type d'entité en anglais
 * @param actionType - Type d'action en anglais
 * @returns string - Label français (ex: "Intervention - Création")
 * 
 * @example
 * getActivityLabel("intervention", "create")
 * // Returns: "Intervention - Création"
 */
export function getActivityLabel(entityType: string, actionType: string): string {
  const entityFr = ENTITY_TYPE_FR[entityType] || entityType
  const actionFr = ACTION_TYPE_FR[actionType] || actionType
  return `${entityFr} - ${actionFr}`
}

