/**
 * Notification Business Logic Helpers
 *
 * Pure functions pour déterminer les destinataires de notifications.
 * Partagées entre NotificationService (DB) et EmailNotificationService (Email).
 *
 * Architecture:
 * - Ces helpers sont PURS (pas d'effets de bord, pas d'appels DB)
 * - Input: Données enrichies (intervention + managers, building + managers, etc.)
 * - Output: Liste de recipients avec métadonnées (userId, isPersonal)
 *
 * @module notification-helpers
 */

/**
 * Recipient pour une notification
 */
export interface NotificationRecipient {
  userId: string
  isPersonal: boolean // true = notification personnelle, false = notification d'équipe
}

/**
 * Intervention enrichie avec managers
 */
export interface InterventionWithManagers {
  id: string
  title: string
  reference: string
  lot_id: string | null
  team_id: string
  created_by: string
  assigned_to: string | null
  manager_id: string | null
  interventionAssignedManagers: string[] // IDs des gestionnaires assignés à CETTE intervention (via intervention_assignments)
  interventionAssignedProviders: string[] // IDs des prestataires assignés à CETTE intervention (via intervention_assignments)
  interventionAssignedTenants: string[] // IDs des locataires assignés à CETTE intervention (via intervention_assignments)
  buildingManagers: string[] // IDs des gestionnaires du bâtiment (contexte, ne PAS utiliser pour is_personal)
  lotManagers: string[] // IDs des gestionnaires du lot (contexte, ne PAS utiliser pour is_personal)
  teamMembers: Array<{ id: string; role: string; name: string }>
  lot?: {
    reference: string
    building?: {
      name: string
    }
  }
}

/**
 * Bâtiment enrichi avec managers
 */
export interface BuildingWithManagers {
  id: string
  name: string
  address: string
  team_id: string
  buildingManagers: string[] // IDs des gestionnaires principaux
  teamMembers: Array<{ id: string; role: string; name: string }>
}

/**
 * Lot enrichi avec managers
 */
export interface LotWithManagers {
  id: string
  reference: string
  building_id: string
  team_id: string
  lotManagers: string[] // IDs des gestionnaires du lot
  buildingManagers: string[] // IDs des gestionnaires du bâtiment parent
  teamMembers: Array<{ id: string; role: string; name: string }>
  building?: {
    name: string
  }
}

/**
 * Contact enrichi avec managers
 */
export interface ContactWithManagers {
  id: string
  first_name: string
  last_name: string
  type: string
  team_id: string
  relatedBuildingManagers: string[] // Gestionnaires des bâtiments liés
  teamMembers: Array<{ id: string; role: string; name: string }>
}

// ══════════════════════════════════════════════════════════════
// INTERVENTION RECIPIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Détermine les destinataires pour une notification d'intervention
 *
 * Logique métier:
 * 1. Utilisateurs assignés directement (gestionnaires, prestataires, locataires) → Notification PERSONNELLE
 * 2. Gestionnaires d'équipe non assignés → Notification D'ÉQUIPE
 *
 * @param intervention - Intervention enrichie avec managers et assignations
 * @param excludeUserId - ID de l'utilisateur à exclure (généralement le créateur)
 * @returns Liste de recipients avec flag isPersonal
 *
 * @example
 * ```typescript
 * const recipients = determineInterventionRecipients(intervention, creatorId)
 * // [
 * //   { userId: 'manager-1', isPersonal: true },   // Assigné directement
 * //   { userId: 'manager-2', isPersonal: false },  // Gestionnaire d'équipe
 * //   { userId: 'provider-1', isPersonal: true }   // Prestataire assigné
 * // ]
 * ```
 */
export function determineInterventionRecipients(
  intervention: InterventionWithManagers,
  excludeUserId: string
): NotificationRecipient[] {
  const recipients: NotificationRecipient[] = []
  const processedUserIds = new Set<string>()

  // 1. Ajouter tous les utilisateurs directement assignés à l'intervention (gestionnaires, prestataires, locataires)
  const directlyAssignedIds = [
    ...intervention.interventionAssignedManagers,
    ...intervention.interventionAssignedProviders,
    ...intervention.interventionAssignedTenants
  ]

  directlyAssignedIds.forEach(userId => {
    if (userId !== excludeUserId && !processedUserIds.has(userId)) {
      recipients.push({
        userId,
        isPersonal: true // Assigné directement = notification personnelle
      })
      processedUserIds.add(userId)
    }
  })

  // 2. Ajouter les gestionnaires de l'équipe non encore inclus (notification d'équipe)
  intervention.teamMembers
    .filter(member =>
      member.role === 'gestionnaire' &&
      member.id !== excludeUserId &&
      !processedUserIds.has(member.id)
    )
    .forEach(manager => {
      recipients.push({
        userId: manager.id,
        isPersonal: false // Gestionnaire d'équipe = notification d'équipe
      })
      processedUserIds.add(manager.id)
    })

  return recipients
}

/**
 * Détermine les destinataires pour un changement de statut d'intervention
 *
 * Utilise la même logique que determineInterventionRecipients()
 * car les mêmes personnes doivent être notifiées.
 *
 * @param intervention - Intervention enrichie avec managers et assignations
 * @param excludeUserId - ID de l'utilisateur à exclure
 * @returns Liste de recipients avec flag isPersonal
 */
export function determineInterventionStatusChangeRecipients(
  intervention: InterventionWithManagers,
  excludeUserId: string
): NotificationRecipient[] {
  // Pour un changement de statut, les destinataires sont les mêmes que pour la création
  return determineInterventionRecipients(intervention, excludeUserId)
}

// ══════════════════════════════════════════════════════════════
// BUILDING RECIPIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Détermine les destinataires pour une notification de bâtiment
 *
 * Logique métier:
 * - Tous les gestionnaires d'équipe (sauf excludeUserId)
 * - Ceux assignés au bâtiment reçoivent notification PERSONNELLE
 * - Les autres gestionnaires reçoivent notification D'ÉQUIPE
 *
 * @param building - Bâtiment enrichi avec managers
 * @param excludeUserId - ID de l'utilisateur à exclure
 * @returns Liste de recipients avec flag isPersonal
 */
export function determineBuildingRecipients(
  building: BuildingWithManagers,
  excludeUserId: string
): NotificationRecipient[] {
  const directResponsibles = new Set(
    building.buildingManagers.filter(id => id !== excludeUserId)
  )

  const allManagers = building.teamMembers
    .filter(member => member.role === 'gestionnaire' && member.id !== excludeUserId)

  return allManagers.map(manager => ({
    userId: manager.id,
    isPersonal: directResponsibles.has(manager.id)
  }))
}

// ══════════════════════════════════════════════════════════════
// LOT RECIPIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Détermine les destinataires pour une notification de lot
 *
 * Logique métier:
 * - Tous les gestionnaires d'équipe (sauf excludeUserId)
 * - Ceux assignés au lot OU au bâtiment parent reçoivent notification PERSONNELLE
 * - Les autres gestionnaires reçoivent notification D'ÉQUIPE
 *
 * @param lot - Lot enrichi avec managers
 * @param excludeUserId - ID de l'utilisateur à exclure
 * @returns Liste de recipients avec flag isPersonal
 */
export function determineLotRecipients(
  lot: LotWithManagers,
  excludeUserId: string
): NotificationRecipient[] {
  const directResponsibles = new Set<string>()

  lot.lotManagers.forEach(id => {
    if (id !== excludeUserId) directResponsibles.add(id)
  })

  lot.buildingManagers.forEach(id => {
    if (id !== excludeUserId) directResponsibles.add(id)
  })

  const allManagers = lot.teamMembers
    .filter(member => member.role === 'gestionnaire' && member.id !== excludeUserId)

  return allManagers.map(manager => ({
    userId: manager.id,
    isPersonal: directResponsibles.has(manager.id)
  }))
}

// ══════════════════════════════════════════════════════════════
// CONTACT RECIPIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Détermine les destinataires pour une notification de contact
 *
 * Logique métier:
 * - Tous les gestionnaires d'équipe (sauf excludeUserId)
 * - Ceux assignés aux bâtiments liés au contact reçoivent notification PERSONNELLE
 * - Les autres gestionnaires reçoivent notification D'ÉQUIPE
 *
 * @param contact - Contact enrichi avec managers
 * @param excludeUserId - ID de l'utilisateur à exclure
 * @returns Liste de recipients avec flag isPersonal
 */
export function determineContactRecipients(
  contact: ContactWithManagers,
  excludeUserId: string
): NotificationRecipient[] {
  const directResponsibles = new Set(
    contact.relatedBuildingManagers.filter(id => id !== excludeUserId)
  )

  const allManagers = contact.teamMembers
    .filter(member => member.role === 'gestionnaire' && member.id !== excludeUserId)

  return allManagers.map(manager => ({
    userId: manager.id,
    isPersonal: directResponsibles.has(manager.id)
  }))
}

// ══════════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Formate le message pour une notification d'intervention
 *
 * @param intervention - Intervention enrichie
 * @param isPersonal - true = notification personnelle, false = notification d'équipe
 * @param action - Type d'action ('created' | 'status_change')
 * @returns Message formaté
 */
export function formatInterventionMessage(
  intervention: InterventionWithManagers,
  isPersonal: boolean,
  action: 'created' | 'status_change'
): string {
  const lotRef = intervention.lot?.reference ? ` pour ${intervention.lot.reference}` : ''

  if (action === 'created') {
    return isPersonal
      ? `Une nouvelle intervention "${intervention.title}"${lotRef} vous concerne directement`
      : `Une nouvelle intervention "${intervention.title}"${lotRef} a été créée`
  }

  return `L'intervention "${intervention.title}"${lotRef} a été mise à jour`
}

/**
 * Tronque un texte à une longueur maximale
 *
 * @param text - Texte à tronquer
 * @param maxLength - Longueur maximale
 * @returns Texte tronqué avec '...' si nécessaire
 */
export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
